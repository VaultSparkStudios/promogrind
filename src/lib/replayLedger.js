const REPLAY_LAG_DAYS = 14;
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

export function buildReplayInsights(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const minLagMs = REPLAY_LAG_DAYS * MS_PER_DAY;
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];

  const eligible = feedback.filter((entry) => {
    const t = asTime(entry.createdAt || entry.settledAt || entry.updatedAt);
    if (!t) return false;
    return now - t >= minLagMs;
  });

  if (!eligible.length) return { insights: [], hasEnoughHistory: false };

  const skipped = eligible.filter((e) => String(e.status || "").toLowerCase() === "skipped");
  const settled = eligible.filter((e) => String(e.status || "").toLowerCase() === "settled");
  const settledProfit = settled.reduce((sum, e) => sum + num(e.profit ?? e.netProfit ?? e.outcome), 0);
  const avgSettledProfit = settled.length ? settledProfit / settled.length : 0;
  const lossesAvoided = skipped.length * Math.max(0, -Math.min(0, avgSettledProfit));

  const insights = [];

  if (skipped.length && settled.length) {
    insights.push({
      key: "skip-vs-settle",
      tone: avgSettledProfit >= 0 ? "watch" : "healthy",
      headline:
        avgSettledProfit >= 0
          ? `Skipped ${skipped.length} promos that averaged $${avgSettledProfit.toFixed(2)} when settled.`
          : `Skipped ${skipped.length} promos when settled players averaged $${avgSettledProfit.toFixed(2)} — discipline call.`,
      detail:
        avgSettledProfit >= 0
          ? "Consider whether the skip reasons were timing or true edge. Recorded reasons are searchable in Tracker."
          : "Skipped lanes saved estimated losses; the discipline filter is working.",
    });
  }

  const byLane = new Map();
  for (const entry of settled) {
    const lane = entry.promoType || entry.lane || "other";
    if (!byLane.has(lane)) byLane.set(lane, { count: 0, profit: 0 });
    const bucket = byLane.get(lane);
    bucket.count += 1;
    bucket.profit += num(entry.profit ?? entry.netProfit ?? entry.outcome);
  }
  const bestLane = [...byLane.entries()]
    .filter(([, b]) => b.count >= 2)
    .sort((a, b) => b[1].profit / b[1].count - a[1].profit / a[1].count)[0];
  if (bestLane) {
    const [lane, bucket] = bestLane;
    insights.push({
      key: "best-lane",
      tone: "healthy",
      headline: `Best 14-day lane: ${lane} (avg $${(bucket.profit / bucket.count).toFixed(2)} over ${bucket.count} settles).`,
      detail: "Repeating proven lanes beats chasing novel ones — outcome memory confirms it.",
    });
  }

  return {
    insights,
    hasEnoughHistory: true,
    eligibleCount: eligible.length,
    skippedCount: skipped.length,
    settledCount: settled.length,
    lossesAvoided,
  };
}
