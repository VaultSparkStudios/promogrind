import { beforeEach, describe, expect, it } from "vitest";
import { estimateAiSpendUsd, getBudgetState } from "../ai/gateway.js";

const now = new Date("2026-05-17T12:00:00Z").getTime();

beforeEach(() => {
  try { localStorage.clear(); } catch {}
});

describe("getBudgetState", () => {
  it("returns under-budget state when ledger is small", () => {
    const state = getBudgetState({ now, ledger: [{ at: now - 1000, usd: 1.25 }], budgetUsd: 5 });
    expect(state.overBudget).toBe(false);
    expect(state.spent).toBe(1.25);
    expect(state.pct).toBe(25);
  });

  it("flags running-lean when over weekly budget", () => {
    const state = getBudgetState({
      now,
      ledger: [
        { at: now - 1000, usd: 3 },
        { at: now - 2000, usd: 3 },
      ],
      budgetUsd: 5,
    });
    expect(state.overBudget).toBe(true);
    expect(state.runningLean).toBe(true);
    expect(state.badge).toBe("running lean");
  });

  it("ignores spend older than 7 days", () => {
    const eightDaysAgo = now - 8 * 86400000;
    const state = getBudgetState({
      now,
      ledger: [{ at: eightDaysAgo, usd: 99 }],
      budgetUsd: 5,
    });
    expect(state.spent).toBe(0);
    expect(state.overBudget).toBe(false);
  });
});

describe("estimateAiSpendUsd", () => {
  it("returns zero for rule-engine and cache hits", () => {
    expect(estimateAiSpendUsd({ analysisSource: "rule_engine" })).toBe(0);
    expect(estimateAiSpendUsd({ cacheHit: true })).toBe(0);
  });

  it("estimates spend from token usage", () => {
    expect(estimateAiSpendUsd({ usage: { input_tokens: 1000, output_tokens: 500 } })).toBeCloseTo(0.0105, 4);
  });
});
