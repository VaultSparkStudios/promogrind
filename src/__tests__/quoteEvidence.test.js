import { describe, expect, it } from "vitest";
import { analyzeEvOpportunities, evaluateQuoteCandidate } from "../lib/quoteEvidence.js";

const NOW = new Date("2026-08-04T22:00:00Z");
const updated = "2026-08-04T21:58:00Z";
const market = (home, away, point = null) => ({
  key: point == null ? "h2h" : "totals",
  outcomes: point == null
    ? [{ name: "Home", price: home }, { name: "Away", price: away }]
    : [{ name: "Over", point, price: home }, { name: "Under", point, price: away }],
});
const book = (title, home, away, extra = {}) => ({ title, last_update: updated, markets: [market(home, away)], ...extra });
const game = () => ({
  home_team: "Home",
  away_team: "Away",
  sport_title: "Test League",
  commence_time: "2026-08-05T01:00:00Z",
  bookmakers: [book("Target", 150, -170), book("Peer B", 100, -120), book("Peer C", -105, -105)],
});

describe("quote evidence", () => {
  it("removes each peer's vig and excludes the target book from consensus", () => {
    const fixture = game();
    const first = evaluateQuoteCandidate(fixture, fixture.bookmakers[0], fixture.bookmakers[0].markets[0], fixture.bookmakers[0].markets[0].outcomes[0], { now: NOW });
    fixture.bookmakers[0].markets[0].outcomes[1].price = -10000;
    const second = evaluateQuoteCandidate(fixture, fixture.bookmakers[0], fixture.bookmakers[0].markets[0], fixture.bookmakers[0].markets[0].outcomes[0], { now: NOW });
    expect(first).toMatchObject({ supported: true, sourceCount: 2, targetExcluded: true, vigRemoved: true, reason: "target-excluded-no-vig-consensus" });
    expect(second.fairProbability).toBeCloseTo(first.fairProbability, 10);
    expect(first.sourceBooks).not.toContain("Target");
  });

  it("fails closed when independent or fresh comparison evidence is missing", () => {
    const fixture = game();
    fixture.bookmakers[2].last_update = "2026-08-04T20:00:00Z";
    const result = evaluateQuoteCandidate(fixture, fixture.bookmakers[0], fixture.bookmakers[0].markets[0], fixture.bookmakers[0].markets[0].outcomes[0], { now: NOW });
    expect(result).toMatchObject({ supported: false, reason: "insufficient-independent-sources", sourceCount: 1 });
    delete fixture.bookmakers[0].last_update;
    expect(evaluateQuoteCandidate(fixture, fixture.bookmakers[0], fixture.bookmakers[0].markets[0], fixture.bookmakers[0].markets[0].outcomes[0], { now: NOW }).reason).toBe("target-freshness-unproved");
  });

  it("does not count duplicate rows from one bookmaker as independent evidence", () => {
    const fixture = game();
    fixture.bookmakers[2].title = "Peer B";
    const result = evaluateQuoteCandidate(fixture, fixture.bookmakers[0], fixture.bookmakers[0].markets[0], fixture.bookmakers[0].markets[0].outcomes[0], { now: NOW });
    expect(result).toMatchObject({ supported: false, reason: "insufficient-independent-sources", sourceCount: 1 });
  });

  it("surfaces only positive opportunities backed by the evidence receipt", () => {
    const result = analyzeEvOpportunities([game()], { now: NOW, thresholdPct: 2 });
    expect(result.opportunities.length).toBeGreaterThan(0);
    expect(result.opportunities[0]).toMatchObject({ book: "Target", evidence: { supported: true, sourceCount: 2 } });
    expect(result.diagnostics.candidates).toBe(6);
    expect(result.opportunities.every((entry) => Number(entry.ev) > 2)).toBe(true);
  });

  it("does not compare different prop or total points", () => {
    const target = { title: "Target", last_update: updated, markets: [market(120, -140, 45.5)] };
    const peerB = { title: "Peer B", last_update: updated, markets: [market(100, -120, 46.5)] };
    const peerC = { title: "Peer C", last_update: updated, markets: [market(-105, -105, 46.5)] };
    const fixture = { bookmakers: [target, peerB, peerC] };
    expect(evaluateQuoteCandidate(fixture, target, target.markets[0], target.markets[0].outcomes[0], { now: NOW }).reason).toBe("insufficient-independent-sources");
  });
});
