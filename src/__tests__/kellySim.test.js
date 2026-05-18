import { describe, it, expect } from "vitest";
import { simulateKellyFraction, compareKellyFractions } from "../lib/kellySim.js";

describe("kellySim", () => {
  it("returns no-op result for empty history", () => {
    const r = simulateKellyFraction([], 0.5);
    expect(r.samples).toBe(0);
    expect(r.netProfit).toBe(0);
    expect(r.endingBankroll).toBe(r.startingBankroll);
  });

  it("simulates positive expected value scenario — fuller Kelly yields more profit", () => {
    // Positive-edge bets: implied prob ~0.5 at +100, edge +0.10, 60% wins.
    const history = Array.from({ length: 20 }, (_, i) => ({
      stake: 50,
      odds: 100,
      edge: 0.10,
      // 12 wins, 8 losses (60%)
      profit: i < 12 ? 50 : -50,
    }));

    const r25 = simulateKellyFraction(history, 0.25, { startingBankroll: 1000 });
    const r100 = simulateKellyFraction(history, 1.0, { startingBankroll: 1000 });

    expect(r25.netProfit).toBeGreaterThan(0);
    expect(r100.netProfit).toBeGreaterThan(r25.netProfit);
    expect(r100.samples).toBe(20);
  });

  it("compareKellyFractions returns one result per fraction in order", () => {
    const history = [{ stake: 10, odds: -110, profit: 9.09, edge: 0.05 }];
    const out = compareKellyFractions(history, [0.25, 0.5, 1.0]);
    expect(out).toHaveLength(3);
    expect(out.map((r) => r.kFraction)).toEqual([0.25, 0.5, 1.0]);
  });
});
