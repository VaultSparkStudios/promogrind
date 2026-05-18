import { describe, it, expect } from "vitest";
import { similarity, matchPriorMistake, summarizeNearestMistake } from "../lib/mistakeMemory.js";

const baseCandidate = {
  book: "DraftKings",
  promoType: "bonus_bet",
  rollover: 5,
  qualifier: ["min odds -200", "single bet"],
  stake: 50,
};

const exactLoss = {
  id: "loss-1",
  status: "settled",
  book: "DraftKings",
  promoType: "bonus_bet",
  rollover: 5,
  qualifier: ["min odds -200", "single bet"],
  stake: 50,
  profit: -42.5,
  createdAt: "2026-04-30T12:00:00Z",
};

describe("mistakeMemory.similarity", () => {
  it("returns 1.0 for identical features", () => {
    expect(similarity(baseCandidate, exactLoss)).toBe(1);
  });

  it("falls below 0.8 when book and promoType differ", () => {
    const dissimilar = { ...exactLoss, book: "FanDuel", promoType: "profit_boost" };
    expect(similarity(baseCandidate, dissimilar)).toBeLessThan(0.8);
  });
});

describe("mistakeMemory.matchPriorMistake", () => {
  const ledger = [
    exactLoss,
    { ...exactLoss, id: "loss-2", profit: 25 }, // a win, not a loss — must skip
    { ...exactLoss, id: "loss-3", status: "skipped", profit: -10 }, // skipped, not settled
    { ...exactLoss, id: "loss-4", book: "FanDuel", promoType: "profit_boost", profit: -30 },
  ];

  it("returns only losses meeting the similarity threshold", () => {
    const matches = matchPriorMistake(baseCandidate, ledger);
    expect(matches).toHaveLength(1);
    expect(matches[0].reference).toBe("loss-1");
    expect(matches[0].lossAmount).toBe(42.5);
  });

  it("respects the limit parameter", () => {
    const big = Array.from({ length: 5 }).map((_, i) => ({ ...exactLoss, id: `loss-${i}`, profit: -(10 + i) }));
    const matches = matchPriorMistake(baseCandidate, big, { limit: 2 });
    expect(matches).toHaveLength(2);
  });
});

describe("mistakeMemory.summarizeNearestMistake — soul invariant", () => {
  it("produces a sober chip with no shame phrases", () => {
    const summary = summarizeNearestMistake(baseCandidate, [exactLoss]);
    expect(summary).not.toBeNull();
    expect(summary.chipDetail).toMatch(/prior .* settled -\$/);
    expect(summary.chipDetail).not.toMatch(/!/);
    expect(summary.chipDetail).not.toMatch(/\b(STOP|NEVER|DON'T)\b/);
  });
});
