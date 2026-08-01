import { realizedOutcomeValue } from "./realizedOutcome.js";

// Mistake-memory loop (S92 audit #4).
//
// Given a candidate promo play and an operator's settled-bet ledger,
// surface up to 3 prior losses that pattern-match on (book, promoType,
// rollover band, qualifier set, stake band). Used to render a sober
// "you've tried this before; it lost $X" chip — never punitive.
//
// Soul guard: copy generated here is observational. No exclamation
// marks, no all-caps, no imperatives. The chip is information, not
// scolding.

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function lc(value) {
  return String(value || "").trim().toLowerCase();
}

function rolloverBand(value) {
  const x = num(value);
  if (x <= 0) return "none";
  if (x < 2) return "low";
  if (x < 5) return "mid";
  if (x < 10) return "high";
  return "extreme";
}

function stakeBand(value) {
  const x = num(value);
  if (x <= 0) return "none";
  if (x < 25) return "micro";
  if (x < 100) return "small";
  if (x < 500) return "mid";
  return "large";
}

function qualifierSet(value) {
  if (Array.isArray(value)) return new Set(value.map(lc).filter(Boolean));
  if (!value) return new Set();
  return new Set(
    String(value)
      .toLowerCase()
      .split(/[,;|/+]|\band\b|\bor\b/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function jaccard(setA, setB) {
  if (!setA.size && !setB.size) return 1;
  if (!setA.size || !setB.size) return 0;
  let inter = 0;
  for (const v of setA) if (setB.has(v)) inter += 1;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

export function similarity(candidate = {}, prior = {}) {
  const book = lc(candidate.book) && lc(candidate.book) === lc(prior.book) ? 1 : 0;
  const promo = lc(candidate.promoType || candidate.promo) === lc(prior.promoType || prior.promo) ? 1 : 0;
  const roll = rolloverBand(candidate.rollover) === rolloverBand(prior.rollover) ? 1 : 0;
  const qual = jaccard(qualifierSet(candidate.qualifier), qualifierSet(prior.qualifier));
  const stake = stakeBand(candidate.stake) === stakeBand(prior.stake) ? 1 : 0;
  return (book + promo + roll + qual + stake) / 5;
}

function priorLossEntries(ledger = []) {
  return (Array.isArray(ledger) ? ledger : []).filter((entry) => {
    if (!entry) return false;
    const status = lc(entry.status);
    if (status !== "settled") return false;
    return realizedOutcomeValue(entry) < 0;
  });
}

const SHAME_PHRASES = ["!", "STOP", "DON'T", "never ", "should not"];

function buildCopy(loss) {
  const book = loss.book || "this book";
  const promo = loss.promoType || loss.promo || "this play";
  const amount = Math.abs(realizedOutcomeValue(loss));
  return `prior ${promo} on ${book} settled -$${amount.toFixed(2)}`;
}

function assertNoShame(text) {
  const lower = String(text || "").toLowerCase();
  for (const phrase of SHAME_PHRASES) {
    if (lower.includes(phrase.toLowerCase())) {
      throw new Error(`mistakeMemory copy violates no-shame invariant: matched ${phrase}`);
    }
  }
}

export function matchPriorMistake(candidate = {}, ledger = [], { threshold = 0.8, limit = 3 } = {}) {
  const losses = priorLossEntries(ledger);
  const scored = losses
    .map((loss) => ({ loss, score: similarity(candidate, loss) }))
    .filter((entry) => entry.score >= threshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ loss, score }) => {
    const copy = buildCopy(loss);
    assertNoShame(copy);
    return {
      score: Math.round(score * 100) / 100,
      reference: loss.id || loss.entryId || null,
      copy,
      book: loss.book || null,
      promoType: loss.promoType || loss.promo || null,
      lossAmount: Math.round(Math.abs(realizedOutcomeValue(loss)) * 100) / 100,
      occurredAt: loss.createdAt || loss.settledAt || loss.updatedAt || null,
    };
  });
}

export function summarizeNearestMistake(candidate = {}, ledger = [], opts = {}) {
  const matches = matchPriorMistake(candidate, ledger, opts);
  if (!matches.length) return null;
  const top = matches[0];
  return {
    ...top,
    chipLabel: "similar to a prior settled loss",
    chipDetail: top.copy,
    count: matches.length,
  };
}
