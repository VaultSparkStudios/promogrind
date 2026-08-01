// Daily review actions — 3 deterministic evidence prompts seeded from the date.

const POOL = [
  { id: 'log_ledger',     label: 'Log a result',          desc: 'Record a P&L entry in the Ledger',        nav: '/ledger',          check: (d, date) => (d.ledger||[]).some(e => (e.date||'').slice(0,10) === date) },
  { id: 'rate_settle',    label: 'Rate a settlement',     desc: 'Provide feedback on a settled bet',       nav: '/sportsbooks',      check: (d, date) => (d.resultFeedback||[]).some(f => f.status==='settled' && (f.updatedAt||f.createdAt||'').slice(0,10) === date) },
  { id: 'add_workflow',   label: 'Queue an action',       desc: 'Add an item to your Workflow Inbox',      nav: '/dashboard',        check: (d, date) => (d.workflowInbox||[]).some(w => (w.createdAt||'').slice(0,10) === date) },
  { id: 'add_bet',        label: 'Track an open bet',     desc: 'Add a bet to the Open Bets tracker',      nav: '/dashboard',        check: (d, date) => (d.bets||[]).some(b => (b.createdAt||b.date||'').slice(0,10) === date) },
  { id: 'run_bonus',      label: 'Convert a bonus bet',   desc: 'Use the Bonus Bet Calculator',            nav: '/bonus-bet',        check: () => todayFlag('pg_used_bonus_bet') },
  { id: 'run_arb',        label: 'Review an arb',         desc: 'Use the Arb 2-Way Calculator',            nav: '/arb-2way',         check: () => todayFlag('pg_used_arb') },
  { id: 'run_boost',      label: 'Size a profit boost',   desc: 'Use the Profit Boost Calculator',         nav: '/profit-boost',     check: () => todayFlag('pg_used_boost') },
  { id: 'run_kelly',      label: 'Size with Kelly',       desc: 'Use the Kelly Criterion Calculator',      nav: '/kelly',            check: () => todayFlag('pg_used_kelly') },
  { id: 'open_advisor',   label: 'Consult the Advisor',   desc: 'Open the AI Promo Advisor',               nav: '/promo-advisor',    check: () => todayFlag('pg_advisor_opened') },
  { id: 'check_insights', label: 'Review outcomes',       desc: 'Inspect realized performance in Track Insights', nav: '/edge-dashboard', check: () => todayFlag('pg_insights_visited') },
  { id: 'check_brief',    label: 'Read your brief',       desc: 'Open the Daily Brief',                    nav: '/daily-brief',      check: () => todayFlag('pg_brief_visited') },
  { id: 'mark_book',      label: 'Update a book',         desc: 'Change a sportsbook status in Tracker',   nav: '/sportsbooks',      check: () => todayFlag('pg_book_updated') },
  { id: 'run_nv',         label: 'Find fair odds',        desc: 'Use the No-Vig Calculator',               nav: '/no-vig',           check: () => todayFlag('pg_used_novig') },
  { id: 'set_bankroll',   label: 'Set your bankroll',     desc: 'Enter your current bankroll on the dashboard', nav: '/dashboard',  check: (d) => !!(d.bankroll || getFlag('pg_bankroll')) },
  { id: 'run_first_bet',  label: 'Analyze a first bet',   desc: 'Use the First Bet Safety Net Calculator', nav: '/first-bet',        check: () => todayFlag('pg_used_first_bet') },
];

function todayStr() { return new Date().toISOString().slice(0, 10); }

function todayFlag(key) {
  try { return localStorage.getItem(key) === todayStr(); } catch { return false; }
}

function getFlag(key) {
  try { return localStorage.getItem(key) || ''; } catch { return ''; }
}

// Lightweight seeded PRNG (LCG) so same date always yields same 3 missions
function seededShuffle(arr, seed) {
  const out = [...arr];
  let s = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function dateSeed(dateStr) {
  return dateStr.replace(/-/g, '').split('').reduce((a, c) => Math.imul(a, 31) + c.charCodeAt(0) | 0, 1) >>> 0;
}

export function getDailyMissions(appData = {}, date = todayStr()) {
  const shuffled = seededShuffle(POOL, dateSeed(date));
  return shuffled.slice(0, 3).map(m => ({
    ...m,
    completed: isMissionCompleted(m.id, date),
    eligible: m.check(appData, date),
  }));
}

export function isMissionCompleted(missionId, date = todayStr()) {
  try {
    const data = JSON.parse(localStorage.getItem('pg_missions') || '{}');
    return Array.isArray(data[date]) && data[date].includes(missionId);
  } catch { return false; }
}

export function completeMission(missionId, date = todayStr()) {
  try {
    const data = JSON.parse(localStorage.getItem('pg_missions') || '{}');
    if (!Array.isArray(data[date])) data[date] = [];
    if (!data[date].includes(missionId)) {
      data[date].push(missionId);
      localStorage.setItem('pg_missions', JSON.stringify(data));
    }
    return true;
  } catch { return false; }
}

// Mark a calculator-specific flag for mission detection
export function flagCalcUsed(slug) {
  const slugMap = {
    'bonus-bet':   'pg_used_bonus_bet',
    'arb-2way':    'pg_used_arb',
    'profit-boost':'pg_used_boost',
    'kelly':       'pg_used_kelly',
    'no-vig':      'pg_used_novig',
    'first-bet':   'pg_used_first_bet',
  };
  const key = slugMap[slug];
  if (key) try { localStorage.setItem(key, todayStr()); } catch {}
}

// Mark a page/feature visit for mission detection
export function flagVisit(feature) {
  const flagMap = {
    'advisor':   'pg_advisor_opened',
    'insights':  'pg_insights_visited',
    'brief':     'pg_brief_visited',
    'book':      'pg_book_updated',
  };
  const key = flagMap[feature];
  if (key) try { localStorage.setItem(key, todayStr()); } catch {}
}

export const MISSION_POOL = POOL;
