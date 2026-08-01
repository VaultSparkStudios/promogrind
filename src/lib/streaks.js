import { parseRealizedOutcomeValue } from "./realizedOutcome.js";

function dayStr(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function addDays(dateStr, delta) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function bestStreakFromSet(reviewDays) {
  if (!reviewDays.size) return 0;
  const days = [...reviewDays].sort();
  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (days[i] === addDays(days[i - 1], 1)) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export function computeStreak(appData = {}, now = new Date()) {
  const todayStr = dayStr(now);
  if (!todayStr) return { current: 0, best: 0, activeToday: false, consistency: 0, reviewedDays: 0 };

  const reviewDays = new Set();
  let settledReviews = 0;
  let reasonedSkips = 0;
  let ledgerReviews = 0;

  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  for (const entry of feedback) {
    const settled = entry.status === "settled" && parseRealizedOutcomeValue(entry.actualProfit) !== null;
    const reasonedSkip = entry.status === "skipped" && Boolean(String(entry.skipReason || "").trim());
    if (settled || reasonedSkip) {
      const d = dayStr(entry.updatedAt || entry.createdAt);
      if (d) reviewDays.add(d);
      if (settled) settledReviews += 1;
      if (reasonedSkip) reasonedSkips += 1;
    }
  }

  const ledger = Array.isArray(appData.ledger) ? appData.ledger : [];
  for (const entry of ledger) {
    if (parseRealizedOutcomeValue(entry.profit) !== null) {
      const d = dayStr(entry.date);
      if (d) reviewDays.add(d);
      ledgerReviews += 1;
    }
  }

  const best = bestStreakFromSet(reviewDays);
  const activeToday = reviewDays.has(todayStr);
  const sortedDays = [...reviewDays].sort();
  const lastActiveDay = sortedDays.at(-1) || null;
  const firstActiveDay = sortedDays[0] || null;
  const spanDays = firstActiveDay
    ? Math.max(1, Math.floor((new Date(`${todayStr}T00:00:00Z`) - new Date(`${firstActiveDay}T00:00:00Z`)) / 86400000) + 1)
    : 0;
  const consistency = spanDays ? Math.min(100, Math.round((reviewDays.size / spanDays) * 100)) : 0;

  // A cadence remains current through the following day; it rewards completed
  // review evidence, never profit sign, login frequency, or modeled outcomes.
  const streakAnchor = activeToday ? todayStr : reviewDays.has(addDays(todayStr, -1)) ? addDays(todayStr, -1) : null;
  const evidence = { settledReviews, reasonedSkips, ledgerReviews };
  if (!streakAnchor) return { current: 0, best, activeToday, lastActiveDay, firstActiveDay, consistency, reviewedDays: reviewDays.size, evidence };

  let current = 0;
  let cursor = streakAnchor;
  while (reviewDays.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, best, activeToday, lastActiveDay, firstActiveDay, consistency, reviewedDays: reviewDays.size, evidence };
}

export function streakEmoji(streak) {
  return streak >= 3 ? "◆" : null;
}

export function streakLabel(streak) {
  if (!streak) return null;
  return streak === 1 ? "1-day review cadence" : `${streak}-day review cadence`;
}

export function streakMilestone(streak) {
  const milestones = [3, 7, 14, 30, 60, 100];
  return milestones.find((m) => streak === m) ?? null;
}
