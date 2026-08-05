// Infer user play-style profile from localStorage calculator usage history
// No new data collection — reads pg_hist_* keys that already exist

const CALC_TYPES = {
  "bonus-bet":      "bonus",
  "profit-boost":   "bonus",
  "first-bet":      "bonus",
  "deposit-match":  "bonus",
  "insurance":      "bonus",
  "arb-2way":       "arb",
  "arb-3way":       "arb",
  "parlay-hedge":   "arb",
  "middle":         "arb",
  "ev":             "ev",
  "kelly":          "ev",
  "no-vig":         "ev",
  "no-vig-3way":    "ev",
  "teaser":         "ev",
  "sgp":            "ev",
  "parlay-builder": "parlay",
  "round-robin":    "parlay",
};

const PROFILE_META = {
  arb: {
    label: "Arbitrage tool concentration",
    icon: "⚡",
    tip: "Most saved calculator history is in arbitrage tools. Review stake-sizing assumptions before acting on a quoted spread.",
    nextCalc: "kelly",
    nextLabel: "Kelly Criterion",
  },
  bonus: {
    label: "Promo-conversion tool concentration",
    icon: "🎯",
    tip: "Most saved calculator history is in promo-conversion tools. Compare modeled conversion with settled results before drawing conclusions.",
    nextCalc: "arb-2way",
    nextLabel: "2-Way Arb",
  },
  ev: {
    label: "Expected-value tool concentration",
    icon: "📊",
    tip: "Most saved calculator history uses expected-value tools. Recheck probability sources, vig, and limits before treating a model as evidence.",
    nextCalc: "arb-2way",
    nextLabel: "2-Way Arb",
  },
  parlay: {
    label: "Multi-leg tool concentration",
    icon: "🎰",
    tip: "Most saved calculator history uses multi-leg tools. Review correlation and compounded vig before comparing modeled outcomes.",
    nextCalc: "ev",
    nextLabel: "+EV Calculator",
  },
  general: {
    label: "Mixed calculator tool use",
    icon: "🏆",
    tip: "Your saved history spans several calculator families. Use the review surfaces to compare assumptions and settled evidence.",
    nextCalc: "bonus-bet",
    nextLabel: "Bonus Bet Converter",
  },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getUserProfile() {
  if (!canUseStorage()) return buildToolMixProfile({});
  const historyCounts = {};
  let primaryCalc = null;
  let primaryCount = 0;

  for (const slug of Object.keys(CALC_TYPES)) {
    try {
      const hist = JSON.parse(localStorage.getItem(`pg_hist_${slug}`) || "[]");
      if (Array.isArray(hist) && hist.length > 0) {
        historyCounts[slug] = hist.length;
        if (hist.length > primaryCount) { primaryCount = hist.length; primaryCalc = slug; }
      }
    } catch {}
  }

  return buildToolMixProfile(historyCounts, { primaryCalc });
}

export function buildToolMixProfile(historyCounts = {}, { primaryCalc = null } = {}) {
  const buckets = { arb: 0, bonus: 0, ev: 0, parlay: 0 };
  for (const [slug, rawCount] of Object.entries(historyCounts || {})) {
    const bucket = CALC_TYPES[slug];
    const count = Number(rawCount);
    if (!bucket || !Number.isFinite(count) || count <= 0) continue;
    buckets[bucket] += Math.floor(count);
  }
  const totalCalcs = Object.values(buckets).reduce((sum, count) => sum + count, 0);
  const sorted = Object.entries(buckets).sort(([, left], [, right]) => right - left);
  const topBucket = sorted[0];
  const runnerUp = sorted[1];
  const dominanceRatio = runnerUp[1] === 0 ? (topBucket[1] > 0 ? null : 1) : topBucket[1] / runnerUp[1];
  const dominates = totalCalcs >= 3 && (runnerUp[1] === 0 ? topBucket[1] > 0 : dominanceRatio > 1.5);
  const type = dominates ? topBucket[0] : "general";
  const distribution = Object.fromEntries(Object.entries(buckets).map(([key, count]) => [key, totalCalcs ? Number((count / totalCalcs).toFixed(3)) : 0]));

  return {
    type,
    count: totalCalcs,
    primaryCalc,
    ...PROFILE_META[type],
    evidence: {
      source: "local-calculator-history",
      sampleCount: totalCalcs,
      distribution,
      dominanceRatio: dominanceRatio == null ? null : Number(dominanceRatio.toFixed(2)),
      confidence: totalCalcs >= 10 ? "observed-tool-mix" : "limited-sample",
      performanceClaim: false,
    },
    disclaimer: "Tool frequency is not evidence of skill, profit, or future outcomes.",
  };
}

export function saveProfileType(type) {
  if (!canUseStorage()) return;
  try { localStorage.setItem("pg_profile_type", type); } catch {}
}

export function loadProfileType() {
  if (!canUseStorage()) return null;
  try { return localStorage.getItem("pg_profile_type"); } catch { return null; }
}
