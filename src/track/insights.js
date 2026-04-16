import { formatPromoTypeLabel, normalizeWorkflowEntry } from "../promograph/index.js";
export { formatPromoTypeLabel } from "../promograph/index.js";

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

export function normalizeResultFeedback(entry = {}) {
  return normalizeWorkflowEntry(entry);
}

export function upsertResultFeedback(entries = [], nextEntry = {}) {
  const normalized = normalizeResultFeedback(nextEntry);
  const index = entries.findIndex((entry) => entry?.id === normalized.id);
  if (index === -1) return [normalized, ...entries].slice(0, 250);
  const copy = [...entries];
  copy[index] = { ...copy[index], ...normalized };
  return copy;
}

export function updateResultFeedback(entries = [], id, patch = {}) {
  const existing = entries.find((entry) => entry?.id === id);
  if (!existing) return entries;
  return upsertResultFeedback(entries, { ...existing, ...patch, id, updatedAt: new Date().toISOString() });
}

export function buildTrackInsights(data = {}, now = new Date()) {
  const ledger = Array.isArray(data.ledger) ? data.ledger : [];
  const feedbackEntries = Array.isArray(data.resultFeedback)
    ? data.resultFeedback.map((entry) => normalizeResultFeedback(entry))
    : [];
  const workflowInboxEntries = Array.isArray(data.workflowInbox)
    ? data.workflowInbox.map((entry) => normalizeWorkflowEntry(entry))
    : [];

  const today = now instanceof Date ? now : new Date(now);
  const todayStr = dateOnly(today);
  const monthKey = todayStr ? todayStr.slice(0, 7) : null;

  const totals = ledger.reduce((acc, entry) => {
    const profit = toNumber(entry.profit) || 0;
    const date = dateOnly(entry.date);
    acc.totalProfit += profit;
    if (monthKey && date?.startsWith(monthKey)) acc.monthProfit += profit;
    if (date && todayStr) {
      const diffDays = Math.floor((new Date(todayStr) - new Date(date)) / 86400000);
      if (diffDays >= 0 && diffDays <= 6) acc.recent7Profit += profit;
    }
    return acc;
  }, { totalProfit: 0, monthProfit: 0, recent7Profit: 0 });

  const settledFeedback = feedbackEntries.filter((entry) => entry.status === "settled");
  const openFeedback = feedbackEntries.filter((entry) => entry.status === "placed" || entry.status === "waiting");
  const skippedFeedback = feedbackEntries.filter((entry) => entry.status === "skipped");
  const attemptedCount = settledFeedback.length + openFeedback.length;
  const executionRate = feedbackEntries.length ? (attemptedCount / feedbackEntries.length) * 100 : null;
  const settledCount = settledFeedback.length;
  const hitCount = settledFeedback.filter((entry) => (entry.actualProfit ?? 0) > 0).length;
  const accuracyCount = settledFeedback.filter((entry) => ["yes", "close"].includes(entry.calculatorAccurate || "")).length;
  const expectedSettledProfit = settledFeedback.reduce((sum, entry) => sum + (entry.expectedProfit || 0), 0);
  const actualSettledProfit = settledFeedback.reduce((sum, entry) => sum + (entry.actualProfit || 0), 0);

  const promoTypeMap = new Map();
  const skipReasonMap = new Map();
  const frictionReasonMap = new Map();
  const sourceMap = new Map();
  for (const entry of feedbackEntries) {
    const key = entry.promoType || "other";
    if (!promoTypeMap.has(key)) {
      promoTypeMap.set(key, {
        key,
        label: formatPromoTypeLabel(key),
        total: 0,
        placed: 0,
        skipped: 0,
        settled: 0,
        hitCount: 0,
        expectedProfit: 0,
        actualProfit: 0,
        accuracyCount: 0,
        driftCount: 0,
        driftTotal: 0,
      });
    }
    const row = promoTypeMap.get(key);
    row.total += 1;
    if (entry.status === "skipped") row.skipped += 1;
    if (entry.status === "placed" || entry.status === "settled") row.placed += 1;
    if (entry.status === "settled") {
      row.settled += 1;
      row.expectedProfit += entry.expectedProfit || 0;
      row.actualProfit += entry.actualProfit || 0;
      if ((entry.actualProfit || 0) > 0) row.hitCount += 1;
      if (["yes", "close"].includes(entry.calculatorAccurate || "")) row.accuracyCount += 1;
      if (entry.expectedProfit !== null && entry.actualProfit !== null) {
        row.driftCount += 1;
        row.driftTotal += (entry.actualProfit || 0) - (entry.expectedProfit || 0);
      }
    }
    if (entry.skipReason) {
      const current = skipReasonMap.get(entry.skipReason) || { key: entry.skipReason, label: formatPromoTypeLabel(entry.skipReason), count: 0 };
      current.count += 1;
      skipReasonMap.set(entry.skipReason, current);
    }
    if (entry.frictionReason) {
      const current = frictionReasonMap.get(entry.frictionReason) || { key: entry.frictionReason, label: formatPromoTypeLabel(entry.frictionReason), count: 0 };
      current.count += 1;
      frictionReasonMap.set(entry.frictionReason, current);
    }
    const sourceKey = entry.source || "result_feedback";
    const sourceCurrent = sourceMap.get(sourceKey) || { key: sourceKey, label: sourceKey.replace(/_/g, " "), total: 0, settled: 0, actualProfit: 0 };
    sourceCurrent.total += 1;
    if (entry.status === "settled") {
      sourceCurrent.settled += 1;
      sourceCurrent.actualProfit += entry.actualProfit || 0;
    }
    sourceMap.set(sourceKey, sourceCurrent);
  }

  const promoTypeRows = [...promoTypeMap.values()]
    .map((row) => ({
      ...row,
      hitRate: row.settled ? (row.hitCount / row.settled) * 100 : null,
      accuracyRate: row.settled ? (row.accuracyCount / row.settled) * 100 : null,
      averageDrift: row.driftCount ? row.driftTotal / row.driftCount : null,
    }))
    .sort((a, b) => (b.actualProfit - a.actualProfit) || (b.expectedProfit - a.expectedProfit) || (b.total - a.total));

  const ledgerBookMap = new Map();
  for (const entry of ledger) {
    const book = String(entry.book || "").trim();
    if (!book) continue;
    if (!ledgerBookMap.has(book)) ledgerBookMap.set(book, { book, realizedProfit: 0, ledgerEntries: 0, settled: 0, hitCount: 0 });
    const row = ledgerBookMap.get(book);
    row.realizedProfit += toNumber(entry.profit) || 0;
    row.ledgerEntries += 1;
  }

  for (const entry of settledFeedback) {
    if (!entry.book) continue;
    if (!ledgerBookMap.has(entry.book)) ledgerBookMap.set(entry.book, { book: entry.book, realizedProfit: 0, ledgerEntries: 0, settled: 0, hitCount: 0 });
    const row = ledgerBookMap.get(entry.book);
    row.settled += 1;
    if ((entry.actualProfit || 0) > 0) row.hitCount += 1;
    if (row.ledgerEntries === 0) row.realizedProfit += entry.actualProfit || 0;
  }

  const bookRows = [...ledgerBookMap.values()]
    .map((row) => ({
      ...row,
      hitRate: row.settled ? (row.hitCount / row.settled) * 100 : null,
    }))
    .sort((a, b) => (b.realizedProfit - a.realizedProfit) || (b.hitCount - a.hitCount) || a.book.localeCompare(b.book));

  const skipReasonRows = [...skipReasonMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const frictionReasonRows = [...frictionReasonMap.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const sourceRows = [...sourceMap.values()].sort((a, b) => (b.settled - a.settled) || (b.total - a.total) || a.label.localeCompare(b.label));
  const driftRows = promoTypeRows
    .filter((row) => row.averageDrift !== null)
    .sort((a, b) => a.averageDrift - b.averageDrift);
  const workflowTimeline = [...workflowInboxEntries, ...feedbackEntries]
    .reduce((acc, entry) => {
      if (acc.some((item) => item.id === entry.id && item.status === entry.status && item.updatedAt === entry.updatedAt)) return acc;
      acc.push(entry);
      return acc;
    }, [])
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
    .slice(0, 12);
  const selfCalibration = {
    settledCount,
    averageDrift: settledCount ? (actualSettledProfit - expectedSettledProfit) / settledCount : null,
    expectedSettledProfit,
    actualSettledProfit,
    accuracyRate: settledCount ? (accuracyCount / settledCount) * 100 : null,
    label:
      settledCount === 0
        ? "Needs settled workflow data."
        : actualSettledProfit >= expectedSettledProfit
          ? "Outcomes are meeting or beating model expectations."
          : "Outcomes are trailing projections; review the coldest lanes and friction reasons.",
  };
  const selfCalibrationRows = promoTypeRows
    .filter((row) => row.averageDrift !== null)
    .slice()
    .sort((a, b) => Math.abs(b.averageDrift) - Math.abs(a.averageDrift))
    .slice(0, 6);

  return {
    ...totals,
    feedbackEntries,
    openFeedback,
    skippedFeedback,
    attemptedCount,
    executionRate,
    settledFeedback,
    settledCount,
    hitRate: settledCount ? (hitCount / settledCount) * 100 : null,
    accuracyRate: settledCount ? (accuracyCount / settledCount) * 100 : null,
    expectedSettledProfit,
    actualSettledProfit,
    promoTypeRows,
    bookRows,
    skipReasonRows,
    frictionReasonRows,
    sourceRows,
    workflowTimeline,
    selfCalibration,
    selfCalibrationRows,
    biggestNegativeDrift: driftRows[0] || null,
    biggestPositiveDrift: driftRows.length ? driftRows[driftRows.length - 1] : null,
  };
}

// ─── Adaptive trust score ────────────────────────────────────────────────────
// Given all feedback entries and a calculator key (optionally scoped to a
// promo type and/or book), compute an aggregate trust signal:
//   {
//     sampleSize: number,              // count of settled rows used
//     accuracyRate: number|null,       // % of settled rows marked yes/close
//     hitRate:      number|null,       // % of settled rows with profit > 0
//     averageDrift: number|null,       // avg (actual - expected)
//     confidence:   "low"|"medium"|"high"|null,
//     label:        string,            // short human-readable summary
//   }
// Pure function. Callers pass `{ feedback, calculatorKey, promoType?, book? }`.
// Low sample-size returns sampleSize<MIN_TRUST_SAMPLES with confidence="low".
// Used by CalculatorTrustBadge on calculator result rows to surface
// data-grounded self-accuracy (e.g., "Accuracy so far: 94% of 23 settlements").

export const MIN_TRUST_SAMPLES = 3;

export function calculatorAccuracy(input = {}) {
  const { feedback, calculatorKey, promoType = null, book = null } = input;
  if (!Array.isArray(feedback) || !calculatorKey) {
    return { sampleSize: 0, accuracyRate: null, hitRate: null, averageDrift: null, confidence: null, label: "" };
  }
  const normalizedBook = book ? String(book).trim().toLowerCase() : null;
  const rows = feedback
    .map((entry) => normalizeResultFeedback(entry))
    .filter((entry) => entry.calculatorKey === calculatorKey && entry.status === "settled")
    .filter((entry) => !promoType || entry.promoType === promoType)
    .filter((entry) => !normalizedBook || String(entry.book || "").trim().toLowerCase() === normalizedBook);

  const sampleSize = rows.length;
  if (!sampleSize) {
    return { sampleSize: 0, accuracyRate: null, hitRate: null, averageDrift: null, confidence: null, label: "" };
  }
  const accuracyCount = rows.filter((entry) => ["yes", "close"].includes(entry.calculatorAccurate || "")).length;
  const hitCount = rows.filter((entry) => (entry.actualProfit ?? 0) > 0).length;
  const driftRows = rows.filter((entry) => entry.expectedProfit !== null && entry.actualProfit !== null);
  const averageDrift = driftRows.length
    ? driftRows.reduce((sum, entry) => sum + (entry.actualProfit - entry.expectedProfit), 0) / driftRows.length
    : null;

  const accuracyRate = (accuracyCount / sampleSize) * 100;
  const hitRate = (hitCount / sampleSize) * 100;
  const confidence = sampleSize < MIN_TRUST_SAMPLES ? "low" : sampleSize < 10 ? "medium" : "high";

  const settlementsLabel = sampleSize === 1 ? "settlement" : "settlements";
  const label =
    confidence === "low"
      ? `Building confidence — ${sampleSize} ${settlementsLabel} so far.`
      : `Accuracy so far: ${Math.round(accuracyRate)}% across ${sampleSize} ${settlementsLabel}.`;

  return { sampleSize, accuracyRate, hitRate, averageDrift, confidence, label };
}
