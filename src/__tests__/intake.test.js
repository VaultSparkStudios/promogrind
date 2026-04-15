import { describe, expect, it } from "vitest";
import { calculatorForPromo, parsePromoText } from "../intake/parse.js";

describe("parsePromoText", () => {
  it("detects a DraftKings bonus-bet promo with expiry", () => {
    const card = parsePromoText(
      "DraftKings: Bet $5, get $200 in Bonus Bets. Minimum odds -200. Expires 04/30/2026.",
    );
    expect(card).not.toBeNull();
    expect(card.book).toBe("draftkings");
    expect(card.promoType).toBe("bonus_bet");
    expect(card.calculator).toBe("bonus-bet");
    expect(card.bonusAmount).toBe(200);
    expect(card.minOdds).toBe("-200");
    expect(card.expiry).toBe("2026-04-30");
    expect(card.confidence).toBe("high");
  });

  it("detects a FanDuel safety-net / bet reset promo", () => {
    const card = parsePromoText(
      "FanDuel — Up to $300/day Bet Reset for 10 days if your first bet loses.",
    );
    expect(card.book).toBe("fanduel");
    expect(card.promoType).toBe("safety_net");
    expect(card.calculator).toBe("first-bet");
    expect(card.bonusAmount).toBe(300);
  });

  it("detects a profit boost with percentage and cap", () => {
    const card = parsePromoText(
      "Caesars 100% Profit Boost token up to $25 — ends November 12",
    );
    expect(card.book).toBe("caesars");
    expect(card.promoType).toBe("profit_boost");
    expect(card.boostPct).toBe(100);
    expect(card.maxBoost).toBe(25);
    expect(card.calculator).toBe("profit-boost");
    expect(card.expiry).toMatch(/-11-12$/);
  });

  it("classifies BetMGM deposit match", () => {
    const card = parsePromoText(
      "BetMGM 25% deposit match up to $100 weekly.",
    );
    expect(card.book).toBe("betmgm");
    expect(card.promoType).toBe("deposit_match");
    expect(card.calculator).toBe("deposit-match-calculator");
    expect(card.boostPct).toBeNull(); // percent isn't carried for deposit match
  });

  it("returns low confidence for garbage input", () => {
    const card = parsePromoText("hi there pls bet");
    expect(card.confidence).toBe("low");
    expect(card.promoType).toBe("other");
    expect(card.calculator).toBeNull();
  });

  it("returns null for inputs that are too short", () => {
    expect(parsePromoText("")).toBeNull();
    expect(parsePromoText("bet$5")).toBeNull();
  });

  it("exposes calculator slug lookup without re-parsing", () => {
    expect(calculatorForPromo("bonus_bet")).toBe("bonus-bet");
    expect(calculatorForPromo("nope")).toBeNull();
  });
});
