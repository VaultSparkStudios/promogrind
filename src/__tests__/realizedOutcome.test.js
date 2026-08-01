import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  hasRealizedOutcome,
  parseRealizedOutcomeValue,
  realizedOutcomeValue,
  resolveRealizedOutcome,
} from "../lib/realizedOutcome.js";
import { buildReplayInsights } from "../lib/replayLedger.js";
import { buildDecisionJournal } from "../lib/decisionJournal.js";
import { buildCounterfactualPnL } from "../lib/counterfactualPnL.js";
import { matchPriorMistake } from "../lib/mistakeMemory.js";
import { buildTwinBattle } from "../lib/twinBattle.js";
import { computeTiltState } from "../lib/tiltGuard.js";
import { normalizeWorkflowEntry } from "../promograph/index.js";

describe("realized outcome contract", () => {
  it("parses currency, grouping, accounting negatives, and exact zero", () => {
    expect(parseRealizedOutcomeValue(" $1,234.50 ")).toBe(1234.5);
    expect(parseRealizedOutcomeValue("(£12.40)")).toBe(-12.4);
    expect(parseRealizedOutcomeValue("0")).toBe(0);
    expect(parseRealizedOutcomeValue("12 dollars")).toBeNull();
    expect(parseRealizedOutcomeValue(Infinity)).toBeNull();
  });

  it("gives actualProfit authority and fails closed when it is malformed", () => {
    expect(resolveRealizedOutcome({ actualProfit: "12.50", profit: 99 })).toMatchObject({
      state: "resolved", value: 12.5, field: "actualProfit", authority: "actual",
    });
    expect(resolveRealizedOutcome({ actualProfit: "unknown", profit: 99 })).toMatchObject({
      state: "invalid", value: null, field: "actualProfit",
    });
    expect(realizedOutcomeValue({ profit: "-4.25" })).toBe(-4.25);
    expect(hasRealizedOutcome({ actualProfit: "0" })).toBe(true);
    expect(normalizeWorkflowEntry({ id: "wf", actualProfit: "$1,234.50" }).actualProfit).toBe(1234.5);
  });

  it("drives every learning surface from the production actualProfit shape", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const older = new Date("2026-04-20T12:00:00Z").toISOString();
    const yesterday = new Date("2026-05-16T12:00:00Z").toISOString();
    const base = {
      id: "advisor:wf-1",
      status: "settled",
      promoType: "bonus_bet",
      book: "ExampleBook",
      actualProfit: "$25.00",
      expectedProfit: 20,
      createdAt: older,
      updatedAt: yesterday,
      settledAt: yesterday,
    };
    const loss = { ...base, id: "loss-1", actualProfit: "($8.00)", createdAt: older, updatedAt: yesterday };
    const appData = {
      resultFeedback: [base, { ...base, id: "wf-2", actualProfit: "15", createdAt: older }, loss],
      redFlags: { "loss-1": true },
      aiRankings: { "advisor:wf-1": 1 },
    };

    const replayData = {
      resultFeedback: [
        { ...base, id: "replay-1", settledAt: older, updatedAt: older },
        { ...base, id: "replay-2", actualProfit: "15", settledAt: older, updatedAt: older },
      ],
    };
    expect(buildReplayInsights(replayData, { now: now.getTime() }).insights.some((item) => item.key === "best-lane")).toBe(true);
    expect(buildDecisionJournal(appData, { now: now.getTime() }).stats.netProfit).toBe(32);
    expect(buildCounterfactualPnL(appData, { now: now.getTime(), windowDays: 30 }).actual).toBe(32);
    expect(matchPriorMistake(loss, [loss], { threshold: 1 })[0].lossAmount).toBe(8);
    expect(buildTwinBattle(appData, { now: now.getTime() }).you).toBe(32);
    expect(computeTiltState({ resultFeedback: [loss, { ...loss, id: "loss-2" }, { ...loss, id: "loss-3" }] }, { now: now.getTime() }).signals)
      .toEqual(expect.arrayContaining([expect.objectContaining({ key: "losingStreak" })]));
  });

  it("keeps outcome alias precedence centralized", () => {
    const consumers = [
      "src/lib/replayLedger.js",
      "src/lib/counterfactualPnL.js",
      "src/lib/decisionJournal.js",
      "src/lib/mistakeMemory.js",
      "src/lib/twinBattle.js",
      "src/lib/tiltGuard.js",
    ];
    for (const file of consumers) {
      const source = fs.readFileSync(path.resolve(file), "utf8");
      expect(source, file).toContain("realizedOutcome");
      expect(source, file).not.toMatch(/profit\s*\?\?\s*[^\n]*netProfit\s*\?\?/);
    }
  });
});
