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

function buildHistorySignals(appData = {}) {
  const feedbackEntries = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const ledgerEntries = Array.isArray(appData.ledger) ? appData.ledger : [];
  const byPromoType = new Map();
  const byBook = new Map();

  const ensureRow = (map, key) => {
    if (!key) return null;
    if (!map.has(key)) {
      map.set(key, {
        total: 0,
        skipped: 0,
        friction: 0,
        settled: 0,
        positiveSettled: 0,
        actualProfit: 0,
      });
    }
    return map.get(key);
  };

  for (const entry of feedbackEntries.map((item) => normalizeWorkflowEntry(item))) {
    const promoRow = ensureRow(byPromoType, entry.promoType);
    const bookRow = ensureRow(byBook, entry.book);
    if (promoRow) {
      promoRow.total += 1;
      if (entry.status === "skipped") promoRow.skipped += 1;
      if (entry.frictionReason) promoRow.friction += 1;
      if (entry.status === "settled") {
        promoRow.settled += 1;
        promoRow.actualProfit += entry.actualProfit || 0;
        if ((entry.actualProfit || 0) > 0) promoRow.positiveSettled += 1;
      }
    }
    if (bookRow) {
      bookRow.total += 1;
      if (entry.status === "skipped") bookRow.skipped += 1;
      if (entry.frictionReason) bookRow.friction += 1;
      if (entry.status === "settled") {
        bookRow.settled += 1;
        bookRow.actualProfit += entry.actualProfit || 0;
        if ((entry.actualProfit || 0) > 0) bookRow.positiveSettled += 1;
      }
    }
  }

  for (const entry of ledgerEntries) {
    const row = ensureRow(byBook, String(entry.book || "").trim());
    if (!row) continue;
    row.settled += 1;
    row.actualProfit += toNumber(entry.profit) || 0;
    if ((toNumber(entry.profit) || 0) > 0) row.positiveSettled += 1;
  }

  return { byPromoType, byBook };
}

function pushReason(reasons, tone, text) {
  if (!text) return;
  reasons.push({ tone, text });
}

function summarizeReasons(reasons = []) {
  return reasons
    .slice(0, 3)
    .map((item) => item.text)
    .join(" · ");
}

function scoreWorkflow(workflow, context = {}) {
  const bankroll = toNumber(context.bankroll);
  const booksDone = context.done || {};
  const ageDays = daysOld(workflow.createdAt, context.now || new Date());
  const promoSignals = context.history?.byPromoType?.get(workflow.promoType) || null;
  const bookSignals = context.history?.byBook?.get(workflow.book) || null;
  const statusBase = {
    ready: 92,
    waiting: 86,
    queued: 78,
    placed: 72,
    skipped: 18,
    settled: 8,
  }[workflow.status] ?? 50;

  let score = statusBase;
  const reasons = [];
  pushReason(reasons, "neutral", `${workflow.status} workflow`);
  if (workflow.expectedProfit !== null) score += Math.min(workflow.expectedProfit, 40) * 0.6;
  if (workflow.expectedProfit !== null && workflow.expectedProfit >= 15) {
    pushReason(reasons, "positive", `+$${workflow.expectedProfit.toFixed(0)} expected`);
  }
  if (workflow.opportunityScore !== null) score += workflow.opportunityScore * 0.18;
  if (workflow.opportunityScore !== null && workflow.opportunityScore >= 80) {
    pushReason(reasons, "positive", `score ${workflow.opportunityScore}`);
  }
  if (workflow.actionability !== null) score += workflow.actionability * 0.08;
  if (workflow.confidence === "high") score += 8;
  if (workflow.confidence === "medium") score += 4;
  if (workflow.confidence) {
    pushReason(reasons, workflow.confidence === "high" ? "positive" : "neutral", `${workflow.confidence} confidence`);
  }
  if (!workflow.book) score -= 8;
  if (!workflow.book) pushReason(reasons, "risk", "missing book");
  if (workflow.book && booksDone[workflow.book]) score += 5;
  if (workflow.book && booksDone[workflow.book]) pushReason(reasons, "positive", `${workflow.book} already active`);
  if (bankroll !== null && workflow.expectedProfit !== null && workflow.expectedProfit > bankroll * 0.08) {
    score -= 10;
    pushReason(reasons, "risk", "high bankroll load");
  }
  if (workflow.frictionReason) score -= 6;
  if (workflow.frictionReason) pushReason(reasons, "risk", workflow.frictionReason.replace(/_/g, " "));
  if (workflow.skipReason) score -= 8;
  if (workflow.skipReason) pushReason(reasons, "risk", workflow.skipReason.replace(/_/g, " "));
  if (ageDays !== null && ageDays <= 2) score += 5;
  if (ageDays !== null && ageDays <= 2) pushReason(reasons, "positive", "fresh");
  if (ageDays !== null && ageDays >= 14) score -= 6;
  if (ageDays !== null && ageDays >= 14) pushReason(reasons, "risk", "stale");
  if (workflow.expiresAt) {
    const daysToExpire = daysOld(context.now || new Date(), new Date(workflow.expiresAt));
    if (daysToExpire !== null && daysToExpire >= 0 && daysToExpire <= 2) {
      score += 8;
      pushReason(reasons, "positive", "expires soon");
    }
  }

  if (promoSignals?.total >= 2) {
    const skipRate = promoSignals.skipped / promoSignals.total;
    if (skipRate >= 0.5) {
      score -= 8;
      pushReason(reasons, "risk", "promo type often skipped");
    }
  }
  if (promoSignals?.settled >= 2) {
    if (promoSignals.actualProfit > 0) {
      score += 6;
      pushReason(reasons, "positive", "promo type is paying");
    } else if (promoSignals.actualProfit < 0) {
      score -= 6;
      pushReason(reasons, "risk", "promo type is cold");
    }
  }
  if (bookSignals?.settled >= 2) {
    if (bookSignals.actualProfit > 0) {
      score += 5;
      pushReason(reasons, "positive", `${workflow.book} is profitable`);
    } else if (bookSignals.actualProfit < 0) {
      score -= 5;
      pushReason(reasons, "risk", `${workflow.book} is cold`);
    }
  }
  if (bookSignals?.friction >= 2) {
    score -= 4;
    pushReason(reasons, "risk", `${workflow.book} causes friction`);
  }
  if (workflow.nextStep) {
    score += 3;
    pushReason(reasons, "positive", "clear next step");
  }

  return {
    score: Math.max(0, Math.round(score)),
    reasons,
    scoreSummary: summarizeReasons(reasons),
  };
}

export function buildWorkflowInbox(appData = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const workflowEntries = Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [];
  const feedbackEntries = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const history = buildHistorySignals(appData);
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
    .map((workflow) => {
      const scoring = scoreWorkflow(workflow, { ...options, now, done: appData.done || {}, history });
      return {
        ...workflow,
        score: scoring.score,
        scoreReasons: scoring.reasons,
        scoreSummary: scoring.scoreSummary,
      };
    })
    .sort((a, b) => b.score - a.score || (b.expectedProfit || 0) - (a.expectedProfit || 0));

  return {
    workflows: deduped,
    open,
    top: open.slice(0, 5),
    queuedCount: open.filter((workflow) => workflow.status === "queued" || workflow.status === "ready").length,
    waitingCount: open.filter((workflow) => workflow.status === "waiting" || workflow.status === "placed").length,
  };
}
