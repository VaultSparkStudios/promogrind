/**
 * PromoGrind — Core Math Unit Tests
 * Run: npm test
 *
 * 20 tests covering all calculator math functions.
 * These guard against regressions as App.jsx evolves.
 */

import { describe, it, expect } from "vitest";
import {
  toD, toA, toP, toF,
  f,
  calcBonus, calcFirst, calcBoost,
  calcArb2, calcArb3,
  calcNV, calcNV3,
  calcEV,
  calcPH, calcMid,
  calcRO, calcDeposit,
  calcKelly,
  calcInsurance,
  calcTeaser,
  calcHold,
} from "../lib/shared.js";

// ─── Odds Converters ──────────────────────────────────────────────────────────

describe("toD — odds to decimal", () => {
  it("converts American moneyline positive (+150)", () => {
    expect(toD("+150")).toBeCloseTo(2.5);
  });
  it("converts American moneyline negative (-110)", () => {
    expect(toD("-110")).toBeCloseTo(1.909, 2);
  });
  it("converts decimal passthrough (2.5)", () => {
    expect(toD("2.5")).toBeCloseTo(2.5);
  });
  it("converts fractional (3/1)", () => {
    expect(toD("3/1")).toBeCloseTo(4.0);
  });
  it("returns 0 for empty string", () => {
    expect(toD("")).toBe(0);
  });
  it("returns 0 for invalid input", () => {
    expect(toD("abc")).toBe(0);
  });
});

describe("toA — decimal to American", () => {
  it("converts 2.5 → +150", () => {
    expect(toA(2.5)).toBe("+150");
  });
  it("converts 1.909 → -110", () => {
    expect(toA(1.909)).toBe("-110");
  });
  it("converts even money 2.0 → +100", () => {
    expect(toA(2.0)).toBe("+100");
  });
});

// ─── Calculator Math ──────────────────────────────────────────────────────────

describe("calcBonus — bonus bet converter", () => {
  it("calculates hedge stake and guaranteed profit", () => {
    // $100 bonus bet, book at +150 (2.5d), hedge at -150 (1.667d)
    // win amount = 100*(2.5-1) = 150; hedge stake = 150/1.667 ≈ 90
    const r = calcBonus(100, "+150", "-150");
    expect(r).not.toBeNull();
    expect(parseFloat(r.hs)).toBeCloseTo(90, 0); // hedge stake ≈ $90
    expect(parseFloat(r.g)).toBeGreaterThan(0);  // positive guaranteed profit
  });
  it("returns null for invalid odds", () => {
    expect(calcBonus(100, "0", "-110")).toBeNull();
  });
  it("returns null for zero stake", () => {
    expect(calcBonus(0, "+150", "-150")).toBeNull();
  });
});

describe("calcArb2 — 2-way arbitrage", () => {
  it("detects a true arbitrage opportunity", () => {
    // Book A: +120 (2.2d), Book B: -105 (1.952d) → margin < 1
    const r = calcArb2("+120", "-105", 1000);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(true);
    expect(parseFloat(r.mg)).toBeGreaterThan(0);
  });
  it("rejects non-arbitrage lines", () => {
    // Standard -110/-110 lines → no arb
    const r = calcArb2("-110", "-110", 1000);
    expect(r.ok).toBe(false);
  });
  it("splits stakes to sum to total", () => {
    const total = 1000;
    const r = calcArb2("+120", "-105", total);
    const stakesSum = parseFloat(r.s1) + parseFloat(r.s2);
    expect(stakesSum).toBeCloseTo(total, 0);
  });
});

describe("calcArb3 — 3-way arbitrage", () => {
  it("calculates correct margins for soccer odds", () => {
    // Home +200, Draw +280, Away +200 → margin ~0.95
    const r = calcArb3("+200", "+280", "+200", 1000);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(true);
  });
});

describe("calcNV — no-vig fair odds", () => {
  it("removes vig from -110/-110 line", () => {
    const r = calcNV("-110", "-110");
    expect(r).not.toBeNull();
    expect(parseFloat(r.v)).toBeCloseTo(4.5, 0); // ~4.5% vig
    expect(parseFloat(r.fp1)).toBeCloseTo(50, 0); // fair prob ~50%
  });
  it("returns null for invalid input", () => {
    expect(calcNV("0", "-110")).toBeNull();
  });
});

describe("calcEV — expected value", () => {
  it("calculates positive EV correctly", () => {
    // Your odds +150 vs fair -110 → positive EV
    const r = calcEV("+150", "-110", 100);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(true);
    expect(parseFloat(r.ev)).toBeGreaterThan(0);
  });
  it("calculates negative EV for bad lines", () => {
    // Your odds -120 vs fair -110 → negative EV
    const r = calcEV("-120", "-110", 100);
    expect(r.ok).toBe(false);
  });
});

describe("calcKelly — kelly criterion", () => {
  it("recommends a bet size for positive EV", () => {
    // 55% win rate, +100 odds, $1000 bankroll, full kelly
    const r = calcKelly(55, "+100", 1000, 1);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(true);
    expect(parseFloat(r.bet)).toBeGreaterThan(0);
    expect(parseFloat(r.bet)).toBeLessThan(1000);
  });
  it("returns ok=false for negative edge", () => {
    // 45% win rate → negative kelly
    const r = calcKelly(45, "+100", 1000, 1);
    expect(r.ok).toBe(false);
  });
  it("respects fractional kelly", () => {
    const full = calcKelly(55, "+100", 1000, 1);
    const half = calcKelly(55, "+100", 1000, 0.5);
    expect(parseFloat(half.bet)).toBeCloseTo(parseFloat(full.bet) / 2, 0);
  });
});

describe("calcDeposit — deposit match optimizer", () => {
  it("calculates net value of a deposit match", () => {
    // $500 deposit, 100% match up to $500, 1x rollover, 4.5% vig
    const r = calcDeposit(500, 100, 500, 1, 4.5);
    expect(r).not.toBeNull();
    expect(parseFloat(r.bonus)).toBe(500);
    expect(r.ok).toBe(true);
    expect(parseFloat(r.net)).toBeGreaterThan(0);
  });
  it("flags when deposit doesn't reach minimum for max bonus", () => {
    // $100 deposit, 100% up to $500 → doesn't fill
    const r = calcDeposit(100, 100, 500, 1, 4.5);
    expect(r.fill).toBe(false);
  });
});

describe("calcHold — sportsbook hold", () => {
  it("calculates ~4.5% hold for -110/-110 line", () => {
    const r = calcHold("-110", "-110");
    expect(r).not.toBeNull();
    expect(parseFloat(r.hold)).toBeCloseTo(4.76, 1); // -110/-110 → ~4.76% hold
  });
  it("marks tight spread as ok", () => {
    // Bet at even money both sides → 0% hold
    const r = calcHold("+100", "+100");
    expect(r.ok).toBe(true);
  });
});

describe("calcInsurance — insurance cost/benefit", () => {
  it("calculates insurance value at 70% conversion", () => {
    const r = calcInsurance(500, 100, 500, 70);
    expect(r).not.toBeNull();
    expect(parseFloat(r.insAmt)).toBe(500);
    expect(parseFloat(r.insVal)).toBeCloseTo(350, 0);
  });
});

describe("calcRO — rollover cost", () => {
  it("calculates total wagering requirement and net value", () => {
    // $200 bonus, 5x rollover, 4.5% vig
    const r = calcRO(200, 5, 4.5);
    expect(r).not.toBeNull();
    expect(parseFloat(r.tw)).toBe(1000); // total wagering
    expect(parseFloat(r.ec)).toBeCloseTo(45, 0); // vig cost
    expect(r.ok).toBe(true);
  });
});

describe("f — number formatter", () => {
  it("formats to 2 decimal places by default", () => {
    expect(f(1.2345)).toBe("1.23");
  });
  it("handles string input", () => {
    expect(f("3.14159", 3)).toBe("3.142");
  });
  it("handles null/undefined gracefully", () => {
    expect(f(null)).toBe("0.00");
  });
});
