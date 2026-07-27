// Operator Command Deck (S113 audit #1).
//
// One index over every operator-intelligence module: what decision it
// helps, its live personal status derived from the module's own lib,
// and where to act on it. Pure state surfacing — no new intelligence,
// no "act now" copy beyond what each module itself reports.

import { computeTiltState } from "./tiltGuard.js";
import { buildTwinBattle } from "./twinBattle.js";
import { buildPassportPayload } from "./operatorPassport.js";
import { shouldShowStressPreview, totalExposure } from "./bankrollStress.js";
import { buildCounterfactualPnL } from "./counterfactualPnL.js";
import { buildDecisionJournal } from "./decisionJournal.js";
import { buildReplayInsights } from "./replayLedger.js";
import { buildOperatorSeason } from "./seasons.js";
import { computeDisciplineScore } from "./discipline.js";
import { listDriftedPromos } from "./termsDrift.js";
import { summarizeCalibration } from "./aiCalibration.js";
import { buildEdgeDecayHeatmap, buildHeatmapPromoRows } from "./edgeDecayHeatmap.js";

// Attention states: "act" needs the operator's eyes now, "live" has a
// real signal, "idle" is waiting on data (coach line explains how to feed it).
const STATE_RANK = { act: 0, live: 1, idle: 2 };

function money(value) {
  const abs = Math.abs(Number(value) || 0);
  return `${(Number(value) || 0) < 0 ? "-" : "+"}$${abs.toFixed(2)}`;
}

function openPositions(appData) {
  return (Array.isArray(appData.bets) ? appData.bets : []).filter((b) => String(b.status || "").toLowerCase() === "open");
}

const MODULES = [
  {
    key: "tilt-guard",
    name: "Tilt Guard",
    decision: "Should you place the next bet at all?",
    slug: "bet-tracker",
    coach: "Log bets in the tracker — the breaker watches pace, stakes, and losses.",
    status(appData, { now }) {
      const tilt = computeTiltState(appData, { now });
      if (tilt.tripped) return { state: "act", line: `Breaker active — ${tilt.nextAction}` };
      if (tilt.score > 0) return { state: "live", line: `Pressure ${tilt.score} — ${tilt.nextAction}` };
      return { state: "live", line: tilt.nextAction };
    },
  },
  {
    key: "discipline",
    name: "Discipline Score",
    decision: "Is your execution disciplined enough to add exposure?",
    slug: "bet-tracker",
    coach: "Close open loops — settle bets and record outcomes to build the score.",
    status(appData, { now }) {
      const d = computeDisciplineScore(appData, now);
      const state = d.tone === "healthy" ? "live" : "act";
      return { state, line: `Score ${d.score} (${d.band}) — ${d.next}` };
    },
  },
  {
    key: "bankroll-stress",
    name: "Bankroll Stress",
    decision: "Can your bankroll survive the current open slate?",
    slug: "bet-tracker",
    coach: "Set a bankroll and keep open bets logged — the sim watches exposure.",
    status(appData) {
      const positions = openPositions(appData);
      const bankroll = Number.parseFloat(appData.bankroll) || 0;
      if (!positions.length || !bankroll) return { state: "idle", line: null };
      const exposure = totalExposure(positions);
      if (shouldShowStressPreview({ bankroll, positions })) {
        return { state: "act", line: `Open exposure $${exposure.toFixed(0)} is heavy for a $${bankroll.toFixed(0)} bankroll — run the stress sim.` };
      }
      return { state: "live", line: `Open exposure $${exposure.toFixed(0)} across ${positions.length} position${positions.length === 1 ? "" : "s"} — inside tolerance.` };
    },
  },
  {
    key: "edge-decay",
    name: "Edge Decay Heatmap",
    decision: "Which promo lanes are losing edge fastest?",
    slug: "edge-dashboard",
    coach: "Mark books active in the Sportsbooks tracker to build your decay grid.",
    status(appData, { now }) {
      const heatmap = buildEdgeDecayHeatmap(buildHeatmapPromoRows(appData), now ? { now } : {});
      if (!heatmap.summary.total) return { state: "idle", line: null };
      const critical = heatmap.summary.critical || 0;
      if (critical) return { state: "act", line: `${critical} lane${critical === 1 ? "" : "s"} critical — edge nearly gone.` };
      return { state: "live", line: `${heatmap.summary.total} lanes tracked · ${(heatmap.summary.warm || 0)} warming.` };
    },
  },
  {
    key: "terms-drift",
    name: "Terms Drift Watch",
    decision: "Did a promo's fine print change since you last read it?",
    slug: "dashboard",
    coach: "Open promos from the recommender — terms snapshot automatically.",
    status(appData, { storage }) {
      const drifted = listDriftedPromos(storage);
      if (!drifted.length) return { state: "idle", line: "No drift detected in snapshotted promos." };
      return { state: "act", line: `${drifted.length} promo${drifted.length === 1 ? "" : "s"} changed terms since you last read them.` };
    },
  },
  {
    key: "mistake-memory",
    name: "Mistake Memory",
    decision: "Have you lost on a setup like this before?",
    slug: "ledger",
    coach: "Settle losing bets honestly — the memory recalls them when a similar setup appears.",
    status(appData) {
      const losses = (Array.isArray(appData.bets) ? appData.bets : []).filter(
        (b) => String(b.status || "").toLowerCase() === "settled" && Number(b.profit) < 0,
      );
      if (!losses.length) return { state: "idle", line: null };
      return { state: "live", line: `${losses.length} settled loss${losses.length === 1 ? "" : "es"} in memory — surfaced when a similar setup appears.` };
    },
  },
  {
    key: "twin-battle",
    name: "Twin Battle",
    decision: "Is your execution beating your disciplined twin?",
    slug: "leaderboard",
    coach: "Settle a week of bets — the twin replays your slate with disciplined sizing.",
    status(appData, { now }) {
      const battle = buildTwinBattle(appData, { now });
      if (battle.empty || !battle.sample) return { state: "idle", line: null };
      const behind = (battle.delta?.disciplineVsYou || 0) > 0;
      return {
        state: behind ? "act" : "live",
        line: behind
          ? `Discipline twin is ahead ${money(battle.delta.disciplineVsYou)} over ${battle.windowDays}d — review sizing.`
          : `You ${money(battle.you)} vs twin ${money(battle.twin)} over ${battle.windowDays}d.`,
      };
    },
  },
  {
    key: "counterfactual",
    name: "Counterfactual P/L",
    decision: "Would following the plan have paid better than what you did?",
    slug: "dashboard",
    coach: "Mark promos placed or skipped — counterfactuals need your actual decisions.",
    status(appData, { now }) {
      const cf = buildCounterfactualPnL(appData, { now });
      if (!cf.hasSignal) return { state: "idle", line: null };
      return { state: "live", line: cf.summary };
    },
  },
  {
    key: "decision-journal",
    name: "Decision Journal",
    decision: "What did you actually decide today, and how did it go?",
    slug: "daily-brief",
    coach: "Work a day of promos — the journal writes itself from your feedback loop.",
    status(appData, { now }) {
      const journal = buildDecisionJournal(appData, { now });
      if (!journal.hasActivity) return { state: "idle", line: null };
      return { state: "live", line: journal.lines?.[0] || `Journal active for ${journal.date}.` };
    },
  },
  {
    key: "replay-ledger",
    name: "Replay Insights",
    decision: "What do your settled bets teach you about the next one?",
    slug: "ledger",
    coach: "Settle more bets — replay insights unlock with history depth.",
    status(appData) {
      const replay = buildReplayInsights(appData);
      if (!replay.hasEnoughHistory) return { state: "idle", line: null };
      return { state: "live", line: `${replay.insights.length} replay insight${replay.insights.length === 1 ? "" : "s"} from your settled history.` };
    },
  },
  {
    key: "ai-calibration",
    name: "AI Calibration",
    decision: "How much should you trust the advisor's confidence?",
    slug: "dashboard",
    coach: "Resolve advisor predictions against outcomes — calibration needs 10+ samples.",
    status(appData, { storage }) {
      const summaries = summarizeCalibration({ storage });
      const showable = summaries.find((s) => s.showable);
      if (showable) return { state: "live", line: `${showable.source}: ${showable.calibration}% calibrated (n=${showable.sample}).` };
      const building = summaries.reduce((sum, s) => sum + s.sample, 0);
      if (building) return { state: "idle", line: `${building} resolved sample${building === 1 ? "" : "s"} — calibration shows at 10.` };
      return { state: "idle", line: null };
    },
  },
  {
    key: "operator-season",
    name: "Operator Season",
    decision: "Are you on pace for this season's discipline targets?",
    slug: "dashboard",
    coach: null, // seasons always have state
    status(appData, { now }) {
      const season = buildOperatorSeason(appData, now || new Date());
      const done = (season.targets || []).filter((t) => t.complete).length;
      return {
        state: "live",
        line: `${season.label} · day ${season.day}/${season.lengthDays} · ${season.band} · ${done}/${season.targets?.length || 0} targets.`,
      };
    },
  },
  {
    key: "operator-passport",
    name: "Operator Passport",
    decision: "What operator standing can you prove?",
    slug: "profit-cert",
    coach: "Close settled loops — the passport attests discipline and mastery you actually earned.",
    status(appData, { now }) {
      const passport = buildPassportPayload(appData, { now });
      const settled = passport.operator?.settledCount || 0;
      if (!settled) return { state: "idle", line: null };
      return { state: "live", line: `${passport.discipline?.band} discipline · ${passport.mastery?.globalRank?.name} rank · ${settled} settled loops.` };
    },
  },
];

/**
 * Build the deck: one entry per intelligence module, attention-ranked
 * (act > live > idle, stable within rank). Each module computes inside
 * a try/catch so a single module's bad data can't take down the deck.
 */
export function buildCommandDeck(appData = {}, opts = {}) {
  const context = {
    now: opts.now,
    storage: opts.storage ?? (typeof globalThis.localStorage !== "undefined" ? globalThis.localStorage : null),
  };
  const modules = MODULES.map((module, index) => {
    let status;
    try {
      status = module.status(appData, context) || { state: "idle", line: null };
    } catch {
      status = { state: "idle", line: null };
    }
    return {
      key: module.key,
      name: module.name,
      decision: module.decision,
      slug: module.slug,
      state: status.state,
      line: status.line || null,
      coach: status.line ? null : module.coach,
      order: index,
    };
  });
  modules.sort((a, b) => STATE_RANK[a.state] - STATE_RANK[b.state] || a.order - b.order);
  const summary = modules.reduce(
    (acc, m) => {
      acc[m.state] += 1;
      return acc;
    },
    { act: 0, live: 0, idle: 0, total: modules.length },
  );
  return { modules, summary };
}
