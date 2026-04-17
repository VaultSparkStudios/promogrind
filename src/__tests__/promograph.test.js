import { describe, expect, it } from "vitest";
import {
  formatPromoTypeLabel,
  isWorkflowOpen,
  normalizeCalculatorSlug,
  normalizePromoType,
  normalizeRecommendation,
  resolveWorkflowStatusConflict,
  selectOperatingDecision,
  normalizeWorkflowEntry,
  normalizeWorkflowStatus,
  summarizeWorkflows,
} from "../promograph/index.js";
import { recommendationToWorkflow } from "../promograph/recommendations.js";

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

  it("selects a shared operating decision with drift alerts overriding lower-priority actions", () => {
    const decision = selectOperatingDecision({
      actionCandidates: [
        { key: "books", title: "Open a book", body: "General setup", cta: "Open tracker", slug: "sportsbooks", tone: "watch", score: 70 },
      ],
      topWorkflow: { title: "Finish workflow", status: "ready", score: 93, calculatorSlug: "bonus-bet", scoreSummary: "score 93" },
      driftAlerts: [{ label: "Profit Boost drift", summary: "Expected edge is underperforming.", direction: "negative", severity: "high", averageDrift: -14.2 }],
      openWorkflowCount: 2,
      waitingWorkflowCount: 1,
      readinessScore: 82,
      posture: "watch",
    });

    expect(decision.key).toBe("drift-alert");
    expect(decision.slug).toBe("track");
    expect(decision.followUps).toContain("2 workflows are still open.");
  });

  it("resolves workflow conflicts so terminal states beat stale transient writes", () => {
    const local = {
      id: "w1",
      status: "settled",
      actualProfit: 22.5,
      updatedAt: "2026-04-15T10:00:00Z",
    };
    const remote = {
      id: "w1",
      status: "placed",
      updatedAt: "2026-04-16T10:00:00Z",
    };
    const winner = resolveWorkflowStatusConflict(local, remote);
    expect(winner.status).toBe("settled");
    expect(winner.actualProfit).toBe(22.5);

    const neither = resolveWorkflowStatusConflict(
      { id: "w2", status: "ready", updatedAt: "2026-04-16T09:00:00Z" },
      { id: "w2", status: "placed", updatedAt: "2026-04-16T10:00:00Z" },
    );
    expect(neither.status).toBe("placed");
  });

  it("converts an AI recommendation into a canonical workflow entry", () => {
    const workflow = recommendationToWorkflow(
      {
        promoType: "odds_boost",
        calculatorSlug: "deposit-match-calculator",
        bookTarget: "FanDuel",
        opportunityScore: "88",
        confidence: "high",
        opsTags: ["reload"],
      },
      { title: "Run FanDuel reload", source: "promo_advisor", calculatorLabel: "Promo Advisor" },
    );

    expect(workflow.status).toBe("queued");
    expect(workflow.promoType).toBe("profit_boost");
    expect(workflow.calculatorSlug).toBe("deposit-match");
    expect(workflow.book).toBe("FanDuel");
    expect(workflow.source).toBe("promo_advisor");
    expect(workflow.opportunityScore).toBe(88);
    expect(workflow.actionability).toBe(88);
  });
});
