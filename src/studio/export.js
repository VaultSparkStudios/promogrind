import { BOOKS, getConfiguredAffiliateCount, getConfiguredMonetizationCount, getRecommendedBooksForUser, hasConfiguredMonetizationLinks } from "../books.js";
import { getLaunchCommandCenter, resolveLaunchValidation } from "../launchState.js";
import { buildOperatingActionCandidates, selectOperatingDecision } from "../promograph/index.js";
import { buildPortfolioAllocation } from "../lib/portfolio.js";
import { buildHotLanes, buildTrackInsights } from "../track/insights.js";
import { buildWorkflowInbox } from "../workflows/inbox.js";
import { matchPlaybooks } from "../playbooks/index.js";

function buildPriorityFeed({ commandCenter, inbox, insights, actionCandidates = [], hotLanes = {}, microNps = null }) {
  const rows = [];

  if (Array.isArray(actionCandidates) && actionCandidates.length) {
    rows.push({
      type: "action",
      priority: (actionCandidates[0].score || 0) >= 90 ? "high" : "medium",
      title: actionCandidates[0].title,
      detail: actionCandidates[0].body,
    });
  }

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

  if (Array.isArray(hotLanes?.hotPromoTypes) && hotLanes.hotPromoTypes.length) {
    rows.push({
      type: "hot_lane",
      priority: "medium",
      title: `Lean into ${hotLanes.hotPromoTypes[0].label}`,
      detail: `${hotLanes.hotPromoTypes[0].badge} · +$${hotLanes.hotPromoTypes[0].profitSum.toFixed(2)} realized recently.`,
    });
  }

  if (microNps && microNps.value && microNps.value !== "yes") {
    rows.push({
      type: "micro_nps",
      priority: "high",
      title: "Review post-settlement trust friction",
      detail: `Latest micro-NPS came back "${microNps.value}" after ${microNps.settledCount || 0} settled workflows.`,
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

function buildAnomalyFeed({ insights, launch, microNps = null }) {
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

  if (microNps?.value === "no" || microNps?.value === "mixed") {
    rows.push({
      type: "micro_nps",
      severity: microNps.value === "no" ? "high" : "medium",
      area: "trust",
      label: "Post-settlement satisfaction is slipping",
      detail: `Latest micro-NPS is "${microNps.value}" after ${microNps.settledCount || 0} settled workflows.`,
    });
  }

  return rows.slice(0, 6);
}

function buildOperatorCommandBrief(input = {}) {
  const {
    actionCandidates = [],
    topWorkflow = null,
    topPlaybook = null,
    driftAlerts = [],
    nextActions = [],
    openWorkflowCount = 0,
    waitingWorkflowCount = 0,
    readinessScore = null,
    posture = null,
  } = input;

  const decision = selectOperatingDecision({
    actionCandidates,
    topWorkflow,
    openWorkflowCount,
    waitingWorkflowCount,
    readinessScore,
    posture,
  });

  const playbookFollowUp = topPlaybook?.applicable && topPlaybook.playbook
    ? `Try: ${topPlaybook.playbook.name} — ${topPlaybook.reasons?.map((r) => r.text).join(" · ") || `fit score ${topPlaybook.fitScore}`}`
    : null;

  return {
    headline: decision.title,
    body: decision.body,
    tone: decision.tone,
    reason: decision.reason,
    focus: decision.focus,
    followUps: playbookFollowUp
      ? [...(decision.followUps || []), playbookFollowUp]
      : (decision.followUps || []),
    topPlaybook: topPlaybook?.applicable && topPlaybook.playbook
      ? {
          id: topPlaybook.playbook.id,
          name: topPlaybook.playbook.name,
          fitScore: topPlaybook.fitScore,
          fitReasons: topPlaybook.reasons?.map((r) => r.text) || [],
          firstStepSlug: topPlaybook.playbook.steps[0]?.calculatorSlug || null,
          stepCount: topPlaybook.playbook.steps.length,
        }
      : null,
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

  const prevPlaybookId = previous.brief?.topPlaybook?.id ?? null;
  const nextPlaybookId = next.brief?.topPlaybook?.id ?? null;
  if (prevPlaybookId !== nextPlaybookId) {
    if (nextPlaybookId) {
      deltas.push(`playbook rotated to "${next.brief.topPlaybook.name}"`);
    } else if (prevPlaybookId) {
      deltas.push("top playbook cleared");
    }
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
      topPlaybookId: snapshot?.brief?.topPlaybook?.id ?? null,
      topPlaybookName: snapshot?.brief?.topPlaybook?.name ?? null,
    },
    delta: buildSummaryDelta(previous, snapshot),
    brief: snapshot?.brief || null,
    snapshot,
  };

  return [nextEntry, ...rows].slice(0, 30);
}

export function buildStudioSnapshot(appData = {}, options = {}) {
  const usageLog = options.usageLog || (() => {
    try {
      if (typeof localStorage === "undefined") return {};
      return JSON.parse(localStorage.getItem("pg_usage_log") || "{}");
    } catch {
      return {};
    }
  })();
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
  const hotLanes = buildHotLanes(appData, options.now || new Date());
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
  const bestBook = getRecommendedBooksForUser({
    userState: appData.userState,
    done: appData.done || {},
    bookStatus: appData.bookStatus || {},
  })[0] || null;
  const playbookMatch = matchPlaybooks(appData, { bankroll: options.bankroll ?? appData.bankroll ?? "" });
  const topPlaybook = playbookMatch.top[0] || null;
  const actionCandidates = buildOperatingActionCandidates({
    hasBankroll: !!String(options.bankroll ?? appData.bankroll ?? "").trim(),
    hasCalc: Object.keys(usageLog || {}).length > 0,
    affiliateReady: hasConfiguredMonetizationLinks(),
    totalProfit: growth.totalProfit,
    openBets: Array.isArray(appData.bets)
      ? appData.bets.filter((bet) => ["open", "pending", ""].includes(String(bet.status || "").toLowerCase()))
      : [],
    booksComplete: Object.values(appData.done || {}).filter(Boolean).length,
    openWorkflowCount: workflows.openCount,
    topWorkflow: workflows.top[0] || null,
    bestBook,
    topPlaybook,
  });
  const bankrollNum = parseFloat(options.bankroll ?? appData.bankroll ?? "") || 0;
  const portfolioAllocation = bankrollNum > 0 && inbox.open.length >= 2
    ? buildPortfolioAllocation(inbox.open, bankrollNum)
    : null;

  const intelligence = {
    topSkipReasons: insights.skipReasonRows.slice(0, 3),
    topFrictionReasons: insights.frictionReasonRows.slice(0, 3),
    strongestLane: insights.biggestPositiveDrift?.label || null,
    coldestLane: insights.biggestNegativeDrift?.label || null,
    driftAlerts: insights.topDriftAlerts || [],
    hotLanes,
    latestMicroNps: Array.isArray(appData?.microNps) ? appData.microNps[0] || null : null,
  };
  const feeds = {
    priorities: buildPriorityFeed({
      commandCenter,
      inbox,
      insights,
      actionCandidates,
      hotLanes,
      microNps: intelligence.latestMicroNps,
    }),
    anomalies: buildAnomalyFeed({ insights, launch, microNps: intelligence.latestMicroNps }),
  };
  const brief = buildOperatorCommandBrief({
    actionCandidates,
    topWorkflow: workflows.top[0] || null,
    topPlaybook,
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
    portfolioAllocation,
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
