import { describe, expect, it } from "vitest";
import { computeMastery, MASTERY_COLOR, MASTERY_NEXT_REVIEWS, MASTERY_RANK, PROMO_LABELS, PROMO_TYPE_KEYS, REVIEW_DEPTH_BANDS } from "../lib/mastery.js";

const makeAppData = (overrides = {}) => ({ ledger: [], resultFeedback: [], ...overrides });
const settlement = (promoType = "bonus_bet", actualProfit = "12", expectedProfit = "10") => ({ status: "settled", promoType, actualProfit, expectedProfit });
const skip = (promoType = "bonus_bet", skipReason = "terms_unclear") => ({ status: "skipped", promoType, skipReason });

describe("computeMastery — review-depth policy", () => {
  it("starts at Observer and does not advance from profit or volume", () => {
    const ledger = Array.from({ length: 200 }, () => ({ type: "bonus_bet", profit: "1000" }));
    const mastery = computeMastery(makeAppData({ ledger }));
    expect(mastery.reviewDepthBand.name).toBe("Observer");
    expect(mastery.reviewCount).toBe(0);
    expect(mastery.totalProfit).toBe(200000);
    expect(mastery.perType.bonus_bet.reviews).toBe(0);
  });

  it.each([
    [5, "Reviewer"],
    [15, "Calibrator"],
    [30, "Steward"],
    [75, "Evidence Lead"],
  ])("reaches the %s-review global band %s", (count, band) => {
    const feedback = Array.from({ length: count }, () => settlement());
    expect(computeMastery(makeAppData({ resultFeedback: feedback })).reviewDepthBand.name).toBe(band);
  });

  it("counts realized settlements and reasoned skips, but not opens or empty outcomes", () => {
    const resultFeedback = [
      settlement("arb", "-5", "2"),
      skip("arb", "odds_moved"),
      { status: "skipped", promoType: "arb", skipReason: "" },
      { status: "settled", promoType: "arb", actualProfit: "" },
      { status: "placed", promoType: "arb" },
    ];
    const mastery = computeMastery(makeAppData({ resultFeedback }));
    expect(mastery.reviewCount).toBe(2);
    expect(mastery.perType.arb.reviews).toBe(2);
  });

  it("normalizes aliases and advances per-lane evidence bands", () => {
    const resultFeedback = Array.from({ length: 15 }, () => settlement("free_bet"));
    const lane = computeMastery(makeAppData({ resultFeedback })).perType.bonus_bet;
    expect(lane).toMatchObject({ level: "Calibrator", reviews: 15, nextReviews: 30, reviewPct: 0 });
  });

  it("uses paired estimates only for descriptive calibration accuracy", () => {
    const resultFeedback = [settlement("insurance", "48", "50"), settlement("insurance", "30", "50"), skip("insurance")];
    const lane = computeMastery(makeAppData({ resultFeedback })).perType.insurance;
    expect(lane.accuracy).toBe(50);
    expect(lane.reviews).toBe(3);
  });

  it("reports partial progress and 100% at the highest lane band", () => {
    const partial = computeMastery(makeAppData({ resultFeedback: Array.from({ length: 8 }, () => settlement("deposit_match")) })).perType.deposit_match;
    expect(partial).toMatchObject({ level: "Reviewer", reviews: 8, reviewPct: 30 });
    const max = computeMastery(makeAppData({ resultFeedback: Array.from({ length: 35 }, () => settlement("parlay")) })).perType.parlay;
    expect(max).toMatchObject({ level: "Steward", reviewPct: 100, nextReviews: null });
  });
});

describe("review-depth catalog integrity", () => {
  it("covers every lane and every evidence level", () => {
    expect(PROMO_TYPE_KEYS).toHaveLength(8);
    for (const key of PROMO_TYPE_KEYS) expect(PROMO_LABELS[key]).toBeTruthy();
    for (const level of ["Analyst", "Reviewer", "Calibrator", "Steward"]) expect(MASTERY_COLOR[level]).toMatch(/^#/);
    expect(MASTERY_RANK.Steward).toBeGreaterThan(MASTERY_RANK.Calibrator);
    expect(MASTERY_RANK.Calibrator).toBeGreaterThan(MASTERY_RANK.Reviewer);
    expect(MASTERY_NEXT_REVIEWS.Steward).toBeNull();
    expect(REVIEW_DEPTH_BANDS.at(-1).name).toBe("Observer");
  });
});
