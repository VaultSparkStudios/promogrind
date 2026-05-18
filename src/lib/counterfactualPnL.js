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

function profitOf(entry) {
  return num(entry.profit ?? entry.netProfit ?? entry.outcome);
}

/**
 * Build a 7-day counterfactual P&L ribbon comparing:
 *   - actual: what the user actually earned (sum settled profit)
 *   - aiTop:  what they'd have earned if they had executed every promo
 *             where appData.aiRankings[promoId] === 1 (top pick)
 *   - skipRed: what they'd have earned if they had skipped every promo
 *             flagged red (status=settled but tagged with adverse marker)
 *
 * Inputs are read defensively so missing AI rankings simply produce zero
 * counterfactual delta rather than throwing.
 */
export function buildCounterfactualPnL(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const windowDays = Number.isFinite(opts.windowDays) ? Math.max(1, Math.min(30, opts.windowDays)) : 7;
  const since = now - windowDays * MS_PER_DAY;

  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const aiRankings = appData.aiRankings && typeof appData.aiRankings === "object" ? appData.aiRankings : {};
  const redFlags = appData.redFlags && typeof appData.redFlags === "object" ? appData.redFlags : {};

  const inWindow = feedback.filter((e) => {
    const t = asTime(e.createdAt || e.settledAt || e.updatedAt);
    return t >= since && t <= now;
  });

  const settled = inWindow.filter((e) => String(e.status || "").toLowerCase() === "settled");

  const actual = settled.reduce((s, e) => s + profitOf(e), 0);

  // Counterfactual A: only execute promos AI ranked #1 — sum their actual outcomes.
  // For skipped entries with rank 1, add the lane's average settled profit as estimator.
  const settledByLane = new Map();
  for (const e of settled) {
    const lane = e.promoType || e.lane || "other";
    if (!settledByLane.has(lane)) settledByLane.set(lane, { count: 0, profit: 0 });
    const b = settledByLane.get(lane);
    b.count += 1;
    b.profit += profitOf(e);
  }
  const laneAvg = (lane) => {
    const b = settledByLane.get(lane);
    return b && b.count ? b.profit / b.count : 0;
  };

  let aiTop = 0;
  let aiTopCount = 0;
  for (const e of inWindow) {
    const rank = aiRankings[e.promoId] ?? aiRankings[e.id];
    if (rank !== 1) continue;
    aiTopCount += 1;
    if (String(e.status || "").toLowerCase() === "settled") {
      aiTop += profitOf(e);
    } else {
      aiTop += laneAvg(e.promoType || e.lane || "other");
    }
  }

  // Counterfactual B: skip every red-flagged promo — subtract their settled losses (re-add the negatives).
  let skipRed = actual;
  let skipRedCount = 0;
  for (const e of settled) {
    const flagged = redFlags[e.promoId] || redFlags[e.id] || e.redFlag;
    if (flagged) {
      const p = profitOf(e);
      if (p < 0) {
        skipRed -= p; // would not have taken the loss
        skipRedCount += 1;
      } else {
        // skip red also means giving up wins; subtract them
        skipRed -= p;
        skipRedCount += 1;
      }
    }
  }

  const fmt = (v) => (v >= 0 ? `+$${v.toFixed(2)}` : `-$${Math.abs(v).toFixed(2)}`);

  return {
    windowDays,
    sampleSize: settled.length,
    actual,
    aiTop,
    skipRed,
    aiTopCount,
    skipRedCount,
    deltaAiTop: aiTop - actual,
    deltaSkipRed: skipRed - actual,
    summary: `Last ${windowDays}d: you earned ${fmt(actual)}. Following AI's #1 pick → ${fmt(aiTop)}. Skipping red-flagged → ${fmt(skipRed)}.`,
    hasSignal: settled.length >= 3,
  };
}
