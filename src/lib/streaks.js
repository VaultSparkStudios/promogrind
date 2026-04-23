function toNumber(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

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

function bestStreakFromSet(profitDays) {
  if (!profitDays.size) return 0;
  const days = [...profitDays].sort();
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
  if (!todayStr) return { current: 0, best: 0, activeToday: false };

  const profitDays = new Set();

  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  for (const entry of feedback) {
    if (entry.status === "settled") {
      const profit = toNumber(entry.actualProfit) ?? toNumber(entry.expectedProfit) ?? 0;
      if (profit > 0) {
        const d = dayStr(entry.updatedAt || entry.createdAt);
        if (d) profitDays.add(d);
      }
    }
  }

  const ledger = Array.isArray(appData.ledger) ? appData.ledger : [];
  for (const entry of ledger) {
    const profit = toNumber(entry.profit) ?? 0;
    if (profit > 0) {
      const d = dayStr(entry.date);
      if (d) profitDays.add(d);
    }
  }

  const best = bestStreakFromSet(profitDays);
  const activeToday = profitDays.has(todayStr);
  const lastActiveDay = profitDays.size > 0 ? [...profitDays].sort().at(-1) : null;

  // Streak is active if today OR yesterday has profit (allows one check-in per day)
  const streakAnchor = activeToday ? todayStr : profitDays.has(addDays(todayStr, -1)) ? addDays(todayStr, -1) : null;
  if (!streakAnchor) return { current: 0, best, activeToday, lastActiveDay };

  let current = 0;
  let cursor = streakAnchor;
  while (profitDays.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  return { current, best, activeToday, lastActiveDay };
}

export function streakEmoji(streak) {
  if (streak >= 30) return "🔥🔥🔥";
  if (streak >= 14) return "🔥🔥";
  if (streak >= 3) return "🔥";
  return null;
}

export function streakLabel(streak) {
  if (!streak) return null;
  return streak === 1 ? "1-day streak" : `${streak}-day streak`;
}

export function streakMilestone(streak) {
  const milestones = [3, 7, 14, 30, 60, 100];
  return milestones.find((m) => streak === m) ?? null;
}
