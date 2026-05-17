import { describe, expect, it } from "vitest";
import { buildDecayCurve, renderSparkline, getLaneVelocity } from "../lib/edgeDecay.js";

const now = new Date("2026-05-17T12:00:00Z").getTime();

describe("buildDecayCurve", () => {
  it("decays to zero at expiry boundary", () => {
    const curve = buildDecayCurve({ expires: "2026-05-18", promoType: "bonus_bet" }, { now, ticks: 5 });
    expect(curve.samples[0]).toBe(1);
    expect(curve.samples[curve.samples.length - 1]).toBe(0);
    expect(curve.expiresMs).toBeGreaterThan(now);
  });

  it("never produces negative values", () => {
    const curve = buildDecayCurve({ promoType: "arb" }, { now, ticks: 10 });
    for (const v of curve.samples) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("respects lane velocity ordering", () => {
    expect(getLaneVelocity("arb")).toBeGreaterThan(getLaneVelocity("deposit_match"));
  });

  it("renders a sparkline of correct length", () => {
    const curve = buildDecayCurve({ expires: "2026-05-19", promoType: "parlay" }, { now, ticks: 6 });
    const spark = renderSparkline(curve.samples);
    expect(spark).toHaveLength(6);
  });
});
