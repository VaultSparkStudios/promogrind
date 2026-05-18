import { describe, it, expect } from "vitest";
import { detectPromoConflicts, hasBlockingConflict } from "../lib/promoConflict.js";

describe("promoConflict", () => {
  it("flags rollover collision on same book + market", () => {
    const promos = [
      { id: "a", book: "DraftKings", market: "NBA Lakers ML", requirements: ["1x rollover at -200"] },
      { id: "b", book: "DraftKings", market: "NBA Lakers ML", requirements: ["wager 1x at -150"] },
    ];
    const conflicts = detectPromoConflicts(promos);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].class).toBe("rollover_market_collision");
    expect(conflicts[0].promoIds).toEqual(["a", "b"]);
    expect(hasBlockingConflict("a", conflicts)).toBe(true);
  });

  it("flags stake-qualifier collision when both promos need first qualifying bet", () => {
    const promos = [
      { id: "x", book: "FanDuel", market: "MLB Game 1", requirements: ["First bet safety net"] },
      { id: "y", book: "FanDuel", market: "MLB Game 1", requirements: ["First wager $5+"] },
    ];
    const conflicts = detectPromoConflicts(promos);
    expect(conflicts.some((c) => c.class === "stake_qualifier_collision")).toBe(true);
  });

  it("returns no conflicts for promos on different markets / books", () => {
    const promos = [
      { id: "a", book: "DraftKings", market: "NBA", requirements: ["rollover 1x"] },
      { id: "b", book: "FanDuel", market: "NBA", requirements: ["rollover 1x"] },
      { id: "c", book: "DraftKings", market: "NFL", requirements: ["rollover 1x"] },
    ];
    expect(detectPromoConflicts(promos)).toHaveLength(0);
  });
});
