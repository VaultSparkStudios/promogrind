import { computeDisciplineScore } from "./discipline.js";

const CALC_WINDOW_MS = 15 * 60 * 1000;
const RAPID_FIRE_THRESHOLD = 4;
const LOSING_STREAK_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 60 * 1000;

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function recentLaunches(history, now) {
  if (!Array.isArray(history)) return [];
  const cutoff = now - CALC_WINDOW_MS;
  return history.filter((entry) => {
    const t = asTime(entry && (entry.ts || entry.at || entry.timestamp || entry.time));
    return t > 0 && t >= cutoff;
  });
}

function losingStreak(feedback) {
  if (!Array.isArray(feedback)) return 0;
  const settled = feedback
    .filter((entry) => String(entry.status || "").toLowerCase() === "settled")
    .slice()
    .sort((a, b) => asTime(b.settledAt || b.updatedAt || b.createdAt) - asTime(a.settledAt || a.updatedAt || a.createdAt));
  let streak = 0;
  for (const entry of settled) {
    const profit = num(entry.profit ?? entry.netProfit ?? entry.outcome);
    if (profit < 0) streak += 1;
    else break;
  }
  return streak;
}

export function computeTiltState(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const launches = recentLaunches(appData.calcLaunchHistory, now);
  const streak = losingStreak(appData.resultFeedback);
  const discipline = computeDisciplineScore(appData, new Date(now));
  const exposurePct = discipline.exposurePct ?? 0;

  const rapidFire = launches.length >= RAPID_FIRE_THRESHOLD;
  const losing = streak >= LOSING_STREAK_THRESHOLD;
  const overExposed = exposurePct >= 20;

  const signals = [];
  if (rapidFire) signals.push({ key: "rapidFire", label: `${launches.length} calculators opened in last 15 min` });
  if (losing) signals.push({ key: "losingStreak", label: `${streak} settled losses in a row` });
  if (overExposed) signals.push({ key: "overExposed", label: `Open exposure ${exposurePct}% of bankroll` });

  const score = (rapidFire ? 2 : 0) + (losing ? 2 : 0) + (overExposed ? 1 : 0);
  const tripped = score >= 3;

  const cooldownUntil = tripped ? now + COOLDOWN_MS : null;
  const demotion = tripped ? 0.5 : 1;

  return {
    tripped,
    score,
    signals,
    demotion,
    cooldownUntil,
    cooldownMinutes: tripped ? Math.round(COOLDOWN_MS / 60000) : 0,
    nextAction: tripped
      ? "Step away for 30 minutes — promo ranking will demote impulsive lanes until then."
      : "Healthy operator cadence — no breaker active.",
  };
}

export function shouldDemotePromo(tiltState) {
  return Boolean(tiltState && tiltState.tripped);
}
