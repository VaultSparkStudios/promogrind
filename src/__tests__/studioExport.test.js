import { describe, expect, it } from "vitest";
import { buildStudioSnapshot } from "../studio/export.js";

describe("studio export contract", () => {
  it("emits a versioned Studio contract with priorities and anomalies", () => {
    const snapshot = buildStudioSnapshot({
      bankroll: "250",
      ledger: [
        { book: "DraftKings", profit: "40", date: "2026-04-14" },
        { book: "FanDuel", profit: "-10", date: "2026-04-12" },
      ],
      workflowInbox: [
        {
          id: "wf-1",
          title: "Finish DraftKings bonus conversion",
          status: "ready",
          expectedProfit: "22",
          promoType: "bonus_bet",
          calculatorSlug: "bonus-bet",
          book: "DraftKings",
          source: "promo_advisor",
          createdAt: "2026-04-14T12:00:00Z",
          updatedAt: "2026-04-14T12:00:00Z",
        },
      ],
      resultFeedback: [
        {
          id: "rf-1",
          calculatorKey: "bonus-bet",
          calculatorLabel: "Bonus Bet Converter",
          promoType: "bonus_bet",
          status: "settled",
          expectedProfit: "18",
          actualProfit: "7",
          calculatorAccurate: "no",
          book: "DraftKings",
          createdAt: "2026-04-14T11:00:00Z",
          updatedAt: "2026-04-14T11:30:00Z",
        },
      ],
    }, { now: new Date("2026-04-14T13:00:00Z"), bankroll: "250" });

    expect(snapshot.schemaVersion).toBe("2.0");
    expect(snapshot.summary.workflowCount).toBeGreaterThan(0);
    expect(snapshot.workflows.top[0].title).toBe("Finish DraftKings bonus conversion");
    expect(snapshot.intelligence.driftAlerts.length).toBeGreaterThan(0);
    expect(snapshot.feeds.priorities.length).toBeGreaterThan(0);
    expect(snapshot.feeds.anomalies.length).toBeGreaterThan(0);
    expect(snapshot.contract.surfaces).toContain("studio-hub");
  });
});
