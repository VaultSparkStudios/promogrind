import { computeDisciplineScore } from "../lib/discipline.js";

const BASELINE_WINDOW_DAYS = 28;
const RECENT_WINDOW_DAYS = 5;
const MS_PER_DAY = 86400000;

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function bucketFeedbackByDay(feedback = [], now) {
  const buckets = new Map();
  for (const entry of feedback) {
    const t = asTime(entry.settledAt || entry.updatedAt || entry.createdAt);
    if (!t) continue;
    const dayKey = Math.floor((now - t) / MS_PER_DAY);
    if (dayKey < 0 || dayKey > BASELINE_WINDOW_DAYS) continue;
    if (!buckets.has(dayKey)) buckets.set(dayKey, []);
    buckets.get(dayKey).push(entry);
  }
  return buckets;
}

function closedRatio(entries = []) {
  if (!entries.length) return 0;
  const closed = entries.filter((e) => {
    const s = String(e.status || "").toLowerCase();
    return s === "settled" || s === "skipped";
  });
  return closed.length / entries.length;
}

export function buildOperatorBaseline(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const buckets = bucketFeedbackByDay(feedback, now);
  const days = [];
  for (let d = 0; d < BASELINE_WINDOW_DAYS; d++) {
    days.push({ day: d, ratio: closedRatio(buckets.get(d) || []) });
  }
  const baseline = days.reduce((sum, d) => sum + d.ratio, 0) / BASELINE_WINDOW_DAYS;
  return { baseline, days };
}

export function buildTwinForecast(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const { baseline, days } = buildOperatorBaseline(appData, { now });
  const recent = days.slice(0, RECENT_WINDOW_DAYS);
  const recentMean = recent.reduce((s, d) => s + d.ratio, 0) / Math.max(1, recent.length);
  const drift = recentMean - baseline;
  const driftPct = Math.round(drift * 100);

  const bets = Array.isArray(appData.bets) ? appData.bets : [];
  const staleOpen = bets.filter((b) => {
    const status = String(b.status || "").toLowerCase();
    if (status && status !== "open" && status !== "pending") return false;
    const ageMs = now - asTime(b.updatedAt || b.createdAt || b.date);
    return ageMs >= MS_PER_DAY;
  }).length;

  const discipline = computeDisciplineScore(appData, new Date(now));

  let tone = "healthy";
  let headline = "Operator curve stable.";
  let detail = `Closed-loop ratio matches your 28-day baseline (${Math.round(baseline * 100)}%).`;

  if (drift <= -0.1) {
    tone = "watch";
    headline = `Operator curve down ${Math.abs(driftPct)}% this week.`;
    detail = `Recent 5 days at ${Math.round(recentMean * 100)}% close-rate vs ${Math.round(baseline * 100)}% baseline. ${staleOpen} stale open bet${staleOpen === 1 ? "" : "s"}.`;
  } else if (drift >= 0.15 && discipline.tone === "elite") {
    tone = "elite";
    headline = `Operator curve up ${driftPct}% — keep this cadence.`;
    detail = `Recent 5 days at ${Math.round(recentMean * 100)}% close-rate vs ${Math.round(baseline * 100)}% baseline.`;
  } else if (staleOpen >= 3) {
    tone = "watch";
    headline = `${staleOpen} stale open bets pulling discipline down.`;
    detail = "Settle or skip the oldest open exposures before adding volume.";
  }

  return {
    tone,
    headline,
    detail,
    baseline: Math.round(baseline * 100),
    recent: Math.round(recentMean * 100),
    driftPct,
    staleOpen,
    disciplineScore: discipline.score,
  };
}
