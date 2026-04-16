import { describe, expect, it } from "vitest";
import { getBankrollPosture, getDashboardSnapshot, getNextBestAction, getTodayPromos, getUnfinishedWork } from "../dashboard/today.js";

const schedule = [
  { book: "DraftKings", promo: "Daily Boost", day: "Daily", value: "+$9" },
  { book: "FanDuel", promo: "Monday SGP", day: "Monday", value: "+$12" },
  { book: "Caesars", promo: "Weekend Profit Boost", day: "Weekend", value: "+$10" },
];

describe("dashboard helpers", () => {
  it("returns daily and weekday promos for the current day", () => {
    const promos = getTodayPromos(schedule, new Date("2026-04-13T12:00:00Z"));
    expect(promos.map((promo) => promo.promo)).toEqual(["Daily Boost", "Monday SGP"]);
  });

  it("includes weekend promos on Saturday", () => {
    const promos = getTodayPromos(schedule, new Date("2026-04-18T12:00:00Z"));
    expect(promos.map((promo) => promo.promo)).toContain("Weekend Profit Boost");
  });

  it("builds a coherent snapshot from bets, ledger, book progress, and expiry", () => {
    const snapshot = getDashboardSnapshot(
      {
        bets: [
          { stake: "50", status: "open" },
          { stake: "25", status: "pending" },
          { stake: "40", status: "won" },
        ],
        ledger: [
          { profit: "40", date: "2026-04-14" },
          { profit: "-10", date: "2026-04-12" },
          { profit: "18", date: "2026-03-20" },
        ],
        done: { DraftKings: true },
        bookExpiry: { FanDuel: "2026-04-15", Caesars: "2026-04-25" },
        resultFeedback: [
          { id: "wf-1", status: "placed", promoType: "bonus_bet" },
          { id: "wf-2", status: "pending", promoType: "odds_boost" },
        ],
        workflowInbox: [
          { id: "wf-3", title: "Highest value workflow", status: "queued", promoType: "bonus_bet", calculatorSlug: "bonus-bet", opportunityScore: 90, expectedProfit: 20 },
        ],
      },
      schedule,
      new Date("2026-04-14T09:00:00Z"),
      "500",
    );

    expect(snapshot.totalProfit).toBe(48);
    expect(snapshot.monthProfit).toBe(30);
    expect(snapshot.openBets).toHaveLength(2);
    expect(snapshot.openStake).toBe(75);
    expect(snapshot.booksComplete).toBe(1);
    expect(snapshot.recentSettledProfit).toBe(30);
    expect(snapshot.expiringBooks.map((book) => book.name)).toContain("FanDuel");
    expect(snapshot.openWorkflowCount).toBe(3);
    expect(snapshot.waitingWorkflowCount).toBe(1);
    expect(snapshot.topWorkflow?.title).toBe("Highest value workflow");
  });

  it("classifies bankroll posture from open exposure", () => {
    expect(getBankrollPosture({ bankroll: null, openStake: 0 }).tone).toBe("missing");
    expect(getBankrollPosture({ bankroll: 500, openStake: 20 }).tone).toBe("healthy");
    expect(getBankrollPosture({ bankroll: 500, openStake: 100 }).tone).toBe("watch");
    expect(getBankrollPosture({ bankroll: 500, openStake: 200 }).tone).toBe("high");
  });

  it("surfaces unfinished work from the snapshot", () => {
    const items = getUnfinishedWork({
      expiringBooks: [{ name: "FanDuel", bonus: 200 }],
      openBets: [{ id: 1 }],
      booksRemaining: 3,
      potentialLeft: 455.5,
      hasLedger: false,
    });

    expect(items.map((item) => item.key)).toEqual(["expiring", "open-bets", "books-left", "ledger"]);
  });

  it("picks the highest-priority next action", () => {
    const action = getNextBestAction({
      usageLog: {},
      bankroll: "",
      totalProfit: 0,
      openBets: [],
      booksComplete: 0,
    });

    expect(action.key).toBe("bankroll");
    expect(action.slug).toBe("dashboard");
  });

  it("surfaces queued workflows before open bets when bankroll and calculators already exist", () => {
    const action = getNextBestAction({
      usageLog: { "bonus-bet": 2 },
      bankroll: "500",
      totalProfit: 42,
      openBets: [],
      booksComplete: 2,
      openWorkflowCount: 3,
      topWorkflow: { title: "Claim best reload", summary: "Highest scoring workflow.", scoreSummary: "score 97 · DraftKings is profitable", status: "queued", score: 97, calculatorSlug: "bonus-bet" },
    });

    expect(action.key).toBe("workflow-focus");
    expect(action.slug).toBe("bonus-bet");
    expect(action.body).toMatch(/DraftKings is profitable/);
  });
});
