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

  return {
    schemaVersion: "2.0",
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
    contract: {
      producer: "promogrind",
      surfaces: ["studio-os", "studio-ops", "studio-hub", "social-dashboard"],
      generatedFrom: "buildStudioSnapshot",
    },
  };
}
