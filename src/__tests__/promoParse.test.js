import { describe, expect, it } from "vitest";
import { parsePromoTextHeuristic } from "../lib/promoParse.js";

describe("parsePromoTextHeuristic", () => {
  it("recognizes a bonus-bet offer as a high-confidence instant parse", () => {
    const parsed = parsePromoTextHeuristic("DraftKings: Bet $5, get a $200 bonus bet. Bonus bet expires in 7 days.");
    expect(parsed.type).toBe("bonus_bet");
    expect(parsed.confidence).toBe("high");
    expect(parsed.clearWinner).toBe(true);
    expect(parsed.result.calculatorSlug).toBe("bonus-bet");
    expect(parsed.result.analysisSource).toBe("rule_engine");
    expect(parsed.result.riskFlags).toContain("expires in 7d");
  });

  it("recognizes a profit boost offer and keeps the mapped calculator", () => {
    const parsed = parsePromoTextHeuristic("FanDuel 50% profit boost token on any MLB bet up to $25.");
    expect(parsed.type).toBe("profit_boost");
    expect(parsed.result.calculatorSlug).toBe("profit-boost");
    expect(parsed.result.ev).toContain("50%");
  });

  it("recognizes safety-net phrasing before generic bonus-bet language", () => {
    const parsed = parsePromoTextHeuristic("Get a $250 bonus bet back if your first bet loses.");
    expect(parsed.type).toBe("safety_net");
    expect(parsed.result.calculatorSlug).toBe("first-bet");
  });

  it("falls back to a lower-confidence parse when the promo is vague", () => {
    const parsed = parsePromoTextHeuristic("Special offer available this weekend. Terms apply.");
    expect(parsed.confidence).toBe("low");
    expect(parsed.clearWinner).toBe(false);
  });
});
