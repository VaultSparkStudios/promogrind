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
    label: "Arb Specialist",
    icon: "⚡",
    tip: "Your dominant play is arbitrage. Use the Kelly Criterion to size your arb stakes for maximum bankroll growth.",
    nextCalc: "kelly",
    nextLabel: "Kelly Criterion",
  },
  bonus: {
    label: "Bonus Hunter",
    icon: "🎯",
    tip: "You excel at promo conversion. Track your bonus conversion rate in the Edge Dashboard to spot improving trends.",
    nextCalc: "arb-2way",
    nextLabel: "2-Way Arb",
  },
  ev: {
    label: "EV Grinder",
    icon: "📊",
    tip: "You think in expected value. Layer in arb plays when you find 0-margin books — pure modeled profit.",
    nextCalc: "arb-2way",
    nextLabel: "2-Way Arb",
  },
  parlay: {
    label: "Parlay Builder",
    icon: "🎰",
    tip: "Parlays are exciting but compound vig hurts long-term. Run each leg through +EV first to verify your edge.",
    nextCalc: "ev",
    nextLabel: "+EV Calculator",
  },
  general: {
    label: "All-Around Grinder",
    icon: "🏆",
    tip: "You use a broad range of tools — great for diversification. Try the AI Promo Advisor for personalized play suggestions.",
    nextCalc: "bonus-bet",
    nextLabel: "Bonus Bet Converter",
  },
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getUserProfile() {
  if (!canUseStorage()) return { type: "general", count: 0, ...PROFILE_META.general };

  const buckets = { arb: 0, bonus: 0, ev: 0, parlay: 0 };
  let totalCalcs = 0;
  let primaryCalc = null;
  let primaryCount = 0;

  for (const [slug, bucket] of Object.entries(CALC_TYPES)) {
    try {
      const hist = JSON.parse(localStorage.getItem(`pg_hist_${slug}`) || "[]");
      if (hist.length > 0) {
        buckets[bucket] += hist.length;
        totalCalcs += hist.length;
        if (hist.length > primaryCount) { primaryCount = hist.length; primaryCalc = slug; }
      }
    } catch {}
  }

  if (totalCalcs < 3) return { type: "general", count: totalCalcs, primaryCalc, ...PROFILE_META.general };

  const sorted = Object.entries(buckets).sort(([, a], [, b]) => b - a);
  const topBucket = sorted[0];
  const runnerUp = sorted[1];
  const dominates = runnerUp[1] === 0 || topBucket[1] / runnerUp[1] > 1.5;

  const type = dominates ? topBucket[0] : "general";
  return { type, count: totalCalcs, primaryCalc, ...PROFILE_META[type] };
}

export function saveProfileType(type) {
  if (!canUseStorage()) return;
  try { localStorage.setItem("pg_profile_type", type); } catch {}
}

export function loadProfileType() {
  if (!canUseStorage()) return null;
  try { return localStorage.getItem("pg_profile_type"); } catch { return null; }
}
