import { describe, expect, it } from "vitest";
import { buildPortfolioAllocation } from "../lib/portfolio.js";

const makeWorkflow = (overrides = {}) => ({
  id: overrides.id || "wf-1",
  title: overrides.title || "Bonus Bet workflow",
  status: overrides.status ?? "ready",
  expectedProfit: overrides.expectedProfit ?? "25",
  opportunityScore: overrides.opportunityScore ?? 80,
  confidence: overrides.confidence ?? "high",
  book: overrides.book || "DraftKings",
  calculatorSlug: overrides.calculatorSlug || "bonus-bet",
  promoType: overrides.promoType || "bonus_bet",
});

describe("buildPortfolioAllocation", () => {
  it("returns empty result for empty workflows", () => {
    const result = buildPortfolioAllocation([], 500);
    expect(result.allocations).toHaveLength(0);
    expect(result.totalEv).toBe(0);
    expect(result.totalAllocated).toBe(0);
  });

  it("returns empty result for zero bankroll", () => {
    const result = buildPortfolioAllocation([makeWorkflow()], 0);
    expect(result.allocations).toHaveLength(0);
  });

  it("allocates a single ready workflow with positive EV", () => {
    const result = buildPortfolioAllocation([makeWorkflow({ expectedProfit: "40" })], 500);
    expect(result.allocations).toHaveLength(1);
    expect(result.allocations[0].allocate).toBeGreaterThan(0);
    expect(result.allocations[0].allocate).toBeLessThanOrEqual(500);
    expect(result.allocations[0].ev).toBeGreaterThan(0);
    expect(result.allocations[0].kelly).toBeGreaterThan(0);
  });

  it("does not allocate workflows with zero or tiny expected profit", () => {
    const result = buildPortfolioAllocation(
      [makeWorkflow({ expectedProfit: "1" }), makeWorkflow({ id: "wf-2", expectedProfit: "0" })],
      500,
    );
    expect(result.allocations).toHaveLength(0);
  });

  it("does not exceed total bankroll across all allocations", () => {
    const workflows = [
      makeWorkflow({ id: "wf-1", expectedProfit: "50", opportunityScore: 90 }),
      makeWorkflow({ id: "wf-2", expectedProfit: "30", opportunityScore: 75 }),
      makeWorkflow({ id: "wf-3", expectedProfit: "20", opportunityScore: 60 }),
    ];
    const result = buildPortfolioAllocation(workflows, 500);
    expect(result.totalAllocated).toBeLessThanOrEqual(500 + 0.01);
  });

  it("ranks allocations by Kelly fraction (higher EV + confidence first)", () => {
    const workflows = [
      makeWorkflow({ id: "wf-low", expectedProfit: "5", opportunityScore: 40, confidence: "low" }),
      makeWorkflow({ id: "wf-high", expectedProfit: "60", opportunityScore: 90, confidence: "high" }),
    ];
    const result = buildPortfolioAllocation(workflows, 500);
    expect(result.allocations[0].workflowId).toBe("wf-high");
  });

  it("skips waiting/settled workflows", () => {
    const workflows = [
      makeWorkflow({ id: "wf-1", status: "waiting", expectedProfit: "40" }),
      makeWorkflow({ id: "wf-2", status: "settled", expectedProfit: "40" }),
      makeWorkflow({ id: "wf-3", status: "ready", expectedProfit: "40" }),
    ];
    const result = buildPortfolioAllocation(workflows, 500);
    expect(result.allocations.every((a) => a.workflowId === "wf-3")).toBe(true);
    expect(result.allocations).toHaveLength(1);
  });

  it("includes reason string per allocation", () => {
    const result = buildPortfolioAllocation([makeWorkflow({ expectedProfit: "35" })], 500);
    expect(result.allocations[0].reason).toBeTruthy();
    expect(typeof result.allocations[0].reason).toBe("string");
  });

  it("includes totalEv as sum of projected EVs", () => {
    const result = buildPortfolioAllocation(
      [makeWorkflow({ id: "wf-1", expectedProfit: "30" }), makeWorkflow({ id: "wf-2", expectedProfit: "20" })],
      500,
    );
    const sumEv = result.allocations.reduce((s, a) => s + a.ev, 0);
    expect(result.totalEv).toBeCloseTo(sumEv, 1);
  });
});
