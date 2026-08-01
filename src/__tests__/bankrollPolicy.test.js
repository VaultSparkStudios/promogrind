import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  DEFAULT_POLICY,
  evaluateBankrollPolicy,
  loadBankrollPolicy,
  normalizePolicyInput,
  resetBankrollPolicy,
  saveBankrollPolicy,
} from "../lib/bankrollPolicy.js";

const mockStorage = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

beforeEach(() => {
  vi.stubGlobal("localStorage", mockStorage);
  mockStorage.clear();
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("normalizePolicyInput", () => {
  it("clamps reservePct to [0, 80]", () => {
    expect(normalizePolicyInput({ reservePct: -5 }).reservePct).toBe(0);
    expect(normalizePolicyInput({ reservePct: 99 }).reservePct).toBe(80);
    expect(normalizePolicyInput({ reservePct: 20 }).reservePct).toBe(20);
  });

  it("fills missing fields with defaults", () => {
    const result = normalizePolicyInput({});
    expect(result).toEqual(DEFAULT_POLICY);
  });
});

describe("saveBankrollPolicy / loadBankrollPolicy", () => {
  it("round-trips a custom policy", () => {
    const policy = { reservePct: 25, maxSingleBetPct: 8, maxBookPct: 35 };
    saveBankrollPolicy(policy);
    expect(loadBankrollPolicy()).toEqual(policy);
  });

  it("returns defaults when nothing is saved", () => {
    expect(loadBankrollPolicy()).toEqual(DEFAULT_POLICY);
  });

  it("resetBankrollPolicy removes the saved policy", () => {
    saveBankrollPolicy({ reservePct: 30, maxSingleBetPct: 5, maxBookPct: 20 });
    resetBankrollPolicy();
    expect(loadBankrollPolicy()).toEqual(DEFAULT_POLICY);
  });
});

describe("evaluateBankrollPolicy", () => {
  const policy = { reservePct: 20, maxSingleBetPct: 10, maxBookPct: 30 };

  it("returns clean when no bets are open", () => {
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets: [] });
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
    expect(result.reserveFloor).toBe(200);
    expect(result.availableCapital).toBe(800);
  });

  it("returns clean when bets are within all limits", () => {
    const bets = [
      { stake: 50, book: "DraftKings", status: "open" },
      { stake: 80, book: "FanDuel", status: "open" },
    ];
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("flags reserve floor breach when total stake exceeds available capital", () => {
    const bets = [
      { stake: 500, book: "DraftKings", status: "open" },
      { stake: 400, book: "FanDuel", status: "open" },
    ];
    // total stake 900 > availableCapital 800
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    const rf = result.violations.find((v) => v.type === "reserve_floor");
    expect(rf).toBeDefined();
    expect(rf.severity).toBe("warn");
  });

  it("flags single-bet cap when one bet exceeds maxSingleBetPct of bankroll", () => {
    const bets = [{ stake: 150, book: "BetMGM", status: "open" }];
    // 150 > 10% of 1000 = 100
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    const cap = result.violations.find((v) => v.type === "single_bet_cap");
    expect(cap).toBeDefined();
    expect(cap.current).toBe(150);
    expect(cap.limit).toBe(100);
  });

  it("flags per-book cap when one book exceeds maxBookPct of bankroll", () => {
    const bets = [
      { stake: 200, book: "DraftKings", status: "open" },
      { stake: 150, book: "DraftKings", status: "open" },
    ];
    // DraftKings total 350 > 30% of 1000 = 300
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    const bc = result.violations.find((v) => v.type === "book_cap");
    expect(bc).toBeDefined();
    expect(bc.current).toBe(350);
    expect(bc.limit).toBe(300);
  });

  it("ignores settled and non-open bets", () => {
    const bets = [
      { stake: 500, book: "BetMGM", status: "settled" },
      { stake: 50,  book: "BetMGM", status: "open" },
    ];
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    expect(result.clean).toBe(true);
  });

  it("returns clean with no violations when bankroll is zero", () => {
    const result = evaluateBankrollPolicy({ policy, bankroll: 0, bets: [{ stake: 100 }] });
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it("can produce multiple violations simultaneously", () => {
    const bets = [
      { stake: 200, book: "DraftKings", status: "open" },  // single cap + reserve breach + book cap
      { stake: 700, book: "FanDuel", status: "open" },     // all three
    ];
    const result = evaluateBankrollPolicy({ policy, bankroll: 1000, bets });
    expect(result.violations.length).toBeGreaterThan(1);
  });
});
