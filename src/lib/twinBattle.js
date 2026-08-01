import { realizedOutcomeValue } from "./realizedOutcome.js";

// Counterfactual Twin Battle (S92 audit #6).
//
// Three-way weekly P&L scorecard:
//   you           — actual settled net P&L over the last 7 days
//   twin          — projection from the operator's top-quartile day in
//                   the trailing 28d baseline, scaled to 7d (a fair
//                   "best version of you" floor, not absolute fantasy)
//   disciplineTwin — net P&L if the operator had executed every settled
//                    positive entry AND avoided every red-flagged entry
//
// Returns a sober delta with no medals/streaks. The largest gap-creating
// decision is surfaced so the user has a concrete review target.

const MS_PER_DAY = 86400000;

function asTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

const profitOf = (entry) => realizedOutcomeValue(entry);

function withinDays(entry, now, days) {
  const t = asTime(entry?.settledAt || entry?.updatedAt || entry?.createdAt);
  return t >= now - days * MS_PER_DAY && t <= now;
}

function topQuartileDayPnL(entries, now) {
  const byDay = new Map();
  for (const e of entries) {
    const t = asTime(e.settledAt || e.updatedAt || e.createdAt);
    if (!t) continue;
    if (String(e.status || "").toLowerCase() !== "settled") continue;
    const key = Math.floor(t / MS_PER_DAY);
    byDay.set(key, (byDay.get(key) || 0) + profitOf(e));
  }
  const days = Array.from(byDay.values()).sort((a, b) => b - a);
  if (!days.length) return 0;
  const quartileIdx = Math.max(0, Math.floor(days.length / 4) - 1);
  return days[quartileIdx];
}

function largestGapDecision(entries, disciplineNet) {
  // Find the single settled loss that, if avoided, would have closed the
  // most ground. Reports its id + amount.
  const losses = entries
    .filter((e) => String(e.status || "").toLowerCase() === "settled" && profitOf(e) < 0)
    .sort((a, b) => profitOf(a) - profitOf(b));
  if (!losses.length) return null;
  const worst = losses[0];
  return {
    id: worst.id || worst.entryId || null,
    book: worst.book || null,
    promo: worst.promoType || worst.promo || null,
    profit: profitOf(worst),
    contribution: Math.round(Math.abs(profitOf(worst)) * 100) / 100,
  };
}

export function buildTwinBattle(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const redFlags = appData.redFlags && typeof appData.redFlags === "object" ? appData.redFlags : {};

  const last7 = feedback.filter((e) => withinDays(e, now, 7));
  const last28 = feedback.filter((e) => withinDays(e, now, 28));

  const you = last7
    .filter((e) => String(e.status || "").toLowerCase() === "settled")
    .reduce((sum, e) => sum + profitOf(e), 0);

  const twin = topQuartileDayPnL(last28, now) * 7;

  const disciplineWins = last7
    .filter((e) => String(e.status || "").toLowerCase() === "settled" && profitOf(e) > 0)
    .reduce((sum, e) => sum + profitOf(e), 0);

  const avoidedLosses = last7
    .filter((e) => {
      const isLoss = String(e.status || "").toLowerCase() === "settled" && profitOf(e) < 0;
      if (!isLoss) return false;
      const idFlag = e.id && redFlags[e.id];
      const promoFlag = e.promoType && redFlags[e.promoType];
      const bookFlag = e.book && redFlags[e.book];
      return Boolean(idFlag || promoFlag || bookFlag);
    })
    .reduce((sum, e) => sum + Math.abs(profitOf(e)), 0);

  const disciplineTwin = disciplineWins + avoidedLosses;

  const sample = last7.length;
  if (sample === 0) {
    return {
      empty: true,
      sample: 0,
      you: 0,
      twin: 0,
      disciplineTwin: 0,
      leaderboard: [],
      review: null,
    };
  }

  const round2 = (n) => Math.round(n * 100) / 100;
  const board = [
    { name: "you", pnl: round2(you) },
    { name: "twin", pnl: round2(twin) },
    { name: "disciplineTwin", pnl: round2(disciplineTwin) },
  ].sort((a, b) => b.pnl - a.pnl);

  return {
    empty: false,
    sample,
    windowDays: 7,
    you: round2(you),
    twin: round2(twin),
    disciplineTwin: round2(disciplineTwin),
    leaderboard: board,
    delta: {
      twinVsYou: round2(twin - you),
      disciplineVsYou: round2(disciplineTwin - you),
    },
    review: largestGapDecision(last7, disciplineTwin),
  };
}
