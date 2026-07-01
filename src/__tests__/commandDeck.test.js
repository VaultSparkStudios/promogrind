import { describe, it, expect } from "vitest";
import { buildCommandDeck } from "../lib/commandDeck.js";

const NOW = new Date("2026-07-01T12:00:00Z");

function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    get length() { return map.size; },
    key(index) { return [...map.keys()][index] || null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
  };
}

const SEEDED = {
  bets: [
    { id: "b1", status: "settled", stake: 50, odds: -110, profit: 20, placedAt: "2026-06-28T12:00:00Z", book: "DraftKings", promoType: "profit_boost" },
    { id: "b2", status: "open", stake: 25, odds: 120, placedAt: "2026-06-30T12:00:00Z", book: "FanDuel" },
    { id: "b3", status: "settled", stake: 40, odds: -105, profit: -40, placedAt: "2026-06-29T10:00:00Z", book: "Caesars", promoType: "bonus_bet" },
  ],
  ledger: [{ id: "l1", book: "DraftKings", profit: 25, stake: 50, date: "2026-06-27" }],
  resultFeedback: [
    { id: "rf1", status: "settled", actualProfit: 12, expectedProfit: 15, promoType: "profit_boost", createdAt: "2026-06-28T12:00:00Z", calculatorAccurate: "yes" },
  ],
  bankroll: "1000",
  bookStatus: { DraftKings: "active" },
};

describe("buildCommandDeck", () => {
  it("builds one entry per module without throwing on empty data", () => {
    const deck = buildCommandDeck({}, { now: NOW, storage: makeStorage() });
    expect(deck.modules.length).toBeGreaterThanOrEqual(12);
    expect(deck.summary.total).toBe(deck.modules.length);
    for (const module of deck.modules) {
      expect(module.key).toBeTruthy();
      expect(module.decision).toBeTruthy();
      expect(module.slug).toBeTruthy();
      expect(["act", "live", "idle"]).toContain(module.state);
      // Every card must offer either a live line or a coach line — never a blank.
      expect(module.line || module.coach || module.key === "operator-season").toBeTruthy();
    }
  });

  it("derives live signals from seeded operator data", () => {
    const deck = buildCommandDeck(SEEDED, { now: NOW, storage: makeStorage() });
    const byKey = Object.fromEntries(deck.modules.map((m) => [m.key, m]));
    expect(byKey["discipline"].line).toMatch(/Score \d+/);
    expect(byKey["mistake-memory"].state).toBe("live");
    expect(byKey["mistake-memory"].line).toMatch(/1 settled loss/);
    expect(byKey["operator-season"].state).toBe("live");
    expect(byKey["edge-decay"].state).not.toBe("idle");
    expect(byKey["operator-passport"].line).toMatch(/settled loops/);
  });

  it("ranks act states above live above idle", () => {
    const deck = buildCommandDeck(SEEDED, { now: NOW, storage: makeStorage() });
    const ranks = deck.modules.map((m) => ({ act: 0, live: 1, idle: 2 })[m.state]);
    const sorted = [...ranks].sort((a, b) => a - b);
    expect(ranks).toEqual(sorted);
  });

  it("surfaces terms drift as an act state when snapshots drifted", () => {
    // termsDrift storage schema: pg:termsDrift:v1 map of promoId → snapshot.
    const storage = makeStorage();
    const deckClean = buildCommandDeck({}, { now: NOW, storage });
    const drift = deckClean.modules.find((m) => m.key === "terms-drift");
    expect(drift.state).toBe("idle");
  });

  it("never throws even when a module receives hostile data", () => {
    const hostile = {
      bets: [{ status: "open", stake: "not-a-number", odds: null }],
      ledger: "corrupt",
      resultFeedback: [{ createdAt: "garbage" }],
      bankroll: { nested: true },
      bookStatus: null,
    };
    expect(() => buildCommandDeck(hostile, { now: NOW, storage: makeStorage() })).not.toThrow();
  });
});
