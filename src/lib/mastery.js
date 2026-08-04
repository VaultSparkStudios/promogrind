// Decision-review depth — per-promo evidence maturity + global review practice.
// Bands are earned only by closing feedback loops with a realized outcome or a
// reasoned skip. Login, calculator activity, wagers, and profit never advance it.

import { parseRealizedOutcomeValue } from "./realizedOutcome.js";
import { ledgerEvidenceEntries } from "./ledgerEvidence.js";

const TYPE_ALIASES = {
  bonus: "bonus_bet", bonus_bet: "bonus_bet", free_bet: "bonus_bet", freebet: "bonus_bet",
  profit_boost: "profit_boost", odds_boost: "profit_boost", boost: "profit_boost",
  safety: "safety_net", safety_net: "safety_net", first_bet: "safety_net",
  insurance: "insurance", sgp_insurance: "insurance", parlay_insurance: "insurance",
  deposit_match: "deposit_match", reload_match: "deposit_match",
  parlay: "parlay", sgp: "parlay",
  arb: "arb", arbitrage: "arb",
  other: "other",
};

export const PROMO_TYPE_KEYS = ["bonus_bet", "profit_boost", "safety_net", "deposit_match", "insurance", "parlay", "arb", "other"];

export const PROMO_LABELS = {
  bonus_bet: "Bonus Bet", profit_boost: "Profit Boost", safety_net: "Safety Net",
  deposit_match: "Deposit Match", insurance: "Insurance", parlay: "Parlay",
  arb: "Arbitrage", other: "Other",
};

export const MASTERY_LEVELS = [
  { name: "Steward", minReviews: 30 },
  { name: "Calibrator", minReviews: 15 },
  { name: "Reviewer", minReviews: 5 },
  { name: "Analyst", minReviews: 0 },
];

export const MASTERY_NEXT_REVIEWS = { Analyst: 5, Reviewer: 15, Calibrator: 30, Steward: null };

export const MASTERY_COLOR = {
  Analyst: "#7a8fa8",
  Reviewer: "#4ade80",
  Calibrator: "#60a5fa",
  Steward: "#c084fc",
};

export const MASTERY_RANK = { Analyst: 0, Reviewer: 1, Calibrator: 2, Steward: 3 };

export const REVIEW_DEPTH_BANDS = [
  { name: "Evidence Lead", minReviews: 75, color: "#fbbf24" },
  { name: "Steward", minReviews: 30, color: "#c084fc" },
  { name: "Calibrator", minReviews: 15, color: "#60a5fa" },
  { name: "Reviewer", minReviews: 5, color: "#4ade80" },
  { name: "Observer", minReviews: 0, color: "#7a8fa8" },
];

function normalizeType(type) {
  return TYPE_ALIASES[String(type || "").toLowerCase()] || "other";
}

function getMasteryLevel(reviews) {
  return MASTERY_LEVELS.find((level) => reviews >= level.minReviews)?.name || "Analyst";
}

function isReviewedDecision(entry) {
  const status = String(entry?.status || "").toLowerCase();
  if (status === "settled") return parseRealizedOutcomeValue(entry?.actualProfit) !== null;
  if (status === "skipped") return Boolean(String(entry?.skipReason || "").trim());
  return false;
}

export function computeMastery(appData = {}) {
  const ledger = ledgerEvidenceEntries(appData.ledger);
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const reviewed = feedback.filter(isReviewedDecision);
  const reviewCount = reviewed.length;
  const reviewDepthBand = REVIEW_DEPTH_BANDS.find((band) => reviewCount >= band.minReviews) || REVIEW_DEPTH_BANDS.at(-1);
  const totalProfit = ledger.reduce((sum, entry) => sum + (parseRealizedOutcomeValue(entry?.profit) || 0), 0);

  const reviewMap = {};
  const accuracyMap = {};
  for (const entry of reviewed) {
    const key = normalizeType(entry.promoType);
    reviewMap[key] = (reviewMap[key] || 0) + 1;
    if (entry.status !== "settled") continue;
    const actual = parseRealizedOutcomeValue(entry.actualProfit);
    const expected = parseRealizedOutcomeValue(entry.expectedProfit);
    if (actual === null || expected === null || expected <= 0) continue;
    if (!accuracyMap[key]) accuracyMap[key] = { total: 0, close: 0 };
    accuracyMap[key].total += 1;
    if (Math.abs(actual - expected) / expected <= 0.10) accuracyMap[key].close += 1;
  }

  const perType = {};
  for (const key of PROMO_TYPE_KEYS) {
    const reviews = reviewMap[key] || 0;
    const level = getMasteryLevel(reviews);
    const nextReviews = MASTERY_NEXT_REVIEWS[level];
    const accuracy = accuracyMap[key]
      ? Math.round((accuracyMap[key].close / accuracyMap[key].total) * 100)
      : null;
    const floor = MASTERY_LEVELS.find((item) => item.name === level)?.minReviews ?? 0;
    const denominator = nextReviews === null ? 1 : nextReviews - floor;
    const reviewPct = nextReviews === null ? 100 : Math.min(100, Math.round(((reviews - floor) / denominator) * 100));
    perType[key] = { label: PROMO_LABELS[key], level, reviews, nextReviews, accuracy, reviewPct };
  }

  return { reviewDepthBand, reviewCount, totalProfit, perType };
}

export function isDecisionReview(entry) {
  return isReviewedDecision(entry);
}
