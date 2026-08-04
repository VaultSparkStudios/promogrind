import { describe, expect, it } from "vitest";
import { analyzeExposureClusters } from "../lib/exposureClusters.js";

describe("exposure concentration topology", () => {
  it("separates equal gross exposure into materially different concentration shapes", () => {
    const concentrated = analyzeExposureClusters([
      { id: "a", stake: 50, eventId: "evt-1", market: "moneyline", book: "Book A" },
      { id: "b", stake: 50, eventId: "evt-1", market: "total", book: "Book B" },
      { id: "c", stake: 50, eventId: "evt-1", market: "spread", book: "Book C" },
    ]);
    const distributed = analyzeExposureClusters([
      { id: "a", stake: 50, eventId: "evt-1", market: "moneyline", book: "Book A" },
      { id: "b", stake: 50, eventId: "evt-2", market: "total", book: "Book B" },
      { id: "c", stake: 50, eventId: "evt-3", market: "spread", book: "Book C" },
    ]);
    expect(concentrated.grossExposure).toBe(distributed.grossExposure);
    expect(concentrated.largestCluster).toMatchObject({ dimension: "event", count: 3, stake: 150 });
    expect(concentrated.concentrationPct).toBe(100);
    expect(distributed.largestCluster).toBeNull();
  });

  it("uses event labels conservatively and never correlates generic market names across events", () => {
    const result = analyzeExposureClusters([
      { id: "a", stake: 40, game: "Chiefs vs Bills", market: "Moneyline", book: "Book A" },
      { id: "b", stake: 60, game: "Chiefs vs Bills", market: "Moneyline", book: "Book B" },
      { id: "c", stake: 50, game: "Lakers vs Heat", market: "Moneyline", book: "Book C" },
    ]);
    expect(result.largestCluster).toMatchObject({ dimension: "event-market", count: 2, stake: 100, confidence: "medium" });
    expect(result.marketClusters).toHaveLength(2);
  });

  it("reports unknown event metadata rather than manufacturing a correlation", () => {
    const result = analyzeExposureClusters([
      { id: "a", stake: 25, book: "Book A", type: "Moneyline" },
      { id: "b", stake: 30, book: "Book B", type: "Moneyline" },
    ]);
    expect(result.unknownEventCount).toBe(2);
    expect(result.unknownEventStake).toBe(55);
    expect(result.eventClusters).toEqual([]);
    expect(result.largestCluster).toBeNull();
  });

  it("labels book concentration as operational and lower-confidence than shared-event evidence", () => {
    const result = analyzeExposureClusters([
      { id: "a", stake: 30, book: "Book A" },
      { id: "b", stake: 50, book: "Book A" },
    ]);
    expect(result.largestCluster).toMatchObject({ dimension: "book", count: 2, stake: 80 });
    expect(result.confidence).toBe("low");
  });

  it("recognizes only declared hedges and keeps their stakes gross and unnetted", () => {
    const result = analyzeExposureClusters([
      { id: "qualifier", stake: 100, eventId: "evt-1", marketId: "ml", book: "Book A" },
      { id: "cover", stake: 82, eventId: "evt-1", marketId: "ml", book: "Book B", hedgeOf: "qualifier" },
    ]);
    expect(result.grossExposure).toBe(182);
    expect(result.hedgePairCount).toBe(1);
    expect(result.largestCluster.hedgePosture).toBe("declared-hedge-present");
    expect(result.disclosure).toMatch(/unnetted/);
  });

  it("does not treat opposite-looking selections as a hedge without an explicit relationship", () => {
    const result = analyzeExposureClusters([
      { id: "a", stake: 50, game: "A vs B", market: "total", selection: "over" },
      { id: "b", stake: 50, game: "A vs B", market: "total", selection: "under" },
    ]);
    expect(result.hedgePairCount).toBe(0);
    expect(result.disclosure).toMatch(/not statistical correlation/);
  });
});
