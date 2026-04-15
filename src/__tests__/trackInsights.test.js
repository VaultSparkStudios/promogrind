import { describe, expect, it } from "vitest";
import { buildTrackInsights, formatPromoTypeLabel, updateResultFeedback, upsertResultFeedback } from "../track/insights.js";

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
    });

    expect(created).toHaveLength(1);
    expect(created[0].expectedProfit).toBe(14.25);

    const updated = updateResultFeedback(created, "one", {
      status: "settled",
      actualProfit: "13.8",
      calculatorAccurate: "close",
    });

    expect(updated[0].status).toBe("settled");
    expect(updated[0].actualProfit).toBe(13.8);
    expect(updated[0].calculatorAccurate).toBe("close");
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
      ],
    }, new Date("2026-04-14T13:00:00Z"));

    expect(insights.totalProfit).toBe(35);
    expect(insights.settledCount).toBe(2);
    expect(insights.openFeedback).toHaveLength(1);
    expect(insights.hitRate).toBe(50);
    expect(insights.accuracyRate).toBe(50);
    expect(insights.promoTypeRows.find((row) => row.key === "bonus_bet")?.actualProfit).toBe(14);
    expect(insights.bookRows[0].book).toBe("DraftKings");
  });
});
