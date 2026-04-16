import { BOOKS, getConfiguredAffiliateCount, getConfiguredMonetizationCount } from "../books.js";
import { getLaunchCommandCenter, resolveLaunchValidation } from "../launchState.js";
import { buildTrackInsights } from "../track/insights.js";
import { buildWorkflowInbox } from "../workflows/inbox.js";

function buildPriorityFeed({ commandCenter, inbox, insights }) {
  const rows = [];

  if (Array.isArray(insights?.topDriftAlerts) && insights.topDriftAlerts.length) {
    rows.push({
      type: "drift_alert",
      priority: "high",
      title: `Review ${insights.topDriftAlerts[0].label}`,
      detail: insights.topDriftAlerts[0].summary,
    });
  }

  if (Array.isArray(inbox?.top) && inbox.top.length) {
    const workflow = inbox.top[0];
    rows.push({
      type: "workflow",
      priority: workflow.status === "ready" ? "high" : "medium",
      title: workflow.title || "Top workflow",
      detail: workflow.scoreSummary || `${workflow.status} workflow scored ${workflow.score}.`,
    });
  }

  for (const blocker of commandCenter?.nextActions || []) {
    rows.push({
      type: "launch_blocker",
      priority: "high",
      title: blocker.label,
      detail: blocker.detail,
    });
  }

  return rows.slice(0, 6);
}

function buildAnomalyFeed({ insights, launch }) {
  const rows = [];

  for (const alert of insights?.topDriftAlerts || []) {
    rows.push({
      type: "drift",
      severity: alert.severity,
      area: alert.scope,
      label: alert.label,
      detail: alert.summary,
    });
  }

  if (launch?.unresolvedBlockers > 0) {
    rows.push({
      type: "launch_blockers",
      severity: launch.unresolvedBlockers >= 4 ? "high" : "medium",
      area: "launch",
      label: "Manual launch blockers remain",
      detail: `${launch.unresolvedBlockers} manual blockers are still gating launch proof.`,
    });
  }

  return rows.slice(0, 6);
}

function buildOperatorCommandBrief(input = {}) {
  const {
    topWorkflow = null,
    driftAlerts = [],
    nextActions = [],
    openWorkflowCount = 0,
    waitingWorkflowCount = 0,
    readinessScore = null,
    posture = null,
  } = input;

  const primaryAlert = Array.isArray(driftAlerts) ? driftAlerts[0] || null : null;
  const primaryBlocker = Array.isArray(nextActions) ? nextActions[0] || null : null;
  const workflowAction = topWorkflow
    ? {
        type: "workflow",
        title: topWorkflow.title || "Advance top workflow",
        detail:
          topWorkflow.scoreSummary ||
          topWorkflow.nextStep ||
          topWorkflow.summary ||
          `${String(topWorkflow.status || "queued").replace(/_/g, " ")} workflow needs attention.`,
        status: topWorkflow.status || "queued",
        score: Number.isFinite(topWorkflow.score) ? topWorkflow.score : null,
      }
    : null;

  let headline = "Keep the loop moving.";
  let body = "PromoGrind has machine state, but not enough signal yet to recommend a single operator move.";
  let focus = workflowAction || null;
  let reason = null;
  let tone = "neutral";

  if (primaryAlert?.direction === "negative") {
    headline = `Drift check: ${primaryAlert.label}`;
    body = primaryAlert.summary;
    focus = {
      type: "drift_alert",
      title: primaryAlert.label,
      detail: primaryAlert.summary,
      status: primaryAlert.severity,
      score: Math.round(Math.abs(primaryAlert.averageDrift || 0)),
    };
    reason = "cold_lane";
    tone = "watch";
  } else if (workflowAction) {
    headline = workflowAction.title;
    body = workflowAction.detail;
    focus = workflowAction;
    reason = "top_workflow";
    tone = workflowAction.status === "ready" ? "positive" : "watch";
  } else if (primaryBlocker) {
    headline = primaryBlocker.label || primaryBlocker.title || "Resolve the next launch blocker";
    body = primaryBlocker.detail || "One manual blocker is still gating the next proof point.";
    focus = {
      type: "launch_blocker",
      title: headline,
      detail: body,
      status: primaryBlocker.status || "manual",
      score: null,
    };
    reason = "launch_blocker";
    tone = "watch";
  }

  return {
    headline,
    body,
    tone,
    reason,
    focus,
    followUps: [
      openWorkflowCount > 1 ? `${openWorkflowCount} workflows are still open.` : null,
      waitingWorkflowCount > 0 ? `${waitingWorkflowCount} workflows are waiting for settlement.` : null,
      Number.isFinite(readinessScore) ? `Launch posture is ${posture || "unknown"} at ${readinessScore}/100.` : null,
    ].filter(Boolean),
  };
}

function buildSummaryDelta(previous, next) {
  if (!previous) {
    return {
      changeType: "initial",
      summary: "First published Studio contract snapshot.",
    };
  }

  const deltas = [];
  const readinessDelta = (next.summary?.readinessScore ?? 0) - (previous.summary?.readinessScore ?? 0);
  if (readinessDelta !== 0) {
    deltas.push(`readiness ${readinessDelta > 0 ? "up" : "down"} ${Math.abs(readinessDelta)}`);
  }

  const workflowDelta = (next.summary?.workflowCount ?? 0) - (previous.summary?.workflowCount ?? 0);
  if (workflowDelta !== 0) {
    deltas.push(`workflow count ${workflowDelta > 0 ? "+" : ""}${workflowDelta}`);
  }

  const driftDelta = (next.summary?.driftAlertCount ?? 0) - (previous.summary?.driftAlertCount ?? 0);
  if (driftDelta !== 0) {
    deltas.push(`drift alerts ${driftDelta > 0 ? "+" : ""}${driftDelta}`);
  }

  const anomalyDelta = (next.summary?.anomalyCount ?? 0) - (previous.summary?.anomalyCount ?? 0);
  if (anomalyDelta !== 0) {
    deltas.push(`anomalies ${anomalyDelta > 0 ? "+" : ""}${anomalyDelta}`);
  }

  const previousHeadline = previous.brief?.headline || "";
  const nextHeadline = next.brief?.headline || "";
  if (previousHeadline && nextHeadline && previousHeadline !== nextHeadline) {
    deltas.push(`brief focus changed to "${nextHeadline}"`);
  }

  return {
    changeType: deltas.length ? "delta" : "unchanged",
    summary: deltas.length ? deltas.join(" · ") : "No material contract delta since the last published snapshot.",
  };
}

export function appendStudioContractHistory(history = [], snapshot, options = {}) {
  const rows = Array.isArray(history) ? [...history] : [];
  const previous = rows[0]?.snapshot || null;
  const publishedAt = options.publishedAt || new Date().toISOString();
  const nextEntry = {
    id: options.id || `studio-contract:${publishedAt}`,
    publishedAt,
    summary: {
      readinessScore: snapshot?.summary?.readinessScore ?? null,
      posture: snapshot?.summary?.posture ?? null,
      workflowCount: snapshot?.summary?.workflowCount ?? 0,
      driftAlertCount: snapshot?.summary?.driftAlertCount ?? 0,
      anomalyCount: snapshot?.summary?.anomalyCount ?? 0,
    },
    delta: buildSummaryDelta(previous, snapshot),
    brief: snapshot?.brief || null,
    snapshot,
  };

  return [nextEntry, ...rows].slice(0, 30);
}

export function buildStudioSnapshot(appData = {}, options = {}) {
  const validation = resolveLaunchValidation();
  const configuredAffiliateCount = getConfiguredAffiliateCount();
  const configuredMonetizationCount = getConfiguredMonetizationCount();
  const commandCenter = getLaunchCommandCenter({
    configuredAffiliateCount,
    configuredMonetizationCount,
    totalBooks: BOOKS.length,
    validation,
  });
  const insights = buildTrackInsights(appData, options.now || new Date());
  const inbox = buildWorkflowInbox(appData, {
    now: options.now || new Date(),
    bankroll: options.bankroll ?? appData.bankroll ?? "",
  });
  const launch = {
    readinessScore: commandCenter.readinessScore,
    posture: commandCenter.posture,
    unresolvedBlockers: commandCenter.unresolvedBlockerCount,
    monetizedBooks: configuredMonetizationCount,
    affiliateBooks: configuredAffiliateCount,
    totalBooks: BOOKS.length,
    validation,
  };
  const growth = {
    totalProfit: insights.totalProfit,
    monthProfit: insights.monthProfit,
    recent7Profit: insights.recent7Profit,
    settledCount: insights.settledCount,
    hitRate: insights.hitRate,
    accuracyRate: insights.accuracyRate,
    executionRate: insights.executionRate,
  };
  const workflows = {
    openCount: inbox.open.length,
    queuedCount: inbox.queuedCount,
    waitingCount: inbox.waitingCount,
    top: inbox.top.map((workflow) => ({
      id: workflow.id,
      title: workflow.title,
      status: workflow.status,
      score: workflow.score,
      scoreSummary: workflow.scoreSummary || "",
      promoType: workflow.promoType,
      calculatorSlug: workflow.calculatorSlug,
      expectedProfit: workflow.expectedProfit,
      book: workflow.book,
      source: workflow.source,
    })),
  };
  const intelligence = {
    topSkipReasons: insights.skipReasonRows.slice(0, 3),
    topFrictionReasons: insights.frictionReasonRows.slice(0, 3),
    strongestLane: insights.biggestPositiveDrift?.label || null,
    coldestLane: insights.biggestNegativeDrift?.label || null,
    driftAlerts: insights.topDriftAlerts || [],
  };
  const feeds = {
    priorities: buildPriorityFeed({ commandCenter, inbox, insights }),
    anomalies: buildAnomalyFeed({ insights, launch }),
  };
  const brief = buildOperatorCommandBrief({
    topWorkflow: workflows.top[0] || null,
    driftAlerts: intelligence.driftAlerts,
    nextActions: commandCenter?.nextActions || [],
    openWorkflowCount: workflows.openCount,
    waitingWorkflowCount: workflows.waitingCount,
    readinessScore: launch.readinessScore,
    posture: launch.posture,
  });

  return {
    schemaVersion: "2.1",
    project: "promogrind",
    generatedAt: new Date().toISOString(),
    summary: {
      readinessScore: launch.readinessScore,
      posture: launch.posture,
      workflowCount: workflows.openCount,
      driftAlertCount: intelligence.driftAlerts.length,
      anomalyCount: feeds.anomalies.length,
    },
    launch,
    growth,
    workflows,
    intelligence,
    feeds,
    brief,
    contract: {
      producer: "promogrind",
      surfaces: ["studio-os", "studio-ops", "studio-hub", "social-dashboard"],
      generatedFrom: "buildStudioSnapshot",
      publishTarget: "studioContractHistory",
    },
  };
}
