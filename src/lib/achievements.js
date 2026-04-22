// Achievement engine — 30 badges, event-driven, evaluated from appData + streak + mastery
import { MASTERY_RANK } from './mastery.js';

export const ACHIEVEMENTS = [
  // Onboarding
  { id: 'first_calc',     label: 'First Steps',        desc: 'Ran your first calculator',           icon: '🧮', category: 'start'    },
  { id: 'first_ledger',   label: 'Record Keeper',      desc: 'Logged your first P&L entry',         icon: '📒', category: 'start'    },
  { id: 'first_book',     label: 'Book One',           desc: 'Completed your first sportsbook',     icon: '✅', category: 'start'    },
  { id: 'first_workflow', label: 'In the System',      desc: 'Queued your first workflow action',   icon: '⚡', category: 'start'    },
  // Profit milestones
  { id: 'profit_1',       label: 'First Dollar',       desc: '$1+ total profit logged',             icon: '💵', category: 'profit'   },
  { id: 'profit_100',     label: '$100 Club',          desc: '$100+ total profit',                  icon: '💰', category: 'profit'   },
  { id: 'profit_500',     label: 'Five Hundred',       desc: '$500+ total profit',                  icon: '💸', category: 'profit'   },
  { id: 'profit_1000',    label: 'Grand Total',        desc: '$1,000+ total profit',                icon: '🤑', category: 'profit'   },
  { id: 'profit_5000',    label: 'Five Figure Threat', desc: '$5,000+ total profit',                icon: '🏆', category: 'profit'   },
  { id: 'profit_10000',   label: 'The House',          desc: '$10,000+ total profit',               icon: '🏛️', category: 'profit'   },
  // Book milestones
  { id: 'books_5',        label: 'Multi-Book',         desc: 'Completed 5 sportsbooks',             icon: '📚', category: 'books'    },
  { id: 'books_10',       label: 'Ten-Book Stack',     desc: 'Completed 10 sportsbooks',            icon: '📦', category: 'books'    },
  { id: 'books_20',       label: 'Full Rack',          desc: 'Completed 20 sportsbooks',            icon: '🗄️', category: 'books'    },
  // Streaks
  { id: 'streak_3',       label: 'Hat Trick',          desc: '3-day profit streak',                 icon: '🔥', category: 'streak'   },
  { id: 'streak_7',       label: 'Week Grinder',       desc: '7-day profit streak',                 icon: '🔥🔥', category: 'streak' },
  { id: 'streak_30',      label: 'Iron Grinder',       desc: '30-day profit streak',                icon: '⚔️', category: 'streak'   },
  { id: 'streak_100',     label: 'Legend',             desc: '100-day profit streak',               icon: '👑', category: 'streak'   },
  // Mastery
  { id: 'bonus_closer',   label: 'Bonus Bet Closer',   desc: 'Reached Closer on Bonus Bet',         icon: '🎯', category: 'mastery'  },
  { id: 'arb_executor',   label: 'Arb Hunter',         desc: 'Reached Executor on Arbitrage',       icon: '⚡', category: 'mastery'  },
  { id: 'boost_executor', label: 'Boost Baron',        desc: 'Reached Executor on Profit Boost',    icon: '🚀', category: 'mastery'  },
  { id: 'dep_executor',   label: 'Match Player',       desc: 'Reached Executor on Deposit Match',   icon: '🔄', category: 'mastery'  },
  { id: 'multi_lane',     label: 'All-Lane Operator',  desc: 'Reached Executor on 4+ promo types',  icon: '🌐', category: 'mastery'  },
  // Engagement
  { id: 'bets_10',        label: 'Active Bettor',      desc: 'Tracked 10+ open bets',               icon: '🎲', category: 'engage'   },
  { id: 'ledger_50',      label: 'Data Driven',        desc: '50+ ledger entries',                  icon: '📊', category: 'engage'   },
  { id: 'advisor_used',   label: 'AI Consulted',       desc: 'Used the Promo Advisor',              icon: '🤖', category: 'engage'   },
  { id: 'stack_built',    label: 'Stack Architect',    desc: 'Built an AI extraction stack',        icon: '🏗️', category: 'engage'   },
  { id: 'action_plan',    label: 'Action Oriented',    desc: 'Generated an AI Action Plan',         icon: '📋', category: 'engage'   },
  // Accuracy
  { id: 'accurate_5',     label: 'Sharp Eye',          desc: '5 settlements within 5% of calculated', icon: '🎯', category: 'accuracy' },
  { id: 'accurate_20',    label: 'Dead On',            desc: '20 settlements within 5% of calculated', icon: '🔬', category: 'accuracy' },
  // Missions
  { id: 'missions_7',     label: 'Daily Operator',     desc: 'Completed 7 days of daily missions',  icon: '📅', category: 'missions' },
];

export function evaluateAchievements(appData = {}, streak = 0, masteryData = null) {
  const ledger = Array.isArray(appData.ledger) ? appData.ledger : [];
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const bets = Array.isArray(appData.bets) ? appData.bets : [];
  const done = appData.done || {};
  const events = Array.isArray(appData.vaultEvents) ? appData.vaultEvents : [];

  const totalProfit = ledger.reduce((s, e) => s + (parseFloat(e.profit) || 0), 0);
  const booksComplete = Object.values(done).filter(Boolean).length;
  const settled = feedback.filter(f => f.status === 'settled');
  const accurateCount = settled.filter(f => {
    const a = parseFloat(f.actualProfit), x = parseFloat(f.expectedProfit);
    return !isNaN(a) && !isNaN(x) && x > 0 && Math.abs(a - x) / x <= 0.05;
  }).length;

  const hasEvent = (feature) => events.some(e => e.feature === feature || e.event_type === feature);

  // Mastery achievement checks
  let bonusCloser = false, arbExec = false, boostExec = false, depExec = false, multiLane = false;
  if (masteryData?.perType) {
    const r = (key) => MASTERY_RANK[masteryData.perType[key]?.level] ?? 0;
    bonusCloser = r('bonus_bet') >= 2;
    arbExec     = r('arb') >= 1;
    boostExec   = r('profit_boost') >= 1;
    depExec     = r('deposit_match') >= 1;
    multiLane   = Object.keys(masteryData.perType).filter(k => r(k) >= 1).length >= 4;
  }

  // Missions: count unique days with at least one mission completed
  let missionDays = 0;
  try {
    const md = JSON.parse(localStorage.getItem('pg_missions') || '{}');
    missionDays = Object.values(md).filter(v => Array.isArray(v) && v.length > 0).length;
  } catch {}

  return {
    first_calc:     Object.keys(done).length > 0 || ledger.length > 0,
    first_ledger:   ledger.length > 0,
    first_book:     booksComplete > 0,
    first_workflow: (Array.isArray(appData.workflowInbox) && appData.workflowInbox.length > 0),
    profit_1:       totalProfit >= 1,
    profit_100:     totalProfit >= 100,
    profit_500:     totalProfit >= 500,
    profit_1000:    totalProfit >= 1000,
    profit_5000:    totalProfit >= 5000,
    profit_10000:   totalProfit >= 10000,
    books_5:        booksComplete >= 5,
    books_10:       booksComplete >= 10,
    books_20:       booksComplete >= 20,
    streak_3:       streak >= 3,
    streak_7:       streak >= 7,
    streak_30:      streak >= 30,
    streak_100:     streak >= 100,
    bonus_closer:   bonusCloser,
    arb_executor:   arbExec,
    boost_executor: boostExec,
    dep_executor:   depExec,
    multi_lane:     multiLane,
    bets_10:        bets.length >= 10,
    ledger_50:      ledger.length >= 50,
    advisor_used:   hasEvent('promo_advisor'),
    stack_built:    hasEvent('stack_builder'),
    action_plan:    hasEvent('ai_action_plan'),
    accurate_5:     accurateCount >= 5,
    accurate_20:    accurateCount >= 20,
    missions_7:     missionDays >= 7,
  };
}

export function loadEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem('pg_achievements_v2') || '[]');
    // Migrate from old flat string[] format
    if (raw.length > 0 && typeof raw[0] === 'string') {
      return raw.map(id => ({ id, unlockedAt: null }));
    }
    return raw;
  } catch { return []; }
}

export function saveEarned(earned) {
  try { localStorage.setItem('pg_achievements_v2', JSON.stringify(earned)); } catch {}
}

export function getNewlyUnlocked(checks, earned) {
  const ids = new Set(earned.map(e => e.id));
  return Object.entries(checks)
    .filter(([id, met]) => met && !ids.has(id))
    .map(([id]) => ({ id, unlockedAt: new Date().toISOString() }));
}

export const ACHIEVEMENT_MAP = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
