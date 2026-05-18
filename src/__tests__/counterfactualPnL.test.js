import { describe, it, expect } from "vitest";
import { buildCounterfactualPnL } from "../lib/counterfactualPnL.js";

const DAY = 86400000;

describe("counterfactualPnL", () => {
  const now = new Date("2026-05-17T12:00:00Z").getTime();

  it("returns no-signal for empty / sparse history", () => {
    const r = buildCounterfactualPnL({}, { now });
    expect(r.actual).toBe(0);
    expect(r.hasSignal).toBe(false);
  });

  it("computes positive AI-top delta when user skipped #1 picks that paid out", () => {
    const appData = {
      resultFeedback: [
        // user actually settled these
        { promoId: "x", status: "settled", profit: 10, promoType: "bonus_bet", createdAt: new Date(now - 1 * DAY).toISOString() },
        { promoId: "y", status: "settled", profit: -5, promoType: "bonus_bet", createdAt: new Date(now - 2 * DAY).toISOString() },
        { promoId: "z", status: "settled", profit: 20, promoType: "bonus_bet", createdAt: new Date(now - 3 * DAY).toISOString() },
        // user skipped this one but it was AI #1
        { promoId: "ai1", status: "skipped", promoType: "bonus_bet", createdAt: new Date(now - 1 * DAY).toISOString() },
      ],
      aiRankings: { ai1: 1 },
    };
    const r = buildCounterfactualPnL(appData, { now });
    expect(r.actual).toBeCloseTo(25);
    // ai-top includes skipped ai1 estimated at lane avg = (10-5+20)/3 = 8.33
    expect(r.aiTop).toBeCloseTo(25 / 3, 1);
    expect(r.aiTopCount).toBe(1);
    expect(r.hasSignal).toBe(true);
    expect(r.summary).toMatch(/Last 7d: you earned \+\$25\.00/);
  });

  it("computes skip-red counterfactual recovering losses on flagged promos", () => {
    const appData = {
      resultFeedback: [
        { promoId: "ok", status: "settled", profit: 20, createdAt: new Date(now - 1 * DAY).toISOString() },
        { promoId: "bad1", status: "settled", profit: -15, createdAt: new Date(now - 2 * DAY).toISOString() },
        { promoId: "bad2", status: "settled", profit: -10, createdAt: new Date(now - 3 * DAY).toISOString() },
      ],
      redFlags: { bad1: true, bad2: true },
    };
    const r = buildCounterfactualPnL(appData, { now });
    expect(r.actual).toBeCloseTo(-5);
    // skipping the 2 red flags removes -25 → result is 20
    expect(r.skipRed).toBeCloseTo(20);
    expect(r.deltaSkipRed).toBeCloseTo(25);
    expect(r.skipRedCount).toBe(2);
  });
});
