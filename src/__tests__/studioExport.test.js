import { describe, expect, it } from "vitest";
import { appendStudioContractHistory, buildStudioSnapshot } from "../studio/export.js";
import { buildTargetedAlertPlan } from "../operator/briefing.js";

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

    expect(snapshot.schemaVersion).toBe("2.1");
    expect(snapshot.summary.workflowCount).toBeGreaterThan(0);
    expect(snapshot.workflows.top[0].title).toBe("Finish DraftKings bonus conversion");
    expect(snapshot.intelligence.driftAlerts.length).toBeGreaterThan(0);
    expect(snapshot.feeds.priorities.length).toBeGreaterThan(0);
    expect(snapshot.feeds.anomalies.length).toBeGreaterThan(0);
    expect(snapshot.brief.headline).toBeTruthy();
    expect(snapshot.contract.surfaces).toContain("studio-hub");
  });

  it("publishes contract history entries with delta summaries", () => {
    const first = buildStudioSnapshot({
      workflowInbox: [{ id: "wf-1", title: "Ready workflow", status: "ready", promoType: "bonus_bet", calculatorSlug: "bonus-bet" }],
    }, { now: new Date("2026-04-16T12:00:00.000Z") });
    const second = buildStudioSnapshot({
      workflowInbox: [{ id: "wf-2", title: "Waiting workflow", status: "waiting", promoType: "profit_boost", calculatorSlug: "profit-boost" }],
      resultFeedback: [{ id: "rf-1", status: "settled", promoType: "profit_boost", expectedProfit: "20", actualProfit: "4" }],
    }, { now: new Date("2026-04-16T13:00:00.000Z") });

    const history1 = appendStudioContractHistory([], first, { publishedAt: "2026-04-16T12:00:00.000Z" });
    const history2 = appendStudioContractHistory(history1, second, { publishedAt: "2026-04-16T13:00:00.000Z" });

    expect(history1[0].delta.changeType).toBe("initial");
    expect(history2[0].delta.changeType).toBe("delta");
    expect(history2[0].delta.summary).toMatch(/drift alerts|workflow count|brief focus/i);
  });

  it("exposes brief.topPlaybook as a structured object when a playbook matches", () => {
    const snapshot = buildStudioSnapshot({
      bankroll: "600",
      done: { DraftKings: true, FanDuel: true },
      workflowInbox: [
        { id: "wf-1", title: "Bonus bet workflow", status: "ready", promoType: "bonus_bet", calculatorSlug: "bonus-bet" },
      ],
    }, { bankroll: "600" });

    expect(snapshot.brief.topPlaybook).not.toBeNull();
    expect(snapshot.brief.topPlaybook.id).toBeTruthy();
    expect(snapshot.brief.topPlaybook.name).toBeTruthy();
    expect(typeof snapshot.brief.topPlaybook.fitScore).toBe("number");
    expect(Array.isArray(snapshot.brief.topPlaybook.fitReasons)).toBe(true);
    expect(snapshot.brief.topPlaybook.stepCount).toBeGreaterThan(0);
    expect(snapshot.brief.followUps.some((f) => f.includes("Try:"))).toBe(true);
  });

  it("brief.topPlaybook is null when no books are active", () => {
    const snapshot = buildStudioSnapshot({ bankroll: "600", done: {} }, { bankroll: "600" });
    expect(snapshot.brief.topPlaybook).toBeNull();
  });

  it("buildSummaryDelta tracks playbook rotation between snapshots", () => {
    const snap1 = buildStudioSnapshot({
      bankroll: "600",
      done: { DraftKings: true, FanDuel: true },
      workflowInbox: [{ id: "wf-1", title: "Bonus work", status: "ready", promoType: "bonus_bet", calculatorSlug: "bonus-bet" }],
    }, { bankroll: "600" });
    const snap2 = buildStudioSnapshot({
      bankroll: "600",
      done: { DraftKings: true, FanDuel: true },
      workflowInbox: [{ id: "wf-2", title: "Boost work", status: "ready", promoType: "profit_boost", calculatorSlug: "profit-boost" }],
    }, { bankroll: "600" });

    const h1 = appendStudioContractHistory([], snap1, { publishedAt: "2026-04-17T10:00:00.000Z" });
    const h2 = appendStudioContractHistory(h1, snap2, { publishedAt: "2026-04-17T11:00:00.000Z" });

    expect(h1[0].summary.topPlaybookId).toBeTruthy();
    expect(h2[0].summary.topPlaybookId).toBeTruthy();

    if (h1[0].summary.topPlaybookId !== h2[0].summary.topPlaybookId) {
      expect(h2[0].delta.summary).toMatch(/playbook rotated/i);
    }
  });

  it("buildSummaryDelta records topPlaybookId in history summary", () => {
    const snap = buildStudioSnapshot({
      bankroll: "600",
      done: { DraftKings: true, FanDuel: true },
    }, { bankroll: "600" });

    const history = appendStudioContractHistory([], snap, { publishedAt: "2026-04-17T10:00:00.000Z" });
    expect(history[0].summary).toHaveProperty("topPlaybookId");
    expect(history[0].summary).toHaveProperty("topPlaybookName");
  });

  it("builds a targeted alert plan from operator state", () => {
    const snapshot = buildStudioSnapshot({
      workflowInbox: [{ id: "wf-1", title: "Finish boost", status: "ready", promoType: "profit_boost", calculatorSlug: "profit-boost", source: "ai_action_plan", opportunityScore: 88 }],
      resultFeedback: [{ id: "rf-1", status: "settled", promoType: "profit_boost", expectedProfit: "18", actualProfit: "5", calculatorAccurate: "no", source: "calculator_result", book: "FanDuel" }],
    }, { now: new Date("2026-04-16T12:00:00.000Z"), bankroll: "250" });

    const plan = buildTargetedAlertPlan({ snapshot, dashboard: { expiringBooks: [], openBets: [] } });
    expect(plan.primary.headline).toBeTruthy();
    expect(plan.queue.length).toBeGreaterThan(0);
  });
});
