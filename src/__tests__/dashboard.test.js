import { describe, expect, it } from "vitest";
import { buildAdaptivePromoPlan, getBankrollPosture, getDashboardSnapshot, getNextBestAction, getTodayPromos, getUnfinishedWork, inferPromoTypeFromSchedule } from "../dashboard/today.js";

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
        userState: "NC",
        bookStatus: { FanDuel: "pending", BetMGM: "limited" },
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
    expect(["BetRivers", "bet365", "FanDuel", "ESPN BET", "Fanatics"]).toContain(snapshot.recommendedBooks[0]?.book.name);
    expect(snapshot.adaptivePlan).toBeTruthy();
    expect(snapshot.adaptivePlan.mode).toBe("capture");
  });

  it("infers promo type keywords from schedule entries", () => {
    expect(inferPromoTypeFromSchedule({ promo: "NBA Profit Boost" })).toBe("profit_boost");
    expect(inferPromoTypeFromSchedule({ promo: "$200 Bonus Bet if your first bet loses" })).toBe("bonus_bet");
    expect(inferPromoTypeFromSchedule({ promo: "Same Game Parlay insurance" })).toBe("safety_net");
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
      recommendedBooks: [{ book: { name: "bet365", value: "$200-$365" }, reason: "Available now" }],
      hasLedger: false,
    });

    expect(items.map((item) => item.key)).toEqual(["expiring", "open-bets", "books-left", "recommended-book", "ledger"]);
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

  it("personalizes the next book CTA by state and account status", () => {
    const action = getNextBestAction({
      usageLog: { "bonus-bet": 1 },
      bankroll: "500",
      totalProfit: 0,
      openBets: [],
      booksComplete: 1,
      userState: "NC",
      done: { DraftKings: true },
      bookStatus: { FanDuel: "pending", BetMGM: "limited" },
    });

    expect(action.key).toBe("books-personalized");
    expect(action.slug).toBe("sportsbooks");
    expect(action.title).toMatch(/BetRivers|FanDuel|ESPN BET|Fanatics|bet365/);
  });

  it("surfaces a matched playbook as next best action when it scores highest", () => {
    const topPlaybook = {
      playbook: {
        id: "bonus-bet-convert",
        name: "Bonus Bet Conversion",
        summary: "Convert bonus bets into guaranteed cash via a hedge.",
        steps: [{ calculatorSlug: "bonus-bet" }, { calculatorSlug: "hedge" }],
        tone: "positive",
      },
      fitScore: 85,
      reasons: [{ tone: "positive", text: "bankroll ≥ $200" }, { tone: "positive", text: "2 active books" }],
      applicable: true,
    };

    const action = getNextBestAction({
      usageLog: { "bonus-bet": 1 },
      bankroll: "500",
      totalProfit: 10,
      openBets: [],
      booksComplete: 2,
      openWorkflowCount: 0,
      recommendedBooks: [],
      topPlaybook,
    });

    expect(String(action.key).startsWith("playbook:")).toBe(true);
    expect(action.title).toMatch(/Bonus Bet Conversion/);
    expect(action.focus?.type).toBe("playbook");
    expect(action.focus?.playbookId).toBe("bonus-bet-convert");
    expect(action.cta).toBe("Run playbook");
    expect(action.slug).toBe("bonus-bet");
  });

  it("does not surface a non-applicable playbook as next best action", () => {
    const topPlaybook = {
      playbook: {
        id: "deposit-match-build",
        name: "Deposit Match Build",
        summary: "New-book deposit match deployed gradually.",
        steps: [{ calculatorSlug: "deposit-match" }],
        tone: "watch",
      },
      fitScore: 25,
      reasons: [{ tone: "risk", text: "needs $1000 bankroll" }],
      applicable: false,
    };

    const action = getNextBestAction({
      usageLog: { "bonus-bet": 1 },
      bankroll: "200",
      totalProfit: 10,
      openBets: [],
      booksComplete: 2,
      openWorkflowCount: 0,
      topPlaybook,
    });

    expect(String(action.key).startsWith("playbook:")).toBe(false);
  });

  it("builds an adaptive promo plan that presses hot lanes and flags cold ones", () => {
    const now = new Date("2026-04-14T13:00:00Z");
    const snapshot = getDashboardSnapshot(
      {
        ledger: [
          { book: "DraftKings", profit: "14", date: "2026-04-14" },
          { book: "DraftKings", profit: "12", date: "2026-04-13" },
          { book: "DraftKings", profit: "10", date: "2026-04-12" },
        ],
        resultFeedback: [
          { id: "a", calculatorKey: "bonus-bet", promoType: "bonus_bet", status: "settled", expectedProfit: "10", actualProfit: "14", calculatorAccurate: "yes", book: "DraftKings", updatedAt: "2026-04-14T09:00:00Z" },
          { id: "b", calculatorKey: "bonus-bet", promoType: "bonus_bet", status: "settled", expectedProfit: "9", actualProfit: "13", calculatorAccurate: "yes", book: "DraftKings", updatedAt: "2026-04-13T09:00:00Z" },
          { id: "c", calculatorKey: "bonus-bet", promoType: "bonus_bet", status: "settled", expectedProfit: "8", actualProfit: "11", calculatorAccurate: "yes", book: "DraftKings", updatedAt: "2026-04-12T09:00:00Z" },
          { id: "d", calculatorKey: "profit-boost", promoType: "profit_boost", status: "settled", expectedProfit: "10", actualProfit: "-4", calculatorAccurate: "no", book: "FanDuel", updatedAt: "2026-04-14T09:10:00Z" },
          { id: "e", calculatorKey: "profit-boost", promoType: "profit_boost", status: "settled", expectedProfit: "10", actualProfit: "-6", calculatorAccurate: "no", book: "FanDuel", updatedAt: "2026-04-13T09:10:00Z" },
          { id: "f", calculatorKey: "profit-boost", promoType: "profit_boost", status: "settled", expectedProfit: "10", actualProfit: "-7", calculatorAccurate: "no", book: "FanDuel", updatedAt: "2026-04-12T09:10:00Z" },
        ],
      },
      [
        { book: "DraftKings", promo: "Daily Bonus Bet", day: "Daily", grade: "A", value: "+$12" },
        { book: "FanDuel", promo: "Daily Profit Boost", day: "Daily", grade: "A", value: "+$14" },
      ],
      now,
      "500",
    );

    const plan = buildAdaptivePromoPlan({
      data: {
        resultFeedback: snapshot.trackInsights.feedbackEntries,
        ledger: [{ book: "DraftKings", profit: "14", date: "2026-04-14" }],
      },
      snapshot,
      schedule: [
        { book: "DraftKings", promo: "Daily Bonus Bet", day: "Daily", grade: "A", value: "+$12" },
        { book: "FanDuel", promo: "Daily Profit Boost", day: "Daily", grade: "A", value: "+$14" },
      ],
      now,
      insights: snapshot.trackInsights,
      hotLanes: snapshot.hotLanes,
    });

    expect(plan.topLane?.key).toBe("bonus_bet");
    expect(plan.coldLane?.key).toBe("profit_boost");
    expect(plan.topPromos[0].book).toBe("DraftKings");
    expect(plan.topPromos[0].reasons.some((reason) => ["hot lane", "book running hot"].includes(reason))).toBe(true);
  });
});
