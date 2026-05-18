// AI calibration tracker (S92 audit #5).
//
// Tracks how well AI-generated probabilities/confidences match observed
// outcomes. Surfaces a per-source Brier score so users can see the AI's
// own honesty record. Cold-start: hide until ≥ MIN_SAMPLE per source.

const LEDGER_KEY = "pg_ai_calibration_ledger";
export const MIN_SAMPLE = 10;

function readLedger(storage) {
  try {
    return JSON.parse((storage || window.localStorage).getItem(LEDGER_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

function writeLedger(storage, ledger) {
  try {
    (storage || window.localStorage).setItem(LEDGER_KEY, JSON.stringify(ledger.slice(-1000)));
  } catch {
    // ignore
  }
}

function clamp01(value) {
  const x = Number.parseFloat(value);
  if (!Number.isFinite(x)) return null;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

/**
 * Record an AI prediction at the moment it is shown to the user.
 *
 * entry = { id, source, predicted, feature?, occurredAt?, payload? }
 * `predicted` is a probability in [0,1] of the "positive outcome"
 * (e.g. the bet settling as a win, the recommendation being followed
 * and being net-positive, etc.).
 */
export function recordPrediction(entry, { storage } = {}) {
  if (!entry || !entry.id || !entry.source) return null;
  const predicted = clamp01(entry.predicted);
  if (predicted === null) return null;
  const ledger = readLedger(storage);
  const now = entry.occurredAt ? new Date(entry.occurredAt).getTime() : Date.now();
  // upsert by id
  const next = ledger.filter((e) => e.id !== entry.id);
  next.push({
    id: entry.id,
    source: String(entry.source),
    predicted,
    feature: entry.feature || null,
    payload: entry.payload || null,
    actual: null,
    occurredAt: now,
    resolvedAt: null,
  });
  writeLedger(storage, next);
  return next[next.length - 1];
}

/**
 * Resolve a prior prediction with the observed outcome (0 = negative,
 * 1 = positive). Silently no-ops if the id is unknown.
 */
export function resolvePrediction(id, actual, { storage } = {}) {
  const ledger = readLedger(storage);
  const idx = ledger.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  const observed = clamp01(actual);
  if (observed === null) return null;
  ledger[idx] = { ...ledger[idx], actual: observed, resolvedAt: Date.now() };
  writeLedger(storage, ledger);
  return ledger[idx];
}

function brierForEntries(entries) {
  if (!entries.length) return null;
  const sum = entries.reduce((acc, e) => acc + (e.predicted - e.actual) ** 2, 0);
  return Math.round((sum / entries.length) * 10000) / 10000;
}

/**
 * Per-source summary suitable for rendering as a calibration badge.
 *
 * Returns:
 *   {
 *     source: string,
 *     sample: number,
 *     brier: number | null,
 *     calibration: 0..100 | null,  // 100 - brier*100, clamped
 *     showable: boolean,
 *   }
 */
export function summarizeCalibration({ storage, windowMs = null } = {}) {
  const ledger = readLedger(storage).filter((e) => e.actual !== null);
  const cutoff = Number.isFinite(windowMs) ? Date.now() - windowMs : null;
  const filtered = cutoff !== null ? ledger.filter((e) => (e.resolvedAt || e.occurredAt) >= cutoff) : ledger;

  const bySource = new Map();
  for (const entry of filtered) {
    if (!bySource.has(entry.source)) bySource.set(entry.source, []);
    bySource.get(entry.source).push(entry);
  }

  return Array.from(bySource.entries())
    .map(([source, entries]) => {
      const brier = brierForEntries(entries);
      const calibration = brier === null ? null : Math.max(0, Math.min(100, Math.round((1 - brier) * 100)));
      return {
        source,
        sample: entries.length,
        brier,
        calibration,
        showable: entries.length >= MIN_SAMPLE,
      };
    })
    .sort((a, b) => b.sample - a.sample);
}

export function renderCalibrationBadge(summary) {
  if (!summary || !summary.showable) return null;
  return `${summary.source}: ${summary.calibration}% calibrated (n=${summary.sample})`;
}
