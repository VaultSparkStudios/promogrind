import { normalizeWorkflowEntry } from "../promograph/index.js";

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysOld(value, now) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86400000));
}

function scoreWorkflow(workflow, context = {}) {
  const bankroll = toNumber(context.bankroll);
  const booksDone = context.done || {};
  const ageDays = daysOld(workflow.createdAt, context.now || new Date());
  const statusBase = {
    ready: 92,
    waiting: 86,
    queued: 78,
    placed: 72,
    skipped: 18,
    settled: 8,
  }[workflow.status] ?? 50;

  let score = statusBase;
  if (workflow.expectedProfit !== null) score += Math.min(workflow.expectedProfit, 40) * 0.6;
  if (workflow.opportunityScore !== null) score += workflow.opportunityScore * 0.18;
  if (workflow.confidence === "high") score += 8;
  if (workflow.confidence === "medium") score += 4;
  if (!workflow.book) score -= 8;
  if (workflow.book && booksDone[workflow.book]) score += 5;
  if (bankroll !== null && workflow.expectedProfit !== null && workflow.expectedProfit > bankroll * 0.08) score -= 10;
  if (workflow.frictionReason) score -= 6;
  if (workflow.skipReason) score -= 8;
  if (ageDays !== null && ageDays <= 2) score += 5;
  if (ageDays !== null && ageDays >= 14) score -= 6;
  return Math.max(0, Math.round(score));
}

export function buildWorkflowInbox(appData = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const workflowEntries = Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [];
  const feedbackEntries = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const combined = [...workflowEntries, ...feedbackEntries].map((entry) => normalizeWorkflowEntry(entry));
  const deduped = [];
  const seen = new Set();

  for (const workflow of combined) {
    if (seen.has(workflow.id)) continue;
    seen.add(workflow.id);
    deduped.push(workflow);
  }

  const open = deduped
    .filter((workflow) => ["queued", "ready", "placed", "waiting"].includes(workflow.status))
    .map((workflow) => ({
      ...workflow,
      score: scoreWorkflow(workflow, { ...options, now, done: appData.done || {} }),
    }))
    .sort((a, b) => b.score - a.score || (b.expectedProfit || 0) - (a.expectedProfit || 0));

  return {
    workflows: deduped,
    open,
    top: open.slice(0, 5),
    queuedCount: open.filter((workflow) => workflow.status === "queued" || workflow.status === "ready").length,
    waitingCount: open.filter((workflow) => workflow.status === "waiting" || workflow.status === "placed").length,
  };
}
