import { describe, expect, it, beforeEach } from "vitest";
import { getDailyMissions, isMissionCompleted, completeMission, getTodayXp, MISSION_POOL } from "../lib/missions.js";

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

  it("every mission has id, label, desc, xp, nav, check", () => {
    for (const m of MISSION_POOL) {
      expect(typeof m.id).toBe("string");
      expect(typeof m.label).toBe("string");
      expect(typeof m.desc).toBe("string");
      expect(typeof m.xp).toBe("number");
      expect(m.xp).toBeGreaterThan(0);
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

describe("getTodayXp", () => {
  it("returns 0 when no missions completed", () => {
    expect(getTodayXp("2026-04-22")).toBe(0);
  });

  it("returns sum of XP for completed missions", () => {
    const date = "2026-04-22";
    // Complete a mission we know exists in the pool
    const m = MISSION_POOL[0];
    completeMission(m.id, date);
    expect(getTodayXp(date)).toBe(m.xp);
  });

  it("accumulates XP across multiple completed missions", () => {
    const date = "2026-04-22";
    const m1 = MISSION_POOL[0];
    const m2 = MISSION_POOL[1];
    completeMission(m1.id, date);
    completeMission(m2.id, date);
    expect(getTodayXp(date)).toBe(m1.xp + m2.xp);
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
