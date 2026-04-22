// Settlement Mastery Ladder — per-promo-type skill progression + global operator rank

const TYPE_ALIASES = {
  bonus: 'bonus_bet', bonus_bet: 'bonus_bet', free_bet: 'bonus_bet', freebet: 'bonus_bet',
  profit_boost: 'profit_boost', odds_boost: 'profit_boost', boost: 'profit_boost',
  safety: 'safety_net', safety_net: 'safety_net', first_bet: 'safety_net',
  insurance: 'insurance', sgp_insurance: 'insurance', parlay_insurance: 'insurance',
  deposit_match: 'deposit_match', reload_match: 'deposit_match',
  parlay: 'parlay', sgp: 'parlay',
  arb: 'arb', arbitrage: 'arb',
  other: 'other',
};

export const PROMO_TYPE_KEYS = ['bonus_bet', 'profit_boost', 'safety_net', 'deposit_match', 'insurance', 'parlay', 'arb', 'other'];

export const PROMO_LABELS = {
  bonus_bet: 'Bonus Bet', profit_boost: 'Profit Boost', safety_net: 'Safety Net',
  deposit_match: 'Deposit Match', insurance: 'Insurance', parlay: 'Parlay',
  arb: 'Arbitrage', other: 'Other',
};

// Level thresholds (verified settlements per promo type)
export const MASTERY_LEVELS = [
  { name: 'Shark',    minXp: 30 },
  { name: 'Closer',   minXp: 15 },
  { name: 'Executor', minXp: 5  },
  { name: 'Analyst',  minXp: 0  },
];

// XP needed to reach next level (null = max)
export const MASTERY_NEXT_XP = { Analyst: 5, Executor: 15, Closer: 30, Shark: null };

export const MASTERY_COLOR = {
  Analyst:  '#7a8fa8',
  Executor: '#4ade80',
  Closer:   '#60a5fa',
  Shark:    '#c084fc',
};

export const MASTERY_RANK = { Analyst: 0, Executor: 1, Closer: 2, Shark: 3 };

// Global operator rank based on total extracted profit
export const GLOBAL_RANKS = [
  { name: 'The House', min: 10000, color: '#fbbf24' },
  { name: 'Shark',     min: 5000,  color: '#c084fc' },
  { name: 'Closer',    min: 1000,  color: '#60a5fa' },
  { name: 'Grinder',   min: 100,   color: '#4ade80' },
  { name: 'Novice',    min: 0,     color: '#7a8fa8' },
];

function normalizeType(type) {
  return TYPE_ALIASES[String(type || '').toLowerCase()] || 'other';
}

function getMasteryLevel(xp) {
  for (const l of MASTERY_LEVELS) {
    if (xp >= l.minXp) return l.name;
  }
  return 'Analyst';
}

export function computeMastery(appData = {}) {
  const ledger = Array.isArray(appData.ledger) ? appData.ledger : [];
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];

  const totalProfit = ledger.reduce((s, e) => s + (parseFloat(e.profit) || 0), 0);
  const globalRank = GLOBAL_RANKS.find(r => totalProfit >= r.min) || GLOBAL_RANKS[GLOBAL_RANKS.length - 1];

  // XP from settled resultFeedback (1 XP each) + ledger entries with profit (0.5 XP each)
  const rawXp = {};
  const accuracyMap = {};

  for (const entry of feedback) {
    if (entry.status !== 'settled') continue;
    const key = normalizeType(entry.promoType);
    rawXp[key] = (rawXp[key] || 0) + 1;

    const actual = parseFloat(entry.actualProfit);
    const expected = parseFloat(entry.expectedProfit);
    if (!isNaN(actual) && !isNaN(expected) && expected > 0) {
      if (!accuracyMap[key]) accuracyMap[key] = { total: 0, hit: 0 };
      accuracyMap[key].total++;
      if (Math.abs(actual - expected) / expected <= 0.10) accuracyMap[key].hit++;
    }
  }

  for (const entry of ledger) {
    if ((parseFloat(entry.profit) || 0) > 0) {
      const key = normalizeType(entry.type);
      rawXp[key] = (rawXp[key] || 0) + 0.5;
    }
  }

  const perType = {};
  for (const key of PROMO_TYPE_KEYS) {
    const xp = Math.floor(rawXp[key] || 0);
    const level = getMasteryLevel(xp);
    const nextXp = MASTERY_NEXT_XP[level];
    const acc = accuracyMap[key];
    const accuracy = acc ? Math.round((acc.hit / acc.total) * 100) : null;
    const prevXp = MASTERY_LEVELS.find(l => l.name === level)?.minXp ?? 0;
    const xpInLevel = xp - prevXp;
    const xpNeeded = nextXp != null ? nextXp - prevXp : 1;
    const levelPct = nextXp != null ? Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) : 100;
    perType[key] = { label: PROMO_LABELS[key], level, xp, nextXp, accuracy, levelPct };
  }

  return { globalRank, totalProfit, perType };
}
