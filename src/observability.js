import { BOOKS, getConfiguredMonetizationCount } from "./books.js";

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildObservabilitySnapshot({ appData = {}, dashboardSnapshot = {}, usageLog = {}, syncDiagnostics = {} } = {}) {
  const workflows = Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [];
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const microNps = Array.isArray(appData.microNps) ? appData.microNps : [];
  const calculatorsUsed = Object.keys(usageLog || {});
  const totalCalculations = calculatorsUsed.reduce((sum, key) => sum + (Number(usageLog[key]) || 0), 0);
  const monetizedBooks = getConfiguredMonetizationCount();
  const settledFeedback = feedback.filter((entry) => String(entry.status || "").toLowerCase() === "settled");
  const waitingWorkflows = workflows.filter((entry) => ["waiting", "placed", "pending", "open"].includes(String(entry.status || "").toLowerCase()));
  const openWorkflows = workflows.filter((entry) => ["queued", "ready", "placed", "waiting", "pending", "open"].includes(String(entry.status || "").toLowerCase()));
  const latestMicroNps = microNps[0] || null;
  const activationScore =
    (calculatorsUsed.length ? 30 : 0) +
    (Object.values(appData.done || {}).filter(Boolean).length ? 30 : 0) +
    (Array.isArray(appData.ledger) && appData.ledger.length ? 40 : 0);

  return {
    calculatorsUsed: calculatorsUsed.length,
    totalCalculations,
    monetizedBooks,
    monetizationCoverage: BOOKS.length ? Math.round((monetizedBooks / BOOKS.length) * 100) : 0,
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
  };
}
