import { describe, expect, it } from "vitest";
import {
  EXPORT_SCHEMA_VERSION,
  buildLocalDataExport,
  clearLocalPromoGrindData,
  computeExportDigest,
  describeDataControlState,
  importLocalDataExport,
  validateLocalDataExport,
} from "../lib/dataControls.js";

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
      promo_engine_v3: JSON.stringify({ bankroll: 1000 }),
      pg_trust_receipts: "[]",
      pg_used_bonus_bet: "2026-05-17",
      unrelated: "ignore",
    });

    const state = describeDataControlState(storage);
    const exported = buildLocalDataExport(storage);

    expect(state.label).toContain("3 local items");
    expect(exported.summary.itemCount).toBe(3);
    expect(exported.data.promo_engine_v3).toContain("bankroll");
    expect(exported.data.unrelated).toBeUndefined();
  });

  it("tracks the real operator keys, not phantom ones", () => {
    const storage = makeStorage({
      promo_engine_v3: "{}",
      pg_calc_favorites: "[]",
      pg_hist_bonus: "[]",
      pg_compact: "1",
      pg_app_data: "{}", // phantom legacy key — must be ignored
      pg_pro_status: "pro", // entitlement — must never export
      pg_sync_queue: "[]", // transient queue — must never export
    });
    const exported = buildLocalDataExport(storage);
    const keys = Object.keys(exported.data);
    expect(keys).toEqual(expect.arrayContaining(["promo_engine_v3", "pg_calc_favorites", "pg_hist_bonus", "pg_compact"]));
    expect(keys).not.toEqual(expect.arrayContaining(["pg_app_data", "pg_pro_status", "pg_sync_queue"]));
  });

  it("clears operator data while preserving preferences by default", () => {
    const storage = makeStorage({
      promo_engine_v3: "{}",
      pg_currency: "USD",
      pg_missions: "{}",
    });

    const result = clearLocalPromoGrindData(storage);

    expect(result.cleared).toEqual(expect.arrayContaining(["promo_engine_v3", "pg_missions"]));
    expect(result.skipped).toEqual(["pg_currency"]);
    expect(storage.has("promo_engine_v3")).toBe(false);
    expect(storage.has("pg_currency")).toBe(true);
  });
});

describe("export envelope", () => {
  it("stamps schema version and a verifiable integrity digest", () => {
    const storage = makeStorage({ promo_engine_v3: JSON.stringify({ bets: [1, 2] }) });
    const exported = buildLocalDataExport(storage);
    expect(exported.schemaVersion).toBe(EXPORT_SCHEMA_VERSION);
    expect(exported.integrity.algo).toBe("fnv1a32");
    expect(exported.integrity.digest).toBe(computeExportDigest(exported.data));
  });

  it("digest changes when data changes", () => {
    expect(computeExportDigest({ a: "1" })).not.toBe(computeExportDigest({ a: "2" }));
    expect(computeExportDigest({ a: "1" })).toBe(computeExportDigest({ a: "1" }));
  });
});

describe("importLocalDataExport", () => {
  function exportFrom(seed) {
    return buildLocalDataExport(makeStorage(seed));
  }

  it("round-trips an export back into empty storage", () => {
    const exported = exportFrom({ promo_engine_v3: JSON.stringify({ bankroll: 500 }), pg_missions: "{}" });
    const target = makeStorage();
    const result = importLocalDataExport(exported, { storage: target });
    expect(result.valid).toBe(true);
    expect(result.restored.sort()).toEqual(["pg_missions", "promo_engine_v3"]);
    expect(target.getItem("promo_engine_v3")).toContain("bankroll");
  });

  it("accepts a JSON string payload", () => {
    const exported = exportFrom({ pg_currency: "USD" });
    const target = makeStorage();
    const result = importLocalDataExport(JSON.stringify(exported), { storage: target });
    expect(result.valid).toBe(true);
    expect(target.getItem("pg_currency")).toBe("USD");
  });

  it("fails closed on a corrupted integrity digest", () => {
    const exported = exportFrom({ promo_engine_v3: "{}" });
    exported.data.promo_engine_v3 = JSON.stringify({ tampered: true });
    const target = makeStorage();
    const result = importLocalDataExport(exported, { storage: target });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/digest mismatch/i);
    expect(target.has("promo_engine_v3")).toBe(false);
  });

  it("rejects unrecognized keys and non-PromoGrind payloads", () => {
    const target = makeStorage();
    const alien = importLocalDataExport({ type: "other", product: "X", data: {} }, { storage: target });
    expect(alien.valid).toBe(false);

    const exported = exportFrom({ pg_currency: "USD" });
    exported.data.evil_key = "payload";
    delete exported.integrity; // simulate hand-edited legacy export
    const result = importLocalDataExport(exported, { storage: target });
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toContain("evil_key");
    expect(target.has("evil_key")).toBe(false);
  });

  it("accepts legacy exports without schemaVersion or integrity", () => {
    const legacy = {
      product: "PromoGrind",
      type: "local-data-export",
      generatedAt: "2026-06-01T00:00:00Z",
      data: { pg_missions: "{}" },
    };
    const target = makeStorage();
    const result = importLocalDataExport(legacy, { storage: target });
    expect(result.valid).toBe(true);
    expect(result.schemaVersion).toBe(0);
    expect(target.has("pg_missions")).toBe(true);
  });

  it("dry-run previews add/overwrite actions without writing", () => {
    const exported = exportFrom({ promo_engine_v3: "{}", pg_currency: "EUR" });
    const target = makeStorage({ pg_currency: "USD" });
    const result = importLocalDataExport(exported, { storage: target, dryRun: true });
    expect(result.valid).toBe(true);
    const actions = Object.fromEntries(result.preview.map((p) => [p.key, p.action]));
    expect(actions.pg_currency).toBe("overwrite");
    expect(actions.promo_engine_v3).toBe("add");
    expect(target.getItem("pg_currency")).toBe("USD");
    expect(target.has("promo_engine_v3")).toBe(false);
  });

  it("merge keeps unrelated existing keys; replace clears tracked keys first", () => {
    const exported = exportFrom({ promo_engine_v3: JSON.stringify({ fresh: true }) });
    const merged = makeStorage({ pg_missions: "{}", untouched: "keep" });
    importLocalDataExport(exported, { storage: merged, mode: "merge" });
    expect(merged.has("pg_missions")).toBe(true);
    expect(merged.getItem("untouched")).toBe("keep");

    const replaced = makeStorage({ pg_missions: "{}", untouched: "keep" });
    const result = importLocalDataExport(exported, { storage: replaced, mode: "replace" });
    expect(result.cleared).toContain("pg_missions");
    expect(replaced.has("pg_missions")).toBe(false);
    expect(replaced.getItem("untouched")).toBe("keep");
    expect(replaced.getItem("promo_engine_v3")).toContain("fresh");
  });

  it("validateLocalDataExport rejects garbage input", () => {
    expect(validateLocalDataExport("not json").valid).toBe(false);
    expect(validateLocalDataExport(null).valid).toBe(false);
    expect(validateLocalDataExport({ type: "local-data-export", product: "PromoGrind" }).valid).toBe(false);
  });
});
