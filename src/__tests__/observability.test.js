import { describe, expect, it } from "vitest";
import { buildObservabilitySnapshot } from "../observability.js";

describe("observability snapshot", () => {
  it("summarizes activation, return loop, monetization, and sync health", () => {
    const snapshot = buildObservabilitySnapshot({
      appData: {
        done: { DraftKings: true, FanDuel: true },
        workflowInbox: [
          { id: "wf-1", status: "ready" },
          { id: "wf-2", status: "waiting" },
        ],
        resultFeedback: [
          { id: "rf-1", status: "settled" },
          { id: "rf-2", status: "queued" },
        ],
        ledger: [{ profit: "12.5" }],
        microNps: [{ value: "mixed", settledCount: 4, createdAt: "2026-04-16T12:00:00.000Z" }],
      },
      dashboardSnapshot: {
        booksComplete: 2,
        recentSettledProfit: 18.5,
        recentSettledCount: 3,
      },
      usageLog: { "bonus-bet": 3, "profit-boost": 2 },
      syncDiagnostics: { queueDepth: 2, hasPendingWrites: true },
    });

    expect(snapshot.calculatorsUsed).toBe(2);
    expect(snapshot.totalCalculations).toBe(5);
    expect(snapshot.openWorkflows).toBe(2);
    expect(snapshot.waitingWorkflows).toBe(1);
    expect(snapshot.settledFeedback).toBe(1);
    expect(snapshot.queueDepth).toBe(2);
    expect(snapshot.hasPendingWrites).toBe(true);
    expect(snapshot.latestMicroNps).toBe("mixed");
    expect(snapshot.activationScore).toBeGreaterThan(0);
  });
});
