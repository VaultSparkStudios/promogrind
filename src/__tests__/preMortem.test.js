import { describe, it, expect } from "vitest";
import { buildPreMortem, shouldShowPreMortem } from "../lib/preMortem.js";

const priorLoss = {
  id: "loss-1",
  status: "settled",
  book: "DraftKings",
  promoType: "bonus_bet",
  rollover: 5,
  qualifier: ["min odds -200"],
  stake: 50,
  profit: -40,
};

describe("shouldShowPreMortem", () => {
  it("returns true when stake exceeds threshold of bankroll", () => {
    expect(shouldShowPreMortem({ stake: 150, bankroll: 1000 })).toBe(true);
    expect(shouldShowPreMortem({ stake: 50, bankroll: 1000 })).toBe(false);
  });

  it("returns false on missing inputs", () => {
    expect(shouldShowPreMortem({ stake: 0, bankroll: 1000 })).toBe(false);
    expect(shouldShowPreMortem({ stake: 50, bankroll: 0 })).toBe(false);
  });
});

describe("buildPreMortem", () => {
  it("does not trigger below the threshold", () => {
    const result = buildPreMortem(
      { book: "DraftKings", promoType: "bonus_bet", stake: 50 },
      [priorLoss],
      { bankroll: 1000 },
    );
    expect(result.triggered).toBe(false);
  });

  it("triggers above the threshold and lists matching prior losses", () => {
    const result = buildPreMortem(
      { book: "DraftKings", promoType: "bonus_bet", rollover: 5, qualifier: ["min odds -200"], stake: 150 },
      [priorLoss],
      { bankroll: 1000 },
    );
    expect(result.triggered).toBe(true);
    expect(result.scenarios).toHaveLength(1);
    expect(result.scenarios[0].lossAmount).toBe(40);
    expect(result.acknowledgements).toBe(1);
    expect(result.copy.body).toMatch(/Review prior similar plays/);
  });

  it("triggers with fallback copy when no prior matches exist", () => {
    const result = buildPreMortem(
      { book: "NewBook", promoType: "exotic", stake: 200 },
      [priorLoss],
      { bankroll: 1000 },
    );
    expect(result.triggered).toBe(true);
    expect(result.scenarios).toHaveLength(0);
    expect(result.copy.body).toMatch(/intentional/);
  });
});
