function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

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

export function formatPromoTypeLabel(value = "") {
  return String(value || "other")
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeResultFeedback(entry = {}) {
  return {
    id: entry.id ?? safeUUID(),
    calculatorKey: entry.calculatorKey || "unknown",
    calculatorLabel: entry.calculatorLabel || "Unknown calculator",
    promoType: entry.promoType || "other",
    status: entry.status || "placed",
    expectedProfit: toNumber(entry.expectedProfit),
    actualProfit: toNumber(entry.actualProfit),
    calculatorAccurate: entry.calculatorAccurate || null,
    book: String(entry.book || "").trim(),
    note: String(entry.note || "").trim(),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
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
  const openFeedback = feedbackEntries.filter((entry) => entry.status === "placed");
  const skippedFeedback = feedbackEntries.filter((entry) => entry.status === "skipped");
  const settledCount = settledFeedback.length;
  const hitCount = settledFeedback.filter((entry) => (entry.actualProfit ?? 0) > 0).length;
  const accuracyCount = settledFeedback.filter((entry) => ["yes", "close"].includes(entry.calculatorAccurate || "")).length;
  const expectedSettledProfit = settledFeedback.reduce((sum, entry) => sum + (entry.expectedProfit || 0), 0);
  const actualSettledProfit = settledFeedback.reduce((sum, entry) => sum + (entry.actualProfit || 0), 0);

  const promoTypeMap = new Map();
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

  return {
    ...totals,
    feedbackEntries,
    openFeedback,
    skippedFeedback,
    settledFeedback,
    settledCount,
    hitRate: settledCount ? (hitCount / settledCount) * 100 : null,
    accuracyRate: settledCount ? (accuracyCount / settledCount) * 100 : null,
    expectedSettledProfit,
    actualSettledProfit,
    promoTypeRows,
    bookRows,
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
