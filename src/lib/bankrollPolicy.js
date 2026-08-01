// Bankroll Policy Guard — user-defined reserve floor + per-bet and per-book exposure caps.
// Implements the "bankroll orchestration layer" from the TASK_BOARD Later list.

const POLICY_KEY = 'pg_bankroll_policy';
const SCHEMA_VERSION = 1;

export const DEFAULT_POLICY = {
  reservePct: 20,      // % of bankroll always kept in reserve, unallocated
  maxSingleBetPct: 10, // max % of bankroll on any one open bet
  maxBookPct: 30,      // max % of bankroll exposed to any single sportsbook
};

export const POLICY_BOUNDS = {
  reservePct:     { min: 0,  max: 80, step: 5  },
  maxSingleBetPct:{ min: 1,  max: 50, step: 1  },
  maxBookPct:     { min: 5,  max: 100, step: 5 },
};

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function num(v, fallback = 0) {
  const n = Number.parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizePolicyInput(raw = {}) {
  return {
    reservePct:      clamp(num(raw.reservePct,      DEFAULT_POLICY.reservePct),      POLICY_BOUNDS.reservePct.min,      POLICY_BOUNDS.reservePct.max),
    maxSingleBetPct: clamp(num(raw.maxSingleBetPct, DEFAULT_POLICY.maxSingleBetPct), POLICY_BOUNDS.maxSingleBetPct.min, POLICY_BOUNDS.maxSingleBetPct.max),
    maxBookPct:      clamp(num(raw.maxBookPct,       DEFAULT_POLICY.maxBookPct),      POLICY_BOUNDS.maxBookPct.min,      POLICY_BOUNDS.maxBookPct.max),
  };
}

export function loadBankrollPolicy() {
  try {
    const raw = JSON.parse(localStorage.getItem(POLICY_KEY) || 'null');
    if (!raw || raw.schemaVersion !== SCHEMA_VERSION) return { ...DEFAULT_POLICY };
    return normalizePolicyInput(raw);
  } catch {
    return { ...DEFAULT_POLICY };
  }
}

export function saveBankrollPolicy(policy) {
  try {
    const normalized = normalizePolicyInput(policy);
    localStorage.setItem(POLICY_KEY, JSON.stringify({ ...normalized, schemaVersion: SCHEMA_VERSION }));
    return normalized;
  } catch {
    return null;
  }
}

export function resetBankrollPolicy() {
  try { localStorage.removeItem(POLICY_KEY); } catch {}
}

function openBetStake(bet) {
  if (!bet) return 0;
  const status = String(bet.status || '').toLowerCase();
  if (status && !['open', 'pending', ''].includes(status)) return 0;
  return Math.max(0, num(bet.stake || bet.risk || bet.wager, 0));
}

export function evaluateBankrollPolicy({ policy = DEFAULT_POLICY, bankroll = 0, bets = [] } = {}) {
  const br = num(bankroll, 0);
  const pol = normalizePolicyInput(policy);
  const violations = [];

  if (br <= 0) {
    return { clean: true, violations: [], reserveFloor: 0, availableCapital: 0, policySet: true };
  }

  const reserveFloor = (pol.reservePct / 100) * br;
  const availableCapital = br - reserveFloor;

  // 1. Reserve floor: total open stake must not exceed availableCapital
  const totalStake = bets.reduce((sum, bet) => sum + openBetStake(bet), 0);
  if (totalStake > availableCapital) {
    const overBy = totalStake - availableCapital;
    violations.push({
      type: 'reserve_floor',
      severity: 'warn',
      label: `Open exposure exceeds available capital`,
      detail: `$${overBy.toFixed(2)} over the ${pol.reservePct}% reserve floor — reserved capital must stay unallocated.`,
      current: totalStake,
      limit: availableCapital,
    });
  }

  // 2. Single-bet cap: no individual open bet stake > maxSingleBetPct of bankroll
  const singleCap = (pol.maxSingleBetPct / 100) * br;
  const largestBet = bets.reduce((max, bet) => {
    const s = openBetStake(bet);
    return s > max.stake ? { stake: s, book: bet.book || 'unknown' } : max;
  }, { stake: 0, book: '' });

  if (largestBet.stake > singleCap) {
    violations.push({
      type: 'single_bet_cap',
      severity: 'warn',
      label: `Single bet exceeds ${pol.maxSingleBetPct}% cap`,
      detail: `$${largestBet.stake.toFixed(2)} on one bet vs. $${singleCap.toFixed(2)} limit.`,
      current: largestBet.stake,
      limit: singleCap,
    });
  }

  // 3. Per-book exposure cap: sum of open stakes per sportsbook
  const bookCap = (pol.maxBookPct / 100) * br;
  const byBook = {};
  for (const bet of bets) {
    const s = openBetStake(bet);
    if (s <= 0) continue;
    const book = String(bet.book || 'unknown').toLowerCase();
    byBook[book] = (byBook[book] || 0) + s;
  }
  for (const [book, exposure] of Object.entries(byBook)) {
    if (exposure > bookCap) {
      violations.push({
        type: 'book_cap',
        severity: 'warn',
        label: `${book} exposure exceeds ${pol.maxBookPct}% cap`,
        detail: `$${exposure.toFixed(2)} on ${book} vs. $${bookCap.toFixed(2)} limit.`,
        current: exposure,
        limit: bookCap,
        book,
      });
    }
  }

  return {
    clean: violations.length === 0,
    violations,
    reserveFloor,
    availableCapital,
    totalStake,
    singleCap,
    bookCap,
    policySet: true,
  };
}
