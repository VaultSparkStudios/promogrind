import { describe, it, expect } from "vitest";
import { buildTwinBattle } from "../lib/twinBattle.js";

const NOW = new Date("2026-05-18T12:00:00Z").getTime();
const DAY = 86400000;

function entry(overrides = {}) {
  return {
    id: "e",
    status: "settled",
    book: "DraftKings",
    promoType: "bonus_bet",
    profit: 10,
    settledAt: new Date(NOW - DAY).toISOString(),
    ...overrides,
  };
}

describe("buildTwinBattle", () => {
  it("returns empty=true when no entries in last 7d", () => {
    const result = buildTwinBattle({ resultFeedback: [] }, { now: NOW });
    expect(result.empty).toBe(true);
    expect(result.leaderboard).toHaveLength(0);
  });

  it("computes you/twin/disciplineTwin and sorts leaderboard descending", () => {
    const feedback = [
      entry({ id: "1", profit: 20 }),
      entry({ id: "2", profit: -15, redFlagId: "2" }),
      entry({ id: "3", profit: 5 }),
    ];
    const result = buildTwinBattle({ resultFeedback: feedback, redFlags: { 2: true } }, { now: NOW });
    expect(result.empty).toBe(false);
    expect(result.you).toBe(10); // 20 - 15 + 5
    expect(result.disciplineTwin).toBe(40); // (20+5 wins) + 15 avoided
    expect(result.leaderboard[0].pnl).toBeGreaterThanOrEqual(result.leaderboard[1].pnl);
    expect(result.leaderboard[1].pnl).toBeGreaterThanOrEqual(result.leaderboard[2].pnl);
  });

  it("flags the largest gap decision when there's a settled loss", () => {
    const feedback = [
      entry({ id: "win", profit: 12 }),
      entry({ id: "big-loss", profit: -40 }),
      entry({ id: "small-loss", profit: -5 }),
    ];
    const result = buildTwinBattle({ resultFeedback: feedback }, { now: NOW });
    expect(result.review).not.toBeNull();
    expect(result.review.id).toBe("big-loss");
    expect(result.review.contribution).toBe(40);
  });

  it("does not surface a review when all settled entries are wins", () => {
    const feedback = [entry({ id: "1", profit: 10 }), entry({ id: "2", profit: 20 })];
    const result = buildTwinBattle({ resultFeedback: feedback }, { now: NOW });
    expect(result.review).toBeNull();
  });
});
