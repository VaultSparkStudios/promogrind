import { describe, expect, it } from "vitest";
import {
  buildOperatingActionCandidates,
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
      positiveOutcomeProbability: "0.64",
      probabilityBasis: "Known hedge prices at capture time.",
      bookTarget: "DraftKings",
      opsTags: ["reload", "", null],
    });
    expect(recommendation.promoType).toBe("profit_boost");
    expect(recommendation.calculatorSlug).toBe("deposit-match");
    expect(recommendation.opportunityScore).toBe(100);
    expect(recommendation.positiveOutcomeProbability).toBe(0.64);
    expect(recommendation.probabilityBasis).toBe("Known hedge prices at capture time.");
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

  it("surfaces a matched playbook as a first-class action candidate", () => {
    const topPlaybook = {
      playbook: {
        id: "bonus-bet-convert",
        name: "Bonus Bet Conversion",
        summary: "Convert free/bonus bets into guaranteed cash via a hedge.",
        steps: [{ calculatorSlug: "bonus-bet", title: "Run converter" }],
        tone: "positive",
      },
      fitScore: 85,
      applicable: true,
    };

    const candidates = buildOperatingActionCandidates({
      hasBankroll: true,
      hasCalc: true,
      affiliateReady: true,
      booksComplete: 2,
      topPlaybook,
    });

    const playbookCandidate = candidates.find((c) => c.key.startsWith("playbook:"));
    expect(playbookCandidate).toBeDefined();
    expect(playbookCandidate.key).toBe("playbook:bonus-bet-convert");
    expect(playbookCandidate.playbookId).toBe("bonus-bet-convert");
    expect(playbookCandidate.score).toBeGreaterThan(60);
    expect(playbookCandidate.slug).toBe("bonus-bet");
  });

  it("routes selectOperatingDecision to playbook focus type when playbook candidate wins", () => {
    const topPlaybook = {
      playbook: {
        id: "profit-boost-stack",
        name: "Profit Boost Stack",
        summary: "Deploy boosts on hedgeable favorites.",
        steps: [{ calculatorSlug: "profit-boost", title: "Size the boost" }],
        tone: "positive",
      },
      fitScore: 100,
      applicable: true,
    };

    const candidates = buildOperatingActionCandidates({
      hasBankroll: true,
      hasCalc: true,
      affiliateReady: true,
      booksComplete: 3,
      topPlaybook,
    });

    const decision = selectOperatingDecision({ actionCandidates: candidates });
    expect(decision.key).toBe("playbook:profit-boost-stack");
    expect(decision.focus.type).toBe("playbook");
    expect(decision.focus.playbookId).toBe("profit-boost-stack");
  });

  it("does not surface non-applicable playbooks as candidates", () => {
    const candidates = buildOperatingActionCandidates({
      hasBankroll: true,
      hasCalc: true,
      affiliateReady: true,
      booksComplete: 2,
      topPlaybook: { playbook: { id: "p1", name: "P1", steps: [] }, fitScore: 90, applicable: false },
    });

    expect(candidates.some((c) => c.key?.startsWith("playbook:"))).toBe(false);
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
        assumptions: ["$100 cap"],
        missingInputs: ["expiry"],
        sensitivityTriggers: ["odds move"],
        evidenceGrade: "partial",
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
    expect(workflow.assumptions).toEqual(["$100 cap"]);
    expect(workflow.missingInputs).toEqual(["expiry"]);
    expect(workflow.sensitivityTriggers).toEqual(["odds move"]);
    expect(workflow.evidenceGrade).toBe("partial");
  });
});
