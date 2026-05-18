// Bankroll forward stress test (S92 audit #7).
//
// Forward Monte Carlo on a user's open exposure + planned plays. Answers
// the question "what does my bankroll look like at P10/P50/P90 after
// these outcomes settle?". Deterministic given a seed.

const ITERATIONS_DEFAULT = 500;

// Mulberry32 — small, deterministic, well-distributed enough for MC.
function mulberry32(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function num(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizePosition(p) {
  if (!p) return null;
  const stake = num(p.stake);
  const winProb = Math.max(0, Math.min(1, num(p.winProb)));
  const payoutOnWin = num(p.payoutOnWin, stake);
  if (stake <= 0) return null;
  return { stake, winProb, payoutOnWin };
}

export function simulateOnce(positions, rng) {
  let pnl = 0;
  for (const pos of positions) {
    const r = rng();
    if (r < pos.winProb) pnl += pos.payoutOnWin;
    else pnl -= pos.stake;
  }
  return pnl;
}

function percentile(sorted, q) {
  if (!sorted.length) return 0;
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

/**
 * Run forward Monte Carlo.
 *
 * input = {
 *   bankroll: number,
 *   positions: [{ stake, winProb, payoutOnWin }],
 *   floor: number  // bankroll floor (default 0)
 * }
 */
export function runBankrollStress(input = {}, opts = {}) {
  const iterations = Math.max(50, Math.min(5000, Number.isFinite(opts.iterations) ? opts.iterations : ITERATIONS_DEFAULT));
  const seed = Number.isFinite(opts.seed) ? opts.seed : 42;
  const rng = mulberry32(seed);

  const bankroll = num(input.bankroll, 0);
  const floor = num(input.floor, 0);
  const positions = (Array.isArray(input.positions) ? input.positions : [])
    .map(normalizePosition)
    .filter(Boolean);

  if (!positions.length) {
    return {
      empty: true,
      bankroll,
      iterations,
      positions: 0,
      results: { p10: bankroll, p50: bankroll, p90: bankroll },
      floorBreaches: 0,
      worstCase: bankroll,
    };
  }

  const outcomes = new Array(iterations);
  let floorBreaches = 0;
  for (let i = 0; i < iterations; i++) {
    const pnl = simulateOnce(positions, rng);
    const endBankroll = bankroll + pnl;
    outcomes[i] = endBankroll;
    if (endBankroll < floor) floorBreaches += 1;
  }
  outcomes.sort((a, b) => a - b);

  const round2 = (n) => Math.round(n * 100) / 100;
  return {
    empty: false,
    bankroll,
    iterations,
    positions: positions.length,
    results: {
      p10: round2(percentile(outcomes, 0.1)),
      p50: round2(percentile(outcomes, 0.5)),
      p90: round2(percentile(outcomes, 0.9)),
    },
    floorBreaches,
    floorBreachRate: Math.round((floorBreaches / iterations) * 1000) / 1000,
    worstCase: round2(outcomes[0]),
    bestCase: round2(outcomes[outcomes.length - 1]),
  };
}

export function totalExposure(positions = []) {
  return (Array.isArray(positions) ? positions : [])
    .map(normalizePosition)
    .filter(Boolean)
    .reduce((sum, p) => sum + p.stake, 0);
}

export function shouldShowStressPreview({ bankroll, positions, thresholdPct = 0.25 } = {}) {
  const br = num(bankroll);
  if (br <= 0) return false;
  const exposure = totalExposure(positions);
  return exposure / br >= thresholdPct;
}
