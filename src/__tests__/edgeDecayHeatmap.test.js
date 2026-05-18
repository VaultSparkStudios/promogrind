import { describe, it, expect } from "vitest";
import { buildEdgeDecayHeatmap } from "../lib/edgeDecayHeatmap.js";

const NOW = new Date("2026-05-18T12:00:00Z").getTime();
const HOUR = 3600 * 1000;

const promos = [
  { book: "DraftKings", promo: "Profit Boost", promoType: "profit_boost", expires: new Date(NOW + 4 * HOUR).toISOString() },
  { book: "FanDuel", promo: "Bonus Bet", promoType: "bonus_bet", expires: new Date(NOW + 36 * HOUR).toISOString() },
  { book: "Caesars", promo: "Deposit Match", promoType: "deposit_match", expires: null },
  { book: "ESPN BET", promo: "Old Promo", promoType: "bonus_bet", expires: new Date(NOW - HOUR).toISOString() },
];

describe("buildEdgeDecayHeatmap", () => {
  it("produces a cell per promo with monotonic tone mapping", () => {
    const result = buildEdgeDecayHeatmap(promos, { now: NOW });
    expect(result.cells).toHaveLength(4);
    const dkCell = result.cells.find((c) => c.book === "DraftKings");
    expect(dkCell.tone).toBe("critical"); // 4h horizon
    const stableCell = result.cells.find((c) => c.book === "Caesars");
    expect(stableCell.tone).toMatch(/^(fresh|stable|warm)$/);
  });

  it("ranks movers by smallest horizon first, excludes expired", () => {
    const result = buildEdgeDecayHeatmap(promos, { now: NOW });
    expect(result.movers[0].book).toBe("DraftKings");
    const espn = result.movers.find((c) => c.book === "ESPN BET");
    expect(espn).toBeUndefined();
  });

  it("produces an empty result for an empty promo list", () => {
    const result = buildEdgeDecayHeatmap([], { now: NOW });
    expect(result.cells).toHaveLength(0);
    expect(result.movers).toHaveLength(0);
    expect(result.summary.total).toBe(0);
  });
});
