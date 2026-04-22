import { describe, expect, it } from "vitest";
import { computeMastery, MASTERY_COLOR, MASTERY_RANK, PROMO_TYPE_KEYS, PROMO_LABELS, MASTERY_NEXT_XP } from "../lib/mastery.js";

function makeAppData(overrides = {}) {
  return { ledger: [], resultFeedback: [], done: {}, bets: [], ...overrides };
}

function makeSettlement({ promoType = "bonus_bet", actualProfit = "50", expectedProfit = "48", date = "2026-04-01" } = {}) {
  return { status: "settled", promoType, actualProfit, expectedProfit, updatedAt: date + "T10:00:00Z", createdAt: date + "T10:00:00Z" };
}

function makeLedgerEntry({ type = "bonus_bet", profit = "50", date = "2026-04-01" } = {}) {
  return { profit, type, date };
}

describe("computeMastery — global rank", () => {
  it("returns Novice for zero profit", () => {
    const { globalRank } = computeMastery(makeAppData());
    expect(globalRank.name).toBe("Novice");
  });

  it("returns Grinder at $150 total profit", () => {
    const ledger = Array.from({ length: 3 }, () => makeLedgerEntry({ profit: "50" }));
    const { globalRank } = computeMastery(makeAppData({ ledger }));
    expect(globalRank.name).toBe("Grinder");
  });

  it("returns Closer at $1,200 total profit", () => {
    const ledger = Array.from({ length: 12 }, () => makeLedgerEntry({ profit: "100" }));
    const { globalRank } = computeMastery(makeAppData({ ledger }));
    expect(globalRank.name).toBe("Closer");
  });

  it("returns Shark at $5,500 total profit", () => {
    const ledger = Array.from({ length: 55 }, () => makeLedgerEntry({ profit: "100" }));
    const { globalRank } = computeMastery(makeAppData({ ledger }));
    expect(globalRank.name).toBe("Shark");
  });

  it("returns The House at $12,000 total profit", () => {
    const ledger = Array.from({ length: 120 }, () => makeLedgerEntry({ profit: "100" }));
    const { globalRank } = computeMastery(makeAppData({ ledger }));
    expect(globalRank.name).toBe("The House");
  });
});

describe("computeMastery — per-type mastery levels", () => {
  it("starts all types at Analyst with 0 xp", () => {
    const { perType } = computeMastery(makeAppData());
    expect(perType.bonus_bet.level).toBe("Analyst");
    expect(perType.bonus_bet.xp).toBe(0);
  });

  it("reaches Executor after 5 settled feedback entries", () => {
    const feedback = Array.from({ length: 5 }, () => makeSettlement({ promoType: "bonus_bet" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.bonus_bet.level).toBe("Executor");
    expect(perType.bonus_bet.xp).toBe(5);
  });

  it("reaches Closer after 15 settled feedback entries", () => {
    const feedback = Array.from({ length: 15 }, () => makeSettlement({ promoType: "arb" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.arb.level).toBe("Closer");
    expect(perType.arb.xp).toBe(15);
  });

  it("reaches Shark after 30 settled feedback entries", () => {
    const feedback = Array.from({ length: 30 }, () => makeSettlement({ promoType: "profit_boost" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.profit_boost.level).toBe("Shark");
    expect(perType.profit_boost.xp).toBe(30);
  });

  it("ignores unsettled feedback", () => {
    const feedback = [
      { ...makeSettlement({ promoType: "insurance" }), status: "pending" },
      { ...makeSettlement({ promoType: "insurance" }), status: "placed" },
    ];
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.insurance.xp).toBe(0);
  });

  it("normalizes promo type aliases", () => {
    const feedback = Array.from({ length: 5 }, () => makeSettlement({ promoType: "free_bet" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.bonus_bet.level).toBe("Executor");
  });

  it("counts ledger entries at 0.5 XP for positive profit", () => {
    const ledger = Array.from({ length: 10 }, () => makeLedgerEntry({ type: "deposit_match", profit: "20" }));
    const { perType } = computeMastery(makeAppData({ ledger }));
    expect(perType.deposit_match.xp).toBe(5); // 10 * 0.5 = 5 XP → Executor
    expect(perType.deposit_match.level).toBe("Executor");
  });

  it("does not count ledger entries with zero or negative profit", () => {
    const ledger = Array.from({ length: 10 }, () => makeLedgerEntry({ type: "parlay", profit: "0" }));
    const { perType } = computeMastery(makeAppData({ ledger }));
    expect(perType.parlay.xp).toBe(0);
  });
});

describe("computeMastery — accuracy tracking", () => {
  it("tracks accuracy for settlements with both actual and expected profit", () => {
    const feedback = [
      makeSettlement({ promoType: "bonus_bet", actualProfit: "48", expectedProfit: "50" }), // within 10% → hit
      makeSettlement({ promoType: "bonus_bet", actualProfit: "30", expectedProfit: "50" }), // 40% off → miss
    ];
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.bonus_bet.accuracy).toBe(50);
  });

  it("returns null accuracy when no settlements have both values", () => {
    const feedback = [{ status: "settled", promoType: "bonus_bet" }];
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.bonus_bet.accuracy).toBeNull();
  });
});

describe("computeMastery — levelPct", () => {
  it("returns 100% levelPct for Shark (max level)", () => {
    const feedback = Array.from({ length: 35 }, () => makeSettlement({ promoType: "insurance" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    expect(perType.insurance.levelPct).toBe(100);
    expect(perType.insurance.level).toBe("Shark");
  });

  it("returns partial levelPct for in-progress levels", () => {
    const feedback = Array.from({ length: 8 }, () => makeSettlement({ promoType: "deposit_match" }));
    const { perType } = computeMastery(makeAppData({ resultFeedback: feedback }));
    // Executor: 5-14 XP, 8 XP is 3/10 = 30% through Executor level
    expect(perType.deposit_match.level).toBe("Executor");
    expect(perType.deposit_match.levelPct).toBe(30);
  });
});

describe("MASTERY_COLOR", () => {
  it("returns a color for every level", () => {
    for (const level of ["Analyst", "Executor", "Closer", "Shark"]) {
      expect(typeof MASTERY_COLOR[level]).toBe("string");
      expect(MASTERY_COLOR[level]).toMatch(/^#/);
    }
  });
});

describe("MASTERY_RANK", () => {
  it("Shark outranks Closer, Closer outranks Executor, Executor outranks Analyst", () => {
    expect(MASTERY_RANK.Shark).toBeGreaterThan(MASTERY_RANK.Closer);
    expect(MASTERY_RANK.Closer).toBeGreaterThan(MASTERY_RANK.Executor);
    expect(MASTERY_RANK.Executor).toBeGreaterThan(MASTERY_RANK.Analyst);
  });
});

describe("PROMO_TYPE_KEYS catalog integrity", () => {
  it("has 8 promo type keys", () => {
    expect(PROMO_TYPE_KEYS).toHaveLength(8);
  });

  it("every key has a non-empty label in PROMO_LABELS", () => {
    for (const key of PROMO_TYPE_KEYS) {
      expect(typeof PROMO_LABELS[key]).toBe("string");
      expect(PROMO_LABELS[key].length).toBeGreaterThan(0);
    }
  });

  it("perType result includes label for every key", () => {
    const { perType } = computeMastery(makeAppData());
    for (const key of PROMO_TYPE_KEYS) {
      expect(typeof perType[key].label).toBe("string");
      expect(perType[key].label.length).toBeGreaterThan(0);
    }
  });

  it("MASTERY_NEXT_XP is null at Shark (max level)", () => {
    expect(MASTERY_NEXT_XP.Shark).toBeNull();
  });

  it("MASTERY_NEXT_XP thresholds increase with level", () => {
    expect(MASTERY_NEXT_XP.Executor).toBeGreaterThan(MASTERY_NEXT_XP.Analyst);
    expect(MASTERY_NEXT_XP.Closer).toBeGreaterThan(MASTERY_NEXT_XP.Executor);
  });
});
