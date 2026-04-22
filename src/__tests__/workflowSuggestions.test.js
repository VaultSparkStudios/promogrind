import { describe, expect, it } from "vitest";
import { communityPromoToWorkflow, launchBlockerToWorkflow, scannerOpportunityToWorkflow } from "../workflows/suggestions.js";

describe("workflow suggestions", () => {
  it("builds arb scanner opportunities into workflow entries", () => {
    const workflow = scannerOpportunityToWorkflow({
      game: "Chiefs vs Bills",
      market: "Moneyline",
      roi: "2.4",
      b1: "DraftKings",
      b2: "FanDuel",
      n1: "Chiefs",
      n2: "Bills",
      s1: "48.80",
      s2: "51.20",
      start: "2026-04-23T19:00:00.000Z",
      sport: "NFL",
    }, "arb", { bankroll: "1000" });

    expect(workflow.source).toBe("live_scanner");
    expect(workflow.calculatorSlug).toBe("arb-2way");
    expect(workflow.promoType).toBe("arb");
    expect(workflow.book).toContain("DraftKings");
    expect(workflow.expectedProfit).toBeGreaterThan(20);
  });

  it("builds community promos into calculator-targeted workflows", () => {
    const workflow = communityPromoToWorkflow({
      book: "DraftKings",
      promo_type: "Deposit Match",
      description: "[NY] 20% match up to $1,000",
      value: "$200-$1,000",
      upvotes: 4,
      expires_at: "2026-04-30",
    });

    expect(workflow.source).toBe("community_promo");
    expect(workflow.calculatorSlug).toBe("deposit-match");
    expect(workflow.promoType).toBe("deposit_match");
    expect(workflow.confidence).toBe("high");
  });

  it("builds launch blockers into workflow inbox entries", () => {
    const workflow = launchBlockerToWorkflow({
      key: "stripeSmoke",
      label: "Stripe smoke test",
      detail: "Run one real checkout and customer-portal pass against the deployed app before launch.",
      status: "manual",
    }, { index: 1 });

    expect(workflow.source).toBe("launch_command_center");
    expect(workflow.calculatorSlug).toBe("dashboard");
    expect(workflow.title).toMatch(/Launch: Stripe smoke test/);
    expect(workflow.opportunityScore).toBeGreaterThanOrEqual(70);
  });
});
