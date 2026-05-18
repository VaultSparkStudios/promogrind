import { describe, it, expect } from "vitest";
import { buildShareCardData, assertShareCardPiiSafe } from "../lib/shareCard.js";

describe("shareCard", () => {
  it("clamps discipline score and maps lane label + direction", () => {
    const a = buildShareCardData({ disciplineScore: 999, topLane: "bonus_bet", edgeDelta14d: 5 });
    expect(a.disciplineScore).toBe(100);
    expect(a.topLane).toBe("Bonus Bet");
    expect(a.edgeDirection).toBe("up");
    expect(a.schemaVersion).toBe(1);

    const b = buildShareCardData({ disciplineScore: -50, topLane: "arb", edgeDelta14d: -2 });
    expect(b.disciplineScore).toBe(0);
    expect(b.topLane).toBe("Arbitrage");
    expect(b.edgeDirection).toBe("down");

    const c = buildShareCardData({ topLane: "nonsense_lane", edgeDelta14d: 0 });
    expect(c.topLane).toBe("Other");
    expect(c.edgeDirection).toBe("flat");
  });

  it("rejects payloads containing PII-shaped fields", () => {
    const safe = buildShareCardData({ disciplineScore: 80, topLane: "parlay", edgeDelta14d: 3 });
    expect(assertShareCardPiiSafe(safe)).toBe(true);

    expect(() => assertShareCardPiiSafe({ ...safe, email: "user@example.com" })).toThrow(/PII/);
    expect(() => assertShareCardPiiSafe({ ...safe, bankroll: 1000 })).toThrow(/PII/);
    expect(() => assertShareCardPiiSafe({ ...safe, profit: 25 })).toThrow(/PII/);
  });
});
