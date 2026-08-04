import { analyzeExposureClusters } from "./exposureClusters.js";

function num(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function daysOld(value, now = new Date()) {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.max(0, Math.floor((now.getTime() - time) / 86400000));
}

export function computeDisciplineScore(appData = {}, now = new Date()) {
  const workflows = Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [];
  const feedback = Array.isArray(appData.resultFeedback) ? appData.resultFeedback : [];
  const bets = Array.isArray(appData.bets) ? appData.bets : [];
  const bankroll = num(appData.bankroll);
  const settled = feedback.filter((entry) => String(entry.status || "").toLowerCase() === "settled");
  const skipped = feedback.filter((entry) => String(entry.status || "").toLowerCase() === "skipped");
  const closedCount = settled.length + skipped.length;
  const feedbackCoverage = feedback.length ? closedCount / feedback.length : 0;
  const openBets = bets.filter((bet) => ["", "open", "pending"].includes(String(bet.status || "").toLowerCase()));
  const openStake = openBets.reduce((sum, bet) => sum + num(bet.stake), 0);
  const concentration = analyzeExposureClusters(openBets);
  const exposureRatio = bankroll > 0 ? openStake / bankroll : 0;
  const staleOpenBets = openBets.filter((bet) => daysOld(bet.updatedAt || bet.createdAt || bet.date, now) >= 7);
  const repeatVotes = feedback.filter((entry) => ["yes", "maybe", "no"].includes(String(entry.wouldRepeat || "").toLowerCase()));
  const frictionCaptured = feedback.filter((entry) => entry.skipReason || entry.frictionReason || entry.note);
  const workflowClosure = workflows.length ? closedCount / Math.max(workflows.length, closedCount) : feedbackCoverage;

  let score = 35;
  score += Math.min(25, feedbackCoverage * 25);
  score += Math.min(15, workflowClosure * 15);
  score += Math.min(10, repeatVotes.length * 2);
  score += Math.min(10, frictionCaptured.length * 2);
  if (bankroll > 0) score += 5;
  if (exposureRatio > 0.3) score -= 20;
  else if (exposureRatio > 0.2) score -= 12;
  else if (exposureRatio > 0.1) score -= 5;
  score -= Math.min(15, staleOpenBets.length * 5);

  const normalized = Math.max(0, Math.min(100, Math.round(score)));
  const band =
    normalized >= 85 ? "Elite" :
    normalized >= 70 ? "Controlled" :
    normalized >= 50 ? "Building" :
    "Loose";
  const tone =
    normalized >= 85 ? "elite" :
    normalized >= 70 ? "healthy" :
    normalized >= 50 ? "watch" :
    "risk";
  const next =
    staleOpenBets.length ? "Settle stale open bets first." :
    bankroll <= 0 ? "Set a bankroll anchor." :
    feedbackCoverage < 0.6 ? "Record placed, skipped, or settled outcomes." :
    concentration.hasConcentration ? "Review the largest shared exposure cluster before adding volume." :
    exposureRatio > 0.2 ? "Reduce open exposure before adding volume." :
    "Keep closing loops before adding new promos.";

  return {
    score: normalized,
    band,
    tone,
    next,
    feedbackCoverage: Math.round(feedbackCoverage * 100),
    openStake,
    exposurePct: bankroll > 0 ? Math.round(exposureRatio * 100) : null,
    staleOpenBetCount: staleOpenBets.length,
    closedCount,
    concentration,
  };
}
