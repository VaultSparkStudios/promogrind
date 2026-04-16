import { describe, expect, it } from "vitest";
import { buildWorkflowInbox } from "../workflows/inbox.js";
import { buildStudioSnapshot } from "../studio/export.js";

describe("workflow inbox", () => {
  it("scores and orders open workflows from workflow inbox and feedback data", () => {
    const inbox = buildWorkflowInbox({
      done: { DraftKings: true },
      workflowInbox: [
        {
          id: "ai-1",
          title: "Claim DraftKings welcome offer",
          status: "queued",
          promoType: "bonus_bet",
          calculatorSlug: "bonus-bet",
          expectedProfit: 28,
          book: "DraftKings",
          opportunityScore: 88,
          source: "ai_action_plan",
          createdAt: "2026-04-15T10:00:00.000Z",
        },
      ],
      resultFeedback: [
        {
          id: "calc-1",
          title: "Settle Caesars boost",
          status: "waiting",
          promoType: "profit_boost",
          calculatorSlug: "profit-boost",
          expectedProfit: 12,
          book: "Caesars",
          source: "calculator_result",
          createdAt: "2026-04-15T09:00:00.000Z",
        },
      ],
    }, { bankroll: "500", now: new Date("2026-04-16T12:00:00.000Z") });

    expect(inbox.open).toHaveLength(2);
    expect(inbox.top[0].title).toBe("Claim DraftKings welcome offer");
    expect(inbox.top[0].score).toBeGreaterThan(inbox.top[1].score);
  });

  it("builds a compact Studio snapshot from live app data", () => {
    const snapshot = buildStudioSnapshot({
      workflowInbox: [
        { id: "wf-1", title: "Save AI action", status: "queued", promoType: "bonus_bet", calculatorSlug: "bonus-bet", source: "ai_action_plan" },
      ],
      resultFeedback: [
        { id: "rf-1", status: "settled", promoType: "bonus_bet", expectedProfit: 12, actualProfit: 10, calculatorAccurate: "yes", source: "calculator_result" },
      ],
      ledger: [
        { profit: "10", date: "2026-04-16", book: "DraftKings" },
      ],
    }, { now: new Date("2026-04-16T12:00:00.000Z"), bankroll: "500" });

    expect(snapshot.project).toBe("promogrind");
    expect(snapshot.workflows.openCount).toBe(1);
    expect(snapshot.growth.totalProfit).toBe(10);
    expect(snapshot.launch.validation.tests.lastKnown).toBe("158/158 passing");
  });
});
