import { describe, expect, it } from "vitest";
import { buildTrackInsights, calculatorAccuracy, formatPromoTypeLabel, updateResultFeedback, upsertResultFeedback } from "../track/insights.js";

describe("track insights helpers", () => {
  it("formats promo type labels for UI", () => {
    expect(formatPromoTypeLabel("bonus_bet")).toBe("Bonus Bet");
    expect(formatPromoTypeLabel("profit_boost")).toBe("Profit Boost");
  });

  it("creates and updates feedback entries safely", () => {
    const created = upsertResultFeedback([], {
      id: "one",
      calculatorKey: "bonus-bet",
      calculatorLabel: "Bonus Bet Converter",
      promoType: "bonus_bet",
      status: "placed",
      expectedProfit: "14.25",
      frictionReason: "odds_moved",
    });

    expect(created).toHaveLength(1);
    expect(created[0].expectedProfit).toBe(14.25);
    expect(created[0].frictionReason).toBe("odds_moved");

    const updated = updateResultFeedback(created, "one", {
      status: "settled",
      actualProfit: "13.8",
      calculatorAccurate: "close",
      note: "Hedge still available",
    });

    expect(updated[0].status).toBe("settled");
    expect(updated[0].actualProfit).toBe(13.8);
    expect(updated[0].calculatorAccurate).toBe("close");
    expect(updated[0].note).toBe("Hedge still available");
  });

  it("aggregates promo hit rate, profit, and book performance", () => {
    const insights = buildTrackInsights({
      ledger: [
        { book: "DraftKings", profit: "40", date: "2026-04-14" },
        { book: "FanDuel", profit: "-5", date: "2026-04-10" },
      ],
      resultFeedback: [
        {
          id: "a",
          calculatorKey: "bonus-bet",
          calculatorLabel: "Bonus Bet Converter",
          promoType: "bonus_bet",
          status: "settled",
          expectedProfit: "15",
          actualProfit: "14",
          calculatorAccurate: "yes",
          book: "DraftKings",
          createdAt: "2026-04-14T12:00:00Z",
        },
        {
          id: "b",
          calculatorKey: "profit-boost",
          calculatorLabel: "Profit Boost Converter",
          promoType: "profit_boost",
          status: "settled",
          expectedProfit: "10",
          actualProfit: "-2",
          calculatorAccurate: "no",
          book: "FanDuel",
          createdAt: "2026-04-14T12:05:00Z",
        },
        {
          id: "c",
          calculatorKey: "first-bet",
          calculatorLabel: "First Bet Safety Net",
          promoType: "safety_net",
          status: "placed",
          expectedProfit: "22",
          book: "BetMGM",
          createdAt: "2026-04-14T12:10:00Z",
        },
        {
          id: "d",
          calculatorKey: "ev",
          calculatorLabel: "Expected Value Calculator",
          promoType: "other",
          status: "skipped",
          expectedProfit: "8",
          skipReason: "odds_moved",
          note: "Market moved before entry",
          createdAt: "2026-04-14T12:15:00Z",
        },
      ],
    }, new Date("2026-04-14T13:00:00Z"));

    expect(insights.totalProfit).toBe(35);
    expect(insights.settledCount).toBe(2);
    expect(insights.openFeedback).toHaveLength(1);
    expect(insights.skippedFeedback).toHaveLength(1);
    expect(insights.hitRate).toBe(50);
    expect(insights.accuracyRate).toBe(50);
    expect(Math.round(insights.executionRate)).toBe(75);
    expect(insights.promoTypeRows.find((row) => row.key === "bonus_bet")?.actualProfit).toBe(14);
    expect(insights.bookRows[0].book).toBe("DraftKings");
    expect(insights.skipReasonRows[0].key).toBe("odds_moved");
    expect(insights.sourceRows.find((row) => row.key === "result_feedback")?.settled).toBe(2);
    expect(insights.workflowTimeline[0].id).toBe("d");
    expect(insights.selfCalibration.averageDrift).toBe(-6.5);
    expect(insights.selfCalibrationRows.length).toBeGreaterThan(0);
    expect(insights.selfCalibrationRows[0]).toHaveProperty("label");
    expect(insights.driftAlerts.length).toBeGreaterThan(0);
    expect(insights.topDriftAlerts[0]).toHaveProperty("summary");
    expect(insights.topDriftAlerts.some((alert) => alert.direction === "negative")).toBe(true);
  });

  it("computes adaptive trust score per calculator with scoping", () => {
    const feedback = Array.from({ length: 12 }, (_, i) => ({
      id: `bb-${i}`,
      calculatorKey: "bonus-bet",
      promoType: "bonus_bet",
      status: "settled",
      expectedProfit: "15",
      actualProfit: i < 10 ? "16" : "4",
      calculatorAccurate: i < 10 ? "yes" : "no",
      book: i % 2 === 0 ? "DraftKings" : "FanDuel",
    }));
    feedback.push({
      id: "pb-1",
      calculatorKey: "profit-boost",
      promoType: "profit_boost",
      status: "settled",
      expectedProfit: "8",
      actualProfit: "8",
      calculatorAccurate: "yes",
      book: "Caesars",
    });

    const all = calculatorAccuracy({ feedback, calculatorKey: "bonus-bet" });
    expect(all.sampleSize).toBe(12);
    expect(Math.round(all.accuracyRate)).toBe(83);
    expect(all.confidence).toBe("high");
    expect(all.averageDrift).toBeCloseTo((10 * 1 + 2 * -11) / 12, 5);

    const byBook = calculatorAccuracy({ feedback, calculatorKey: "bonus-bet", book: "DraftKings" });
    expect(byBook.sampleSize).toBe(6);

    const empty = calculatorAccuracy({ feedback, calculatorKey: "no-such-calc" });
    expect(empty.sampleSize).toBe(0);
    expect(empty.confidence).toBeNull();

    const lowSample = calculatorAccuracy({ feedback, calculatorKey: "profit-boost" });
    expect(lowSample.sampleSize).toBe(1);
    expect(lowSample.confidence).toBe("low");
    expect(lowSample.label).toMatch(/Building confidence/);
  });
});
