/**
 * Kelly-fraction sandbox: replay user's settled history with a different
 * stake-sizing policy and report what bankroll trajectory would have resulted.
 *
 * Model:
 *   - Per settled bet, compute the implied edge from (american odds + outcome).
 *   - Recommended stake = max(0, kelly * bankroll * edge_fraction).
 *   - Apply outcome at the recommended stake (linearly rescaled from the
 *     user's actual stake → recommended stake) to estimate counterfactual P&L.
 *
 * This is an educational simulator, not a guarantee. We deliberately use
 * the user's own outcomes — no synthetic probability inference — so the
 * comparison is grounded in their actual history.
 */

function num(v) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function americanToImpliedProb(odds) {
  const o = num(odds);
  if (!o) return 0;
  if (o > 0) return 100 / (o + 100);
  return -o / (-o + 100);
}

function americanToDecimal(odds) {
  const o = num(odds);
  if (!o) return 1;
  return o > 0 ? 1 + o / 100 : 1 + 100 / -o;
}

/**
 * Given a history of settled bets with { stake, odds, profit }, simulate
 * the bankroll trajectory under fraction-k Kelly sizing.
 *
 * @param {Array} history  array of { stake, odds, profit, edge?, createdAt? }
 * @param {number} kFraction  0..1 (0.25 = quarter Kelly)
 * @param {object} opts { startingBankroll: 1000 }
 */
export function simulateKellyFraction(history = [], kFraction = 0.5, opts = {}) {
  const k = Math.max(0, Math.min(1, num(kFraction)));
  let bankroll = Number.isFinite(opts.startingBankroll) ? opts.startingBankroll : 1000;
  const startingBankroll = bankroll;
  const trajectory = [];
  let totalStaked = 0;
  let totalProfit = 0;
  let wins = 0;
  let losses = 0;

  for (const entry of Array.isArray(history) ? history : []) {
    const actualStake = num(entry.stake);
    if (actualStake <= 0) continue;
    const profit = num(entry.profit);
    const odds = num(entry.odds);
    const decOdds = americanToDecimal(odds);
    const b = Math.max(0.01, decOdds - 1);
    const pImplied = americanToImpliedProb(odds);
    // Use user-provided edge if present, else assume zero edge (true Kelly = 0).
    const userEdge = num(entry.edge);
    const p = Math.max(0, Math.min(1, pImplied + userEdge));
    const q = 1 - p;
    // Kelly fraction of bankroll: f* = (bp - q) / b
    const fStar = (b * p - q) / b;
    const stake = Math.max(0, Math.min(bankroll, k * fStar * bankroll));
    if (stake <= 0) {
      trajectory.push({ bankroll, stake: 0, profit: 0 });
      continue;
    }
    // Scale the actual outcome linearly to the new stake size.
    const scaledProfit = actualStake === 0 ? 0 : (profit / actualStake) * stake;
    bankroll += scaledProfit;
    totalStaked += stake;
    totalProfit += scaledProfit;
    if (scaledProfit > 0) wins += 1;
    else if (scaledProfit < 0) losses += 1;
    trajectory.push({ bankroll, stake, profit: scaledProfit });
  }

  return {
    kFraction: k,
    startingBankroll,
    endingBankroll: bankroll,
    netProfit: bankroll - startingBankroll,
    totalStaked,
    totalProfit,
    wins,
    losses,
    samples: trajectory.length,
    trajectory,
    roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
  };
}

export function compareKellyFractions(history = [], fractions = [0.25, 0.5, 1.0], opts = {}) {
  return fractions.map((k) => simulateKellyFraction(history, k, opts));
}
