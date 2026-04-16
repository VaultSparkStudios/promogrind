import { describe, expect, it } from "vitest";
import {
  formatPromoTypeLabel,
  isWorkflowOpen,
  normalizeCalculatorSlug,
  normalizePromoType,
  normalizeRecommendation,
  normalizeWorkflowEntry,
  normalizeWorkflowStatus,
  summarizeWorkflows,
} from "../promograph/index.js";

describe("promograph helpers", () => {
  it("normalizes promo vocab into shared canonical types", () => {
    expect(normalizePromoType("odds_boost")).toBe("profit_boost");
    expect(normalizePromoType("sgp_insurance")).toBe("insurance");
    expect(formatPromoTypeLabel("safety_net")).toBe("Safety Net");
  });

  it("normalizes calculator slugs and recommendation payloads", () => {
    expect(normalizeCalculatorSlug("deposit-match-calculator")).toBe("deposit-match");
    const recommendation = normalizeRecommendation({
      promoType: "odds_boost",
      calculatorSlug: "deposit-match-calculator",
      opportunityScore: "104",
      bookTarget: "DraftKings",
      opsTags: ["reload", "", null],
    });
    expect(recommendation.promoType).toBe("profit_boost");
    expect(recommendation.calculatorSlug).toBe("deposit-match");
    expect(recommendation.opportunityScore).toBe(100);
    expect(recommendation.opsTags).toEqual(["reload"]);
  });

  it("normalizes workflow state and summarizes open work", () => {
    expect(normalizeWorkflowStatus("pending")).toBe("waiting");
    expect(isWorkflowOpen("ready")).toBe(true);
    expect(isWorkflowOpen("settled")).toBe(false);

    const summary = summarizeWorkflows([
      { id: "a", status: "placed", promoType: "bonus_bet" },
      { id: "b", status: "pending", promoType: "odds_boost" },
      { id: "c", status: "settled", promoType: "sgp_insurance" },
    ]);

    expect(summary.open).toHaveLength(2);
    expect(summary.waiting).toHaveLength(1);
    expect(summary.workflows[1].promoType).toBe("profit_boost");
    expect(summary.workflows[2].promoType).toBe("insurance");
  });

  it("normalizes workflow entries into a stable shape", () => {
    const workflow = normalizeWorkflowEntry({
      id: "entry-1",
      calculatorSlug: "deposit-match-calculator",
      promoType: "odds_boost",
      status: "open",
      expectedProfit: "14.20",
      bookTarget: "FanDuel",
    });

    expect(workflow.calculatorSlug).toBe("deposit-match");
    expect(workflow.status).toBe("waiting");
    expect(workflow.expectedProfit).toBe(14.2);
    expect(workflow.book).toBe("FanDuel");
  });
});
