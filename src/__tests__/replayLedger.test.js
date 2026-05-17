import { describe, expect, it } from "vitest";
import { buildReplayInsights } from "../lib/replayLedger.js";

const now = new Date("2026-05-17T12:00:00Z").getTime();

describe("buildReplayInsights", () => {
  it("returns no insights when no 14-day-old evidence exists", () => {
    const r = buildReplayInsights(
      { resultFeedback: [{ status: "settled", profit: 10, createdAt: new Date(now - 86400000).toISOString() }] },
      { now },
    );
    expect(r.hasEnoughHistory).toBe(false);
    expect(r.insights).toEqual([]);
  });

  it("surfaces best-lane insight when settled history exists", () => {
    const old = (days, lane, profit) => ({
      status: "settled",
      promoType: lane,
      profit,
      createdAt: new Date(now - days * 86400000).toISOString(),
      settledAt: new Date(now - (days - 1) * 86400000).toISOString(),
    });
    const r = buildReplayInsights(
      {
        resultFeedback: [
          old(20, "bonus_bet", 15),
          old(18, "bonus_bet", 20),
          old(16, "parlay", -5),
          old(15, "parlay", -3),
        ],
      },
      { now },
    );
    expect(r.hasEnoughHistory).toBe(true);
    expect(r.insights.some((i) => i.key === "best-lane")).toBe(true);
  });

  it("never shames a skip — uses operator-friendly tone", () => {
    const old = (days, status, profit, lane = "bonus_bet") => ({
      status,
      promoType: lane,
      profit,
      createdAt: new Date(now - days * 86400000).toISOString(),
    });
    const r = buildReplayInsights(
      {
        resultFeedback: [
          old(20, "skipped", 0),
          old(19, "skipped", 0),
          old(18, "settled", -10),
          old(17, "settled", -8),
        ],
      },
      { now },
    );
    const skipInsight = r.insights.find((i) => i.key === "skip-vs-settle");
    expect(skipInsight?.tone).toBe("healthy");
  });
});
