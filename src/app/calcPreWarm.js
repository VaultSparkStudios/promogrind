const CALC_HISTORY_KEY = "pg_calc_history";
const PRE_WARM_KEY = "pg_calc_prewarm_state";
const MIN_DEVICE_MEMORY_GB = 4;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function deviceCanPreWarm() {
  if (typeof navigator === "undefined") return false;
  const mem = navigator.deviceMemory;
  if (!Number.isFinite(mem)) return true;
  return mem >= MIN_DEVICE_MEMORY_GB;
}

export function predictNextCalculators(history = null, opts = {}) {
  const max = Number.isFinite(opts.max) ? opts.max : 3;
  const raw = Array.isArray(history) ? history : readJson(CALC_HISTORY_KEY, []);
  if (!Array.isArray(raw) || !raw.length) return [];
  const counts = new Map();
  for (const entry of raw) {
    const slug = typeof entry === "string" ? entry : entry?.slug;
    if (!slug) continue;
    counts.set(slug, (counts.get(slug) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([slug]) => slug);
}

const CALC_LOADERS = {
  "bonus-bet": () => import("../calculators/BonusBet.jsx"),
  "first-bet": () => import("../calculators/FirstBet.jsx"),
  "profit-boost": () => import("../calculators/ProfitBoost.jsx"),
  "deposit-match": () => import("../calculators/DepositMatch.jsx"),
  "parlay-builder": () => import("../calculators/ParlayBuilder.jsx"),
  "parlay-hedge": () => import("../calculators/ParlayHedge.jsx"),
  "round-robin": () => import("../calculators/RoundRobinCalc.jsx"),
  "sgp-estimator": () => import("../calculators/SGPEstimator.jsx"),
  "no-vig": () => import("../calculators/NoVig.jsx"),
  "no-vig-3way": () => import("../calculators/NoVig3Way.jsx"),
  "arb-2way": () => import("../calculators/Arb2Way.jsx"),
  "arb-3way": () => import("../calculators/Arb3Way.jsx"),
  "kelly": () => import("../calculators/KellyCriterion.jsx"),
  "hold": () => import("../calculators/HoldCalc.jsx"),
  "insurance": () => import("../calculators/InsurancePromo.jsx"),
  "teaser": () => import("../calculators/TeaserCalc.jsx"),
  "plus-ev": () => import("../calculators/PlusEV.jsx"),
  "bet-sizing": () => import("../calculators/BetSizingAdvisor.jsx"),
};

export function preWarmCalculators(slugs = []) {
  if (!deviceCanPreWarm()) return { skipped: true, reason: "low-memory" };
  const warmed = [];
  for (const slug of slugs) {
    const loader = CALC_LOADERS[slug];
    if (!loader) continue;
    try {
      loader();
      warmed.push(slug);
    } catch {}
  }
  try {
    localStorage.setItem(PRE_WARM_KEY, JSON.stringify({ warmed, at: Date.now() }));
  } catch {}
  return { skipped: false, warmed };
}

export function schedulePreWarm(history = null) {
  if (typeof window === "undefined") return;
  const slugs = predictNextCalculators(history);
  if (!slugs.length) return;
  const run = () => preWarmCalculators(slugs);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2000 });
  } else {
    setTimeout(run, 1500);
  }
}
