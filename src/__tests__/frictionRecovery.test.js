import { describe, expect, it } from "vitest";
import { buildFrictionRecovery, FRICTION_RECOVERY_ROUTES } from "../lib/frictionRecovery.js";

const now = new Date("2026-08-04T12:00:00.000Z");
const row = (reason, daysAgo = 0, extra = {}) => ({
  skipReason: reason,
  updatedAt: new Date(now.getTime() - daysAgo * 86400000).toISOString(),
  ...extra,
});

describe("friction recovery loop", () => {
  it("waits for repeated recent evidence", () => {
    expect(buildFrictionRecovery([row("odds_moved")], now)).toMatchObject({ ready: false, reason: "below-threshold", threshold: 2 });
    expect(buildFrictionRecovery([row("odds_moved", 45), row("odds_moved", 40)], now)).toMatchObject({ ready: false, reason: "no-recent-evidence" });
  });

  it("maps a repeated canonical reason to a bounded route-safe action", () => {
    const result = buildFrictionRecovery([row("odds_moved", 4), row("odds_moved", 1)], now);
    expect(result).toMatchObject({ ready: true, reasonCode: "odds_moved", evidenceCount: 2, route: "/odds-compare" });
    expect(FRICTION_RECOVERY_ROUTES.has(result.route)).toBe(true);
    expect(result.rankingBasis).toMatch(/profit is not an input/);
  });

  it("breaks frequency ties by recency and then stable reason code", () => {
    const result = buildFrictionRecovery([
      row("timing", 9), row("timing", 8),
      row("bankroll", 2), row("bankroll", 1),
    ], now);
    expect(result.reasonCode).toBe("bankroll");
  });

  it("falls back to evidence review for unknown reasons instead of inventing advice", () => {
    const result = buildFrictionRecovery([row("weather_delay", 2), row("weather_delay", 1)], now);
    expect(result).toMatchObject({ ready: true, reason: "repeated-unknown-friction", route: "/edge-dashboard" });
    expect(result.action).toMatch(/no specific recovery rule/);
  });

  it("ignores realized profit when ranking recovery needs", () => {
    const base = [row("timing", 2), row("timing", 1), row("odds_moved", 5), row("odds_moved", 4)];
    const positive = buildFrictionRecovery(base.map((entry) => ({ ...entry, actualProfit: 1000 })), now);
    const negative = buildFrictionRecovery(base.map((entry) => ({ ...entry, actualProfit: -1000 })), now);
    expect(positive.reasonCode).toBe(negative.reasonCode);
    expect(positive.route).toBe(negative.route);
  });

  it("normalizes reason labels and accepts skip and execution-friction evidence", () => {
    const result = buildFrictionRecovery([
      row("Terms Unclear", 2),
      { frictionReason: "terms-unclear", updatedAt: row("x", 1).updatedAt },
    ], now);
    expect(result).toMatchObject({ ready: true, reasonCode: "terms_unclear", route: "/knowledge-base" });
    expect(result.sources).toEqual(["frictionReason", "skipReason"]);
  });
});
