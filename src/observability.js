import { BOOKS, getConfiguredMonetizationCount, getRequiredLaunchMonetizationStatus } from "./books.js";
import { buildHotLanes } from "./track/insights.js";

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const AI_FEATURES = new Set(["promo_advisor", "promo_chat", "ai_action_plan", "stack_builder"]);

function normalizeEventTime(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function buildAiUsageSnapshot(events = [], now = new Date()) {
  const nowMs = normalizeEventTime(now);
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayStartMs = dayStart.getTime();
  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
  const aiEvents = (Array.isArray(events) ? events : []).filter((entry) => AI_FEATURES.has(String(entry.event_type || "")));
  const todayEvents = aiEvents.filter((entry) => normalizeEventTime(entry.created_at) >= dayStartMs);
  const weekEvents = aiEvents.filter((entry) => normalizeEventTime(entry.created_at) >= sevenDaysAgo);
  const byFeature = {};
  for (const entry of weekEvents) {
    const feature = String(entry.event_type || "unknown");
    byFeature[feature] = (byFeature[feature] || 0) + 1;
  }
  const topFeatureEntry = Object.entries(byFeature).sort((a, b) => b[1] - a[1])[0] || null;
  const recentBurst = aiEvents.filter((entry) => normalizeEventTime(entry.created_at) >= nowMs - 10 * 60 * 1000).length;
  const remainingValues = todayEvents
    .map((entry) => toNumber(entry.metadata?.remaining))
    .filter((value) => value !== null);
  const lowestRemaining = remainingValues.length ? Math.min(...remainingValues) : null;
  const risk =
    recentBurst >= 8 || lowestRemaining === 0 ? "high"
      : recentBurst >= 4 || (lowestRemaining !== null && lowestRemaining <= 2) ? "watch"
      : "normal";

  return {
    today: todayEvents.length,
    week: weekEvents.length,
    recentBurst,
    byFeature,
    topFeature: topFeatureEntry ? topFeatureEntry[0] : null,
    topFeatureCount: topFeatureEntry ? topFeatureEntry[1] : 0,
    lowestRemaining,
    risk,
  };
}

export function buildObservabilitySnapshot({ appData = {}, dashboardSnapshot = {}, usageLog = {}, syncDiagnostics = {}, aiEvents = [], now = new Date() } = {}) {
  const workflows = Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [];
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const microNps = Array.isArray(appData.microNps) ? appData.microNps : [];
  const calculatorsUsed = Object.keys(usageLog || {});
  const totalCalculations = calculatorsUsed.reduce((sum, key) => sum + (Number(usageLog[key]) || 0), 0);
  const monetizedBooks = getConfiguredMonetizationCount();
  const launchMonetization = getRequiredLaunchMonetizationStatus();
  const settledFeedback = feedback.filter((entry) => String(entry.status || "").toLowerCase() === "settled");
  const waitingWorkflows = workflows.filter((entry) => ["waiting", "placed", "pending", "open"].includes(String(entry.status || "").toLowerCase()));
  const openWorkflows = workflows.filter((entry) => ["queued", "ready", "placed", "waiting", "pending", "open"].includes(String(entry.status || "").toLowerCase()));
  const latestMicroNps = microNps[0] || null;
  const hotLanes = buildHotLanes(appData, now);
  const booksDone = Object.values(appData.done || {}).filter(Boolean).length;
  const hasSavedWorkflow = workflows.length > 0;
  const hasFirstLedger = Array.isArray(appData.ledger) && appData.ledger.length > 0;
  const activationScore =
    (calculatorsUsed.length ? 30 : 0) +
    (booksDone ? 20 : 0) +
    (hasSavedWorkflow ? 20 : 0) +
    (hasFirstLedger ? 30 : 0);
  const launchProofs = appData.launchProofs || {};
  const launchProofSummary = {
    affiliateLinksReady: launchMonetization.missingBooks.length === 0,
    missingLaunchBooks: launchMonetization.missingBooks,
    stripeSmokeReady: launchProofs.stripeSmoke === "complete",
    friendBetaReady: launchProofs.friendBeta === "complete",
  };
  const activationFunnel = {
    firstCalculation: calculatorsUsed.length > 0,
    firstBookMarked: booksDone > 0,
    firstWorkflowQueued: hasSavedWorkflow,
    firstLedgerEntry: hasFirstLedger,
    firstSettlement: settledFeedback.length > 0,
    completion: Math.round([
      calculatorsUsed.length > 0,
      booksDone > 0,
      hasSavedWorkflow,
      hasFirstLedger,
      settledFeedback.length > 0,
    ].filter(Boolean).length / 5 * 100),
  };

  return {
    calculatorsUsed: calculatorsUsed.length,
    totalCalculations,
    monetizedBooks,
    monetizationCoverage: BOOKS.length ? Math.round((monetizedBooks / BOOKS.length) * 100) : 0,
    launchMonetization,
    launchProofSummary,
    activationFunnel,
    openWorkflows: openWorkflows.length,
    waitingWorkflows: waitingWorkflows.length,
    settledFeedback: settledFeedback.length,
    recentSettledProfit: dashboardSnapshot.recentSettledProfit || 0,
    recentSettledCount: dashboardSnapshot.recentSettledCount || 0,
    activationScore,
    queueDepth: syncDiagnostics.queueDepth || 0,
    hasPendingWrites: Boolean(syncDiagnostics.hasPendingWrites),
    latestMicroNps: latestMicroNps?.value || null,
    latestMicroNpsSettledCount: toNumber(latestMicroNps?.settledCount) || 0,
    aiUsage: buildAiUsageSnapshot(aiEvents.length ? aiEvents : appData.vaultEvents, now),
    hotLanes,
  };
}
