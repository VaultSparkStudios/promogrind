import { describe, it, expect } from "vitest";
import { runBankrollStress, shouldShowStressPreview, totalExposure } from "../lib/bankrollStress.js";

describe("runBankrollStress", () => {
  it("returns empty when no positions are supplied", () => {
    const result = runBankrollStress({ bankroll: 1000, positions: [] });
    expect(result.empty).toBe(true);
    expect(result.results.p50).toBe(1000);
  });

  it("is deterministic given the same seed", () => {
    const positions = [
      { stake: 50, winProb: 0.5, payoutOnWin: 50 },
      { stake: 100, winProb: 0.6, payoutOnWin: 80 },
    ];
    const a = runBankrollStress({ bankroll: 1000, positions }, { seed: 7, iterations: 200 });
    const b = runBankrollStress({ bankroll: 1000, positions }, { seed: 7, iterations: 200 });
    expect(a.results).toEqual(b.results);
    expect(a.worstCase).toBe(b.worstCase);
  });

  it("detects floor breaches when exposure can dip below floor", () => {
    const positions = Array.from({ length: 10 }).map(() => ({ stake: 100, winProb: 0, payoutOnWin: 100 }));
    const result = runBankrollStress({ bankroll: 500, positions, floor: 0 }, { seed: 1, iterations: 100 });
    expect(result.floorBreaches).toBe(100);
    expect(result.floorBreachRate).toBe(1);
    expect(result.worstCase).toBeLessThan(0);
  });

  it("produces p10 <= p50 <= p90 across iterations", () => {
    const positions = [
      { stake: 25, winProb: 0.55, payoutOnWin: 25 },
      { stake: 25, winProb: 0.45, payoutOnWin: 25 },
      { stake: 25, winProb: 0.5, payoutOnWin: 25 },
    ];
    const result = runBankrollStress({ bankroll: 500, positions }, { seed: 3, iterations: 400 });
    const { p10, p50, p90 } = result.results;
    expect(p10).toBeLessThanOrEqual(p50);
    expect(p50).toBeLessThanOrEqual(p90);
  });
});

describe("totalExposure / shouldShowStressPreview", () => {
  it("sums stake across positions", () => {
    expect(totalExposure([{ stake: 25 }, { stake: 75 }])).toBe(100);
  });

  it("triggers preview at >= 25% of bankroll by default", () => {
    expect(shouldShowStressPreview({ bankroll: 1000, positions: [{ stake: 250 }] })).toBe(true);
    expect(shouldShowStressPreview({ bankroll: 1000, positions: [{ stake: 100 }] })).toBe(false);
  });
});
