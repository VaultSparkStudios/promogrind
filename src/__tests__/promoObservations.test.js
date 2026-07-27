import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { PROMO_SCHED } from "../data/promoSchedule.js";
import { derivePromoValueConfidence, getPromoFreshness, promoObservationKey, rankPromoPatterns, recordPromoObservation } from "../lib/promoObservations.js";

const promo = PROMO_SCHED[0];

describe("promo observation freshness", () => {
  it("labels every schedule row as an unsourced historical pattern", () => {
    expect(PROMO_SCHED).toHaveLength(21);
    for (const row of PROMO_SCHED) {
      expect(row.id).toBeTruthy();
      expect(["US", "UK"]).toContain(row.market);
      expect(row.evidence).toEqual({ state: "historical-pattern", verifiedAt: null, sourceUrl: null, jurisdiction: row.market });
    }
  });

  it("starts unverified and becomes current after a local confirmation", () => {
    const now = new Date("2026-07-24T12:00:00Z");
    expect(getPromoFreshness(promo, {}, now).state).toBe("unverified");
    const observations = recordPromoObservation({}, promo, "confirmed", now);
    expect(getPromoFreshness(promo, observations, now)).toMatchObject({ state: "current", ageDays: 0, needsVerification: false });
  });

  it("ages confirmations and keeps rejections out of the current state", () => {
    const confirmed = recordPromoObservation({}, promo, "confirmed", new Date("2026-06-01T00:00:00Z"));
    expect(getPromoFreshness(promo, confirmed, new Date("2026-07-24T00:00:00Z")).state).toBe("stale");
    const rejected = recordPromoObservation({}, promo, "rejected", new Date("2026-07-24T00:00:00Z"));
    expect(getPromoFreshness(promo, rejected, new Date("2026-07-24T00:00:00Z")).state).toBe("not-seen");
  });

  it("ranks unverified rows before current and rejected rows", () => {
    const rows = PROMO_SCHED.slice(0, 3);
    let observations = recordPromoObservation({}, rows[0], "confirmed", new Date("2026-07-24T00:00:00Z"));
    observations = recordPromoObservation(observations, rows[1], "rejected", new Date("2026-07-24T00:00:00Z"));
    const ranked = rankPromoPatterns(rows, observations, new Date("2026-07-24T00:00:00Z"));
    expect(promoObservationKey(ranked[0])).toBe(promoObservationKey(rows[2]));
    expect(promoObservationKey(ranked.at(-1))).toBe(promoObservationKey(rows[1]));
  });

  it("requires recent observation plus repeated realized values for high confidence", () => {
    expect(derivePromoValueConfidence([], { state: "unverified" }).level).toBe("low");
    expect(derivePromoValueConfidence([{ value: 5 }], { state: "current" }).level).toBe("medium");
    expect(derivePromoValueConfidence([{ value: 5 }, { value: 7 }, { value: 6 }], { state: "current" }).level).toBe("high");
  });

  it("keeps every dashboard consumer inside the historical-pattern evidence boundary", () => {
    const surfaces = [
      "src/components/dashboard/TodayDashboardPanel.jsx",
      "src/components/dashboard/DailyBriefPage.jsx",
      "src/components/dashboard/DailyDashboard.jsx",
    ].map((file) => fs.readFileSync(path.resolve(file), "utf8")).join("\n");
    expect(surfaces).not.toMatch(/Today(?:&apos;|’)s Promos|Recurring promos match today|No recurring promos found for today/i);
    expect(surfaces).toContain("Historical cadence only");
    expect(surfaces).toContain("Patterns to Verify");
    expect(surfaces).toContain("need verification");
  });

  it("removes dormant email and false notification behavior", () => {
    const source = fs.readFileSync(path.resolve("src/components/PromoCalendar.jsx"), "utf8");
    expect(source).not.toMatch(/type="email"|Notification\.requestPermission|you.ll be notified/i);
    expect(source).toContain('localStorage.removeItem("pg_alert_prefs")');
    expect(source).toContain("No email or push delivery is configured");
  });
});
