import { describe, expect, it, beforeEach } from "vitest";
import { evaluateAchievements, getNewlyUnlocked, ACHIEVEMENTS, ACHIEVEMENT_MAP } from "../lib/achievements.js";

const _store = {};
global.localStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
};

beforeEach(() => { localStorage.clear(); });

function makeAppData(overrides = {}) {
  return { ledger: [], resultFeedback: [], bets: [], done: {}, workflowInbox: [], vaultEvents: [], ...overrides };
}

describe("ACHIEVEMENTS catalog", () => {
  it("has at least 30 achievements", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
  });

  it("has unique IDs", () => {
    const ids = ACHIEVEMENTS.map(a => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every achievement has icon, label, desc, category", () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.icon).toBe("string");
      expect(typeof a.label).toBe("string");
      expect(typeof a.desc).toBe("string");
      expect(typeof a.category).toBe("string");
    }
  });

  it("ACHIEVEMENT_MAP keys match ACHIEVEMENTS IDs", () => {
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_MAP[a.id]).toBe(a);
    }
  });
});

describe("evaluateAchievements — onboarding", () => {
  it("first_calc unlocks when done has entries", () => {
    const checks = evaluateAchievements(makeAppData({ done: { DraftKings: true } }), 0);
    expect(checks.first_calc).toBe(true);
  });

  it("first_ledger unlocks when ledger has entries", () => {
    const checks = evaluateAchievements(makeAppData({ ledger: [{ profit: "10", date: "2026-04-01" }] }), 0);
    expect(checks.first_ledger).toBe(true);
  });

  it("first_book unlocks when at least one book is completed", () => {
    const checks = evaluateAchievements(makeAppData({ done: { FanDuel: true } }), 0);
    expect(checks.first_book).toBe(true);
  });

  it("first_workflow unlocks when workflowInbox has entries", () => {
    const checks = evaluateAchievements(makeAppData({ workflowInbox: [{ id: "w1" }] }), 0);
    expect(checks.first_workflow).toBe(true);
  });
});

describe("evaluateAchievements — profit milestones", () => {
  const makeProfit = (total) => ({
    ledger: [{ profit: String(total), date: "2026-04-01" }],
  });

  it("profit_1 unlocks at $1", () => {
    const checks = evaluateAchievements(makeAppData(makeProfit(1)), 0);
    expect(checks.profit_1).toBe(true);
  });

  it("profit_100 unlocks at $100", () => {
    const checks = evaluateAchievements(makeAppData(makeProfit(100)), 0);
    expect(checks.profit_100).toBe(true);
  });

  it("profit_1000 unlocks at $1000", () => {
    const checks = evaluateAchievements(makeAppData(makeProfit(1000)), 0);
    expect(checks.profit_1000).toBe(true);
  });

  it("profit_5000 does NOT unlock at $999", () => {
    const checks = evaluateAchievements(makeAppData(makeProfit(999)), 0);
    expect(checks.profit_5000).toBe(false);
  });

  it("profit_10000 unlocks at $10000", () => {
    const checks = evaluateAchievements(makeAppData(makeProfit(10000)), 0);
    expect(checks.profit_10000).toBe(true);
  });
});

describe("evaluateAchievements — book milestones", () => {
  const makeBooks = (count) => ({
    done: Object.fromEntries(Array.from({ length: count }, (_, i) => [`Book${i}`, true])),
  });

  it("books_5 unlocks at 5 books", () => {
    const checks = evaluateAchievements(makeAppData(makeBooks(5)), 0);
    expect(checks.books_5).toBe(true);
  });

  it("books_10 does NOT unlock at 9 books", () => {
    const checks = evaluateAchievements(makeAppData(makeBooks(9)), 0);
    expect(checks.books_10).toBe(false);
  });

  it("books_20 unlocks at 20 books", () => {
    const checks = evaluateAchievements(makeAppData(makeBooks(20)), 0);
    expect(checks.books_20).toBe(true);
  });
});

describe("evaluateAchievements — streaks", () => {
  it("streak_3 unlocks at streak=3", () => {
    const checks = evaluateAchievements(makeAppData(), 3);
    expect(checks.streak_3).toBe(true);
  });

  it("streak_7 does NOT unlock at streak=6", () => {
    const checks = evaluateAchievements(makeAppData(), 6);
    expect(checks.streak_7).toBe(false);
  });

  it("streak_100 unlocks at streak=100", () => {
    const checks = evaluateAchievements(makeAppData(), 100);
    expect(checks.streak_100).toBe(true);
  });
});

describe("evaluateAchievements — accuracy", () => {
  const makeSettlements = (count, hitRate = 1.0) => ({
    resultFeedback: Array.from({ length: count }, (_, i) => ({
      status: "settled",
      actualProfit: i < count * hitRate ? "48" : "20",
      expectedProfit: "50",
    })),
  });

  it("accurate_5 unlocks when 5+ settlements within 5%", () => {
    const checks = evaluateAchievements(makeAppData(makeSettlements(5, 1.0)), 0);
    expect(checks.accurate_5).toBe(true);
  });

  it("accurate_5 does NOT unlock when settlements are far off", () => {
    const checks = evaluateAchievements(makeAppData(makeSettlements(10, 0)), 0);
    expect(checks.accurate_5).toBe(false);
  });
});

describe("evaluateAchievements — vault events", () => {
  it("advisor_used unlocks when promo_advisor vault event exists", () => {
    const checks = evaluateAchievements(makeAppData({ vaultEvents: [{ feature: "promo_advisor" }] }), 0);
    expect(checks.advisor_used).toBe(true);
  });

  it("stack_built unlocks when stack_builder vault event exists", () => {
    const checks = evaluateAchievements(makeAppData({ vaultEvents: [{ feature: "stack_builder" }] }), 0);
    expect(checks.stack_built).toBe(true);
  });
});

describe("getNewlyUnlocked", () => {
  it("returns empty array when all checks already earned", () => {
    const checks = { profit_100: true, streak_3: true };
    const earned = [{ id: "profit_100", unlockedAt: null }, { id: "streak_3", unlockedAt: null }];
    expect(getNewlyUnlocked(checks, earned)).toHaveLength(0);
  });

  it("returns new items with IDs and unlockedAt timestamps", () => {
    const checks = { profit_100: true, streak_3: false };
    const newly = getNewlyUnlocked(checks, []);
    expect(newly).toHaveLength(1);
    expect(newly[0].id).toBe("profit_100");
    expect(typeof newly[0].unlockedAt).toBe("string");
  });

  it("does not return false checks", () => {
    const checks = { profit_100: false, streak_7: false };
    const newly = getNewlyUnlocked(checks, []);
    expect(newly).toHaveLength(0);
  });

  it("migrates old flat string format from earned array", () => {
    const checks = { profit_100: true, streak_3: true };
    // Old format: string[] not {id,unlockedAt}[]
    const earned = ["profit_100"];
    const newly = getNewlyUnlocked(checks, earned.map(id => ({ id, unlockedAt: null })));
    expect(newly.map(n => n.id)).toEqual(["streak_3"]);
  });
});
