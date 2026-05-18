// Anti-tilt pre-mortem (S92 audit #10).
//
// Before a stake exceeds threshold% of bankroll, render up to 3 "how
// this could go wrong" scenarios drawn from prior settled losses on
// similar plays. Borrowed from anesthesiology checklists — friction is
// the feature.

import { matchPriorMistake } from "./mistakeMemory.js";

const DEFAULT_THRESHOLD_PCT = 0.10;

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function shouldShowPreMortem({ stake, bankroll, thresholdPct = DEFAULT_THRESHOLD_PCT } = {}) {
  const s = num(stake);
  const br = num(bankroll);
  if (s <= 0 || br <= 0) return false;
  return s / br >= num(thresholdPct, DEFAULT_THRESHOLD_PCT);
}

function asScenario(match, idx) {
  return {
    idx,
    headline: `Prior settled loss on ${match.book || "this book"} (${match.promoType || "this promo"})`,
    detail: match.copy,
    lossAmount: match.lossAmount,
    similarity: match.score,
    reference: match.reference,
  };
}

/**
 * Build a pre-mortem prompt for a candidate play.
 *
 * candidate = { book, promoType, rollover, qualifier, stake, bankroll? }
 * ledger    = resultFeedback or bets array
 *
 * Returns {
 *   triggered: boolean,
 *   threshold: { stake, bankroll, ratio, requiredRatio },
 *   scenarios: [{ headline, detail, lossAmount, similarity, reference }],
 *   acknowledgements: number,    // how many the user must tap through
 *   copy: { title, body }
 * }
 */
export function buildPreMortem(candidate = {}, ledger = [], opts = {}) {
  const thresholdPct = num(opts.thresholdPct, DEFAULT_THRESHOLD_PCT);
  const bankroll = num(opts.bankroll ?? candidate.bankroll, 0);
  const stake = num(candidate.stake, 0);
  const triggered = shouldShowPreMortem({ stake, bankroll, thresholdPct });

  const matches = matchPriorMistake(candidate, ledger, { limit: 3 });
  const scenarios = matches.map(asScenario);

  return {
    triggered,
    threshold: {
      stake,
      bankroll,
      ratio: bankroll > 0 ? Math.round((stake / bankroll) * 1000) / 1000 : null,
      requiredRatio: thresholdPct,
    },
    scenarios,
    acknowledgements: scenarios.length,
    copy: {
      title: "Take a moment before placing",
      body:
        scenarios.length === 0
          ? "Stake is large relative to bankroll. Confirm this is intentional before proceeding."
          : "Stake is large relative to bankroll. Review prior similar plays first.",
    },
    skippable: false,
  };
}
