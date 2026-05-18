const MS_PER_DAY = 86400000;

function asTime(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function buildDecisionJournal(appData = {}, opts = {}) {
  const now = opts.now instanceof Date ? opts.now.getTime() : Number.isFinite(opts.now) ? opts.now : Date.now();
  const yStart = startOfDay(now) - MS_PER_DAY;
  const yEnd = startOfDay(now);

  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const bets = Array.isArray(appData.bets) ? appData.bets : [];

  const inWindow = (t) => t >= yStart && t < yEnd;

  const yEntries = feedback.filter((e) => inWindow(asTime(e.createdAt || e.settledAt || e.updatedAt)));
  const executed = yEntries.filter((e) => String(e.status || "").toLowerCase() === "settled");
  const skipped = yEntries.filter((e) => String(e.status || "").toLowerCase() === "skipped");

  const wins = executed.filter((e) => num(e.profit ?? e.netProfit ?? e.outcome) > 0).length;
  const losses = executed.filter((e) => num(e.profit ?? e.netProfit ?? e.outcome) < 0).length;
  const netProfit = executed.reduce((s, e) => s + num(e.profit ?? e.netProfit ?? e.outcome), 0);

  const yBets = bets.filter((b) => inWindow(asTime(b.createdAt || b.placedAt)));

  if (!yEntries.length && !yBets.length) {
    return {
      date: new Date(yStart).toISOString().slice(0, 10),
      hasActivity: false,
      lines: ["No tracked activity yesterday."],
      stats: { executed: 0, skipped: 0, wins: 0, losses: 0, netProfit: 0 },
    };
  }

  const profitStr = netProfit === 0
    ? "$0"
    : `${netProfit > 0 ? "+" : "-"}$${Math.abs(netProfit).toFixed(2)}`;

  const line1 = `Executed ${executed.length} promos (${wins}W/${losses}L, net ${profitStr}); skipped ${skipped.length}.`;

  // Edge profile delta: compare last 7d vs prior 7d avg outcome
  const last7Start = startOfDay(now) - 7 * MS_PER_DAY;
  const prior7Start = startOfDay(now) - 14 * MS_PER_DAY;
  const inLast7 = feedback.filter((e) => {
    const t = asTime(e.createdAt || e.settledAt);
    return t >= last7Start && t < startOfDay(now);
  }).filter((e) => String(e.status || "").toLowerCase() === "settled");
  const inPrior7 = feedback.filter((e) => {
    const t = asTime(e.createdAt || e.settledAt);
    return t >= prior7Start && t < last7Start;
  }).filter((e) => String(e.status || "").toLowerCase() === "settled");
  const avg = (arr) => (arr.length ? arr.reduce((s, e) => s + num(e.profit ?? e.netProfit ?? e.outcome), 0) / arr.length : 0);
  const delta = avg(inLast7) - avg(inPrior7);
  const deltaStr = delta === 0
    ? "edge profile flat"
    : `edge profile ${delta > 0 ? "up" : "down"} $${Math.abs(delta).toFixed(2)}/promo vs prior 7d`;

  const line2 = `Last 7d ${deltaStr}.`;

  return {
    date: new Date(yStart).toISOString().slice(0, 10),
    hasActivity: true,
    lines: [line1, line2],
    stats: { executed: executed.length, skipped: skipped.length, wins, losses, netProfit, edgeDelta: delta },
  };
}
