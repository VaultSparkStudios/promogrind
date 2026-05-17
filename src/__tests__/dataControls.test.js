import { describe, expect, it } from "vitest";
import { buildLocalDataExport, clearLocalPromoGrindData, describeDataControlState } from "../lib/dataControls.js";

function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  return {
    get length() { return map.size; },
    key(index) { return [...map.keys()][index] || null; },
    getItem(key) { return map.has(key) ? map.get(key) : null; },
    setItem(key, value) { map.set(key, String(value)); },
    removeItem(key) { map.delete(key); },
    has(key) { return map.has(key); },
  };
}

describe("data controls", () => {
  it("summarizes and exports tracked PromoGrind local data", () => {
    const storage = makeStorage({
      pg_app_data: JSON.stringify({ bankroll: 1000 }),
      pg_trust_receipts: "[]",
      pg_used_bonus_bet: "2026-05-17",
      unrelated: "ignore",
    });

    const state = describeDataControlState(storage);
    const exported = buildLocalDataExport(storage);

    expect(state.label).toContain("3 local items");
    expect(exported.summary.itemCount).toBe(3);
    expect(exported.data.pg_app_data).toContain("bankroll");
    expect(exported.data.unrelated).toBeUndefined();
  });

  it("clears operator data while preserving preferences by default", () => {
    const storage = makeStorage({
      pg_app_data: "{}",
      pg_currency: "USD",
      pg_missions: "{}",
    });

    const result = clearLocalPromoGrindData(storage);

    expect(result.cleared).toEqual(expect.arrayContaining(["pg_app_data", "pg_missions"]));
    expect(result.skipped).toEqual(["pg_currency"]);
    expect(storage.has("pg_app_data")).toBe(false);
    expect(storage.has("pg_currency")).toBe(true);
  });
});
