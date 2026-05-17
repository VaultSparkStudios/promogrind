import { describe, expect, it } from "vitest";
import { buildAiUsageSnapshot, buildObservabilitySnapshot } from "../observability.js";

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
      aiEvents: [
        { event_type: "promo_chat", created_at: "2026-04-17T12:00:00.000Z", metadata: { remaining: 19 } },
        { event_type: "promo_advisor", created_at: "2026-04-16T12:00:00.000Z", metadata: { remaining: 4 } },
        { event_type: "daily_login", created_at: "2026-04-17T12:00:00.000Z" },
      ],
      now: new Date("2026-04-17T18:00:00.000Z"),
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
    expect(snapshot.activationFunnel.completion).toBeGreaterThan(0);
    // S89: affiliate links are advisory, not required for launch — partner programs
    // rejected/waitlisted; 5 books with personal referral links ship today.
    expect(snapshot.launchProofSummary.affiliateLinksReady).toBe(true);
    expect(snapshot.launchProofSummary.missingLaunchBooks).toEqual([]);
    expect(snapshot.aiUsage.today).toBe(1);
    expect(snapshot.aiUsage.week).toBe(2);
    expect(snapshot.aiUsage.topFeature).toBe("promo_chat");
  });

  it("flags bursty or exhausted AI usage as abuse risk", () => {
    const now = new Date("2026-04-17T18:00:00.000Z");
    const events = Array.from({ length: 8 }, (_, index) => ({
      event_type: index % 2 === 0 ? "promo_chat" : "stack_builder",
      created_at: `2026-04-17T17:5${index}:00.000Z`,
      metadata: { remaining: index === 7 ? 0 : 4 },
    }));

    const usage = buildAiUsageSnapshot(events, now);

    expect(usage.today).toBe(8);
    expect(usage.recentBurst).toBe(8);
    expect(usage.lowestRemaining).toBe(0);
    expect(usage.risk).toBe("high");
  });
});
