import { computeDisciplineScore } from "./discipline.js";

const SEASON_LENGTH_DAYS = 14;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function toDate(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function dateOnly(date) {
  return toDate(date).toISOString().slice(0, 10);
}

function daysSinceEpoch(date) {
  return Math.floor(toDate(date).getTime() / MS_PER_DAY);
}

export function getActiveSeasonWindow(now = new Date()) {
  const dayIndex = daysSinceEpoch(now);
  const seasonIndex = Math.floor(dayIndex / SEASON_LENGTH_DAYS);
  const start = new Date(seasonIndex * SEASON_LENGTH_DAYS * MS_PER_DAY);
  const end = new Date((seasonIndex + 1) * SEASON_LENGTH_DAYS * MS_PER_DAY);
  return {
    id: `season-${seasonIndex}`,
    label: `Discipline Season ${seasonIndex}`,
    startDate: dateOnly(start),
    endDate: dateOnly(new Date(end.getTime() - MS_PER_DAY)),
    day: Math.min(SEASON_LENGTH_DAYS, Math.max(1, dayIndex - seasonIndex * SEASON_LENGTH_DAYS + 1)),
    lengthDays: SEASON_LENGTH_DAYS,
  };
}

function inWindow(value, window) {
  const day = dateOnly(value);
  return day >= window.startDate && day <= window.endDate;
}

export function buildOperatorSeason(appData = {}, now = new Date()) {
  const window = getActiveSeasonWindow(now);
  const feedback = (appData.resultFeedback || []).filter((entry) =>
    inWindow(entry.updatedAt || entry.createdAt || entry.date || now, window)
  );
  const settled = feedback.filter((entry) => entry.status === "settled").length;
  const skipped = feedback.filter((entry) => entry.status === "skipped").length;
  const repeatVotes = feedback.filter((entry) => entry.wouldRepeat).length;
  const openBets = (appData.bets || []).filter((bet) => ["open", "pending"].includes(String(bet.status || "").toLowerCase()));
  const bankrollSet = Boolean(appData.bankroll || appData.bankroll === 0);
  const discipline = computeDisciplineScore(appData, now);

  const targets = [
    { id: "closed_loops", label: "Closed loops", value: settled + skipped, goal: 6 },
    { id: "settlements", label: "Settlements", value: settled, goal: 3 },
    { id: "repeat_votes", label: "Repeat votes", value: repeatVotes, goal: 3 },
    { id: "bankroll_context", label: "Bankroll context", value: bankrollSet ? 1 : 0, goal: 1 },
    { id: "open_cleanup", label: "Open bet cleanup", value: openBets.length === 0 ? 1 : 0, goal: 1 },
  ].map((target) => ({
    ...target,
    pct: target.goal > 0 ? Math.min(100, Math.round((target.value / target.goal) * 100)) : 0,
    complete: target.value >= target.goal,
  }));

  const targetPoints = targets.reduce((sum, target) => sum + Math.min(1, target.value / target.goal), 0);
  const targetScore = Math.round((targetPoints / targets.length) * 70);
  const disciplineBonus = Math.round(Math.min(30, discipline.score * 0.3));
  const completedTargets = targets.filter((target) => target.complete).length;
  const completionBonus = completedTargets === targets.length ? 10 : 0;
  const score = Math.min(100, targetScore + disciplineBonus + completionBonus);

  let band = "Build";
  if (score >= 85) band = "Elite";
  else if (score >= 65) band = "Sharp";
  else if (score >= 40) band = "Stable";

  const nextTarget = targets.find((target) => !target.complete);
  return {
    ...window,
    score,
    band,
    disciplineScore: discipline.score,
    targets,
    closedLoops: settled + skipped,
    openBetCount: openBets.length,
    next: nextTarget
      ? `${nextTarget.label}: ${nextTarget.value}/${nextTarget.goal}`
      : "Season contract complete",
  };
}
