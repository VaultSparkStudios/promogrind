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
  calcRR, calcParlay, calcSGP,
  bestOdds,
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

// ─── Odds Converters (additional) ─────────────────────────────────────────────

describe("toP — decimal to implied probability", () => {
  it("converts 2.0 → 50%", () => {
    expect(toP(2.0)).toBeCloseTo(50);
  });
  it("converts 4.0 → 25%", () => {
    expect(toP(4.0)).toBeCloseTo(25);
  });
  it("returns 0 for zero/negative input", () => {
    expect(toP(0)).toBe(0);
    expect(toP(-1)).toBe(0);
  });
});

describe("toF — decimal to fractional", () => {
  it("converts 2.5 → 3/2", () => {
    expect(toF(2.5)).toBe("3/2");
  });
  it("converts 4.0 → 3/1", () => {
    expect(toF(4.0)).toBe("3/1");
  });
  it("returns 0/1 for decimal <= 1", () => {
    expect(toF(1)).toBe("0/1");
    expect(toF(0.5)).toBe("0/1");
  });
});

describe("bestOdds — best odds from array", () => {
  it("picks the highest decimal odds", () => {
    expect(bestOdds(["+100", "+150", "+120"])).toBe("+150");
  });
  it("works with mixed formats", () => {
    expect(bestOdds(["-110", "2.5", "3/1"])).toBe("3/1");
  });
  it("handles single-element array", () => {
    expect(bestOdds(["+200"])).toBe("+200");
  });
});

// ─── Calculator Math (additional) ────────────────────────────────────────────

describe("calcFirst — first-bet insurance hedge", () => {
  it("calculates hedge stake and profits for standard odds", () => {
    // $500 first bet at +150 (2.5d), hedge at -150 (1.667d)
    const r = calcFirst(500, "+150", "-150");
    expect(r).not.toBeNull();
    expect(parseFloat(r.hs)).toBeGreaterThan(0);
    // pOW = payout - stake - hedgeStake; should be defined
    expect(parseFloat(r.pOW)).toBeDefined();
  });
  it("guarantees profit is the minimum of both outcomes", () => {
    const r = calcFirst(1000, "+200", "-130");
    expect(r).not.toBeNull();
    const g = parseFloat(r.g);
    expect(g).toBeLessThanOrEqual(parseFloat(r.pOW));
    expect(g).toBeLessThanOrEqual(parseFloat(r.pHW));
  });
  it("returns null for invalid inputs", () => {
    expect(calcFirst(0, "+150", "-150")).toBeNull();
    expect(calcFirst(500, "0", "-150")).toBeNull();
  });
});

describe("calcBoost — profit boost / odds boost", () => {
  it("calculates boosted odds and hedge correctly", () => {
    // $100 bet, +200 odds, 50% boost, $100 max boost, hedge at -200
    const r = calcBoost(100, "+200", "50", "100", "-200");
    expect(r).not.toBeNull();
    expect(parseFloat(r.bv)).toBeGreaterThan(0);  // boost value
    expect(parseFloat(r.hs)).toBeGreaterThan(0);   // hedge stake
  });
  it("caps boost value at max profit boost", () => {
    // $100 bet, +1000 odds, 100% boost, max $50
    const r = calcBoost(100, "+1000", "100", "50", "-200");
    expect(r).not.toBeNull();
    expect(parseFloat(r.bv)).toBeCloseTo(50, 0); // capped at $50
  });
  it("returns null when boost percentage is zero", () => {
    expect(calcBoost(100, "+200", "0", "100", "-200")).toBeNull();
  });
});

describe("calcPH — parlay hedge", () => {
  it("calculates hedge for a parlay payout", () => {
    // Parlay pays $500, hedge at -150 (1.667d), original stake $100
    const r = calcPH(500, "-150", 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.hs)).toBeGreaterThan(0);
    expect(parseFloat(r.g)).toBeDefined();
  });
  it("guaranteed profit equals min of both outcomes", () => {
    const r = calcPH(1000, "-120", 200);
    expect(r).not.toBeNull();
    const g = parseFloat(r.g);
    expect(g).toBeLessThanOrEqual(parseFloat(r.pPW));
    expect(g).toBeLessThanOrEqual(parseFloat(r.pHW));
  });
  it("returns null for missing payout", () => {
    expect(calcPH(0, "-150", 100)).toBeNull();
  });
});

describe("calcMid — middle calculator", () => {
  it("calculates second stake and total outlay", () => {
    // Side 1 at +110 on line 3.5, side 2 at -105 on line 4.5, $100 stake
    const r = calcMid("+110", "-105", "3.5", "4.5", 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.s2)).toBeGreaterThan(0);
    expect(parseFloat(r.ts)).toBeGreaterThan(100); // total > first stake
  });
  it("computes middle window width from line difference", () => {
    const r = calcMid("+100", "-110", "7", "8.5", 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.w)).toBeCloseTo(1.5, 1);
  });
  it("returns null for zero stake", () => {
    expect(calcMid("+110", "-105", "3.5", "4.5", 0)).toBeNull();
  });
});

describe("calcRO — rollover cost (additional)", () => {
  it("returns ok=false when vig cost exceeds bonus", () => {
    // $100 bonus, 20x rollover, 10% vig → cost = 200, net = -100
    const r = calcRO(100, 20, 10);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(false);
    expect(parseFloat(r.nv)).toBeLessThan(0);
  });
  it("returns null for zero bonus", () => {
    expect(calcRO(0, 5, 4.5)).toBeNull();
  });
  it("calculates number of $50 bets needed", () => {
    const r = calcRO(500, 4, 4.5);
    expect(r).not.toBeNull();
    expect(r.nb).toBe(Math.ceil(2000 / 50)); // 40 bets
  });
});

describe("calcTeaser — teaser calculator", () => {
  it("calculates EV and combined probability for 2-leg teaser", () => {
    // 2 legs, -110 odds, 72% win rate per leg
    const r = calcTeaser(2, "-110", 72);
    expect(r).not.toBeNull();
    expect(parseFloat(r.combProb)).toBeCloseTo(51.84, 0); // 0.72^2 * 100
    expect(r.payout).toBeDefined();
  });
  it("flags negative EV teaser", () => {
    // 4 legs, -120 odds, 60% win rate → likely negative EV
    const r = calcTeaser(4, "-120", 60);
    expect(r).not.toBeNull();
    expect(r.ok).toBe(false);
    expect(parseFloat(r.ev)).toBeLessThan(0);
  });
  it("returns null for invalid win percentage", () => {
    expect(calcTeaser(2, "-110", 0)).toBeNull();
    expect(calcTeaser(2, "-110", 100)).toBeNull();
  });
});

describe("calcRR — round robin", () => {
  it("calculates correct number of 2-pick combos from 3 selections", () => {
    const r = calcRR(["+150", "+200", "+120"], 2, 10);
    expect(r).not.toBeNull();
    expect(r.nCombos).toBe(3); // C(3,2) = 3
    expect(parseFloat(r.totalStake)).toBe(30); // 3 * $10
  });
  it("calculates 3-pick combos from 4 selections", () => {
    const r = calcRR(["+100", "+150", "+200", "+120"], 3, 5);
    expect(r).not.toBeNull();
    expect(r.nCombos).toBe(4); // C(4,3) = 4
    expect(parseFloat(r.totalStake)).toBe(20);
  });
  it("returns null when size exceeds number of picks", () => {
    expect(calcRR(["+150"], 2, 10)).toBeNull();
  });
});

describe("calcParlay — parlay combined odds + EV", () => {
  it("calculates combined odds for 2-leg parlay", () => {
    // +100 (2.0d) and +100 (2.0d) → combined = 4.0
    const r = calcParlay(["+100", "+100"], 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.combined)).toBeCloseTo(4.0, 1);
    expect(parseFloat(r.payout)).toBeCloseTo(400, 0);
    expect(parseFloat(r.profit)).toBeCloseTo(300, 0);
  });
  it("calculates correct implied probability", () => {
    // 2.0 * 2.0 = 4.0, prob = 0.5 * 0.5 = 25%
    const r = calcParlay(["+100", "+100"], 100);
    expect(parseFloat(r.prob)).toBeCloseTo(25, 0);
  });
  it("returns null for fewer than 2 legs", () => {
    expect(calcParlay(["+150"], 100)).toBeNull();
    expect(calcParlay([], 100)).toBeNull();
  });
});

describe("calcSGP — SGP discount analysis", () => {
  it("calculates discount between independent and SGP odds", () => {
    // Legs: +100, +100 → independent combined = 4.0
    // SGP posted at +250 (3.5d) → discount = (1 - 3.5/4.0)*100 = 12.5%
    const r = calcSGP(["+100", "+100"], "+250", 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.discount)).toBeCloseTo(12.5, 0);
  });
  it("shows negative discount when SGP pays more than independent", () => {
    // Independent = 4.0, SGP at +350 (4.5d) → discount = (1 - 4.5/4.0)*100 = -12.5%
    const r = calcSGP(["+100", "+100"], "+350", 100);
    expect(r).not.toBeNull();
    expect(parseFloat(r.discount)).toBeLessThan(0);
  });
  it("returns null for invalid SGP odds", () => {
    expect(calcSGP(["+100", "+100"], "0", 100)).toBeNull();
  });
});

describe("calcInsurance — insurance cost/benefit (additional)", () => {
  it("caps insurance amount at max", () => {
    // $1000 stake, 100% insurance, but max $500, 70% conversion
    const r = calcInsurance(1000, 100, 500, 70);
    expect(r).not.toBeNull();
    expect(parseFloat(r.insAmt)).toBe(500); // capped at max
    expect(parseFloat(r.insVal)).toBeCloseTo(350, 0);
  });
  it("returns null for zero stake", () => {
    expect(calcInsurance(0, 100, 500, 70)).toBeNull();
  });
  it("defaults conversion to 70% when not specified", () => {
    const r = calcInsurance(500, 100, 500, 0);
    expect(r).not.toBeNull();
    expect(parseFloat(r.insVal)).toBeCloseTo(350, 0); // 500 * 0.70
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
