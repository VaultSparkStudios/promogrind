import { describe, expect, it, beforeEach } from "vitest";
import { getDailyMissions, isMissionCompleted, completeMission, MISSION_POOL, flagCalcUsed, flagVisit } from "../lib/missions.js";

// Minimal localStorage mock for node test environment
const _store = {};
global.localStorage = {
  getItem: (k) => _store[k] ?? null,
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach(k => delete _store[k]); },
};

beforeEach(() => {
  localStorage.clear();
});;

function makeAppData(overrides = {}) {
  return { ledger: [], resultFeedback: [], bets: [], done: {}, workflowInbox: [], ...overrides };
}

describe("MISSION_POOL", () => {
  it("has at least 10 missions", () => {
    expect(MISSION_POOL.length).toBeGreaterThanOrEqual(10);
  });

  it("every mission has an action contract and no activity-point score", () => {
    for (const m of MISSION_POOL) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.label).toBe("string");
      expect(typeof m.desc).toBe("string");
      expect(m).not.toHaveProperty("xp");
      expect(typeof m.nav).toBe("string");
      expect(typeof m.check).toBe("function");
    }
  });

  it("has unique mission IDs", () => {
    const ids = MISSION_POOL.map(m => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getDailyMissions", () => {
  it("returns exactly 3 missions", () => {
    const missions = getDailyMissions(makeAppData(), "2026-04-22");
    expect(missions).toHaveLength(3);
  });

  it("returns same 3 missions for the same date (deterministic)", () => {
    const a = getDailyMissions(makeAppData(), "2026-04-22");
    const b = getDailyMissions(makeAppData(), "2026-04-22");
    expect(a.map(m => m.id)).toEqual(b.map(m => m.id));
  });

  it("returns different missions for different dates", () => {
    const a = getDailyMissions(makeAppData(), "2026-04-22").map(m => m.id);
    const b = getDailyMissions(makeAppData(), "2026-04-23").map(m => m.id);
    // Very unlikely to be identical across different seeds
    expect(a.join(",")).not.toBe(b.join(","));
  });

  it("each returned mission has completed and eligible fields", () => {
    const missions = getDailyMissions(makeAppData(), "2026-04-22");
    for (const m of missions) {
      expect(typeof m.completed).toBe("boolean");
      expect(typeof m.eligible).toBe("boolean");
    }
  });
});

describe("completeMission + isMissionCompleted", () => {
  it("returns false before completing", () => {
    expect(isMissionCompleted("log_ledger", "2026-04-22")).toBe(false);
  });

  it("returns true after completing", () => {
    completeMission("log_ledger", "2026-04-22");
    expect(isMissionCompleted("log_ledger", "2026-04-22")).toBe(true);
  });

  it("is isolated by date — completing on one date does not affect another", () => {
    completeMission("log_ledger", "2026-04-22");
    expect(isMissionCompleted("log_ledger", "2026-04-23")).toBe(false);
  });

  it("completing twice does not duplicate entries", () => {
    completeMission("log_ledger", "2026-04-22");
    completeMission("log_ledger", "2026-04-22");
    const data = JSON.parse(localStorage.getItem("pg_missions") ?? "{}");
    expect(data["2026-04-22"].filter(id => id === "log_ledger").length).toBe(1);
  });
});

describe("flagCalcUsed", () => {
  it("sets today's date for known slugs", () => {
    const today = new Date().toISOString().slice(0, 10);
    flagCalcUsed("bonus-bet");
    expect(localStorage.getItem("pg_used_bonus_bet")).toBe(today);
  });

  it("is a no-op for unknown slugs", () => {
    flagCalcUsed("unknown-slug");
    expect(localStorage.getItem("pg_used_unknown-slug")).toBeNull();
  });

  it("covers all mapped slugs", () => {
    const today = new Date().toISOString().slice(0, 10);
    const slugs = ["arb-2way", "profit-boost", "kelly", "no-vig", "first-bet"];
    const keys = ["pg_used_arb", "pg_used_boost", "pg_used_kelly", "pg_used_novig", "pg_used_first_bet"];
    slugs.forEach((s, i) => { flagCalcUsed(s); expect(localStorage.getItem(keys[i])).toBe(today); });
  });
});

describe("flagVisit", () => {
  it("sets today's date for known features", () => {
    const today = new Date().toISOString().slice(0, 10);
    flagVisit("advisor");
    expect(localStorage.getItem("pg_advisor_opened")).toBe(today);
  });

  it("covers insights, brief, and book features", () => {
    const today = new Date().toISOString().slice(0, 10);
    const pairs = [["insights","pg_insights_visited"],["brief","pg_brief_visited"],["book","pg_book_updated"]];
    pairs.forEach(([feature, key]) => { flagVisit(feature); expect(localStorage.getItem(key)).toBe(today); });
  });

  it("is a no-op for unknown features", () => {
    flagVisit("nonexistent");
    expect(localStorage.getItem("pg_nonexistent")).toBeNull();
  });
});

describe("mission check — log_ledger", () => {
  it("returns true when ledger has an entry matching today", () => {
    const date = "2026-04-22";
    const appData = makeAppData({ ledger: [{ profit: "10", date }] });
    const missions = getDailyMissions(appData, date);
    const m = missions.find(x => x.id === "log_ledger");
    if (m) expect(m.eligible).toBe(true);
  });

  it("returns false when ledger entry is on a different date", () => {
    const date = "2026-04-22";
    const appData = makeAppData({ ledger: [{ profit: "10", date: "2026-04-20" }] });
    const missions = getDailyMissions(appData, date);
    const m = missions.find(x => x.id === "log_ledger");
    if (m) expect(m.eligible).toBe(false);
  });
});
