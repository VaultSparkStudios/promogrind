import { describe, expect, it } from "vitest";
import { computeDisciplineScore } from "../lib/discipline.js";

describe("computeDisciplineScore", () => {
  it("rewards closed loops, feedback, bankroll context, and repeat calibration", () => {
    const score = computeDisciplineScore({
      bankroll: "1000",
      workflowInbox: [{ id: "w1" }, { id: "w2" }],
      resultFeedback: [
        { status: "settled", wouldRepeat: "yes", frictionReason: "timing" },
        { status: "skipped", wouldRepeat: "no", skipReason: "odds_moved" },
      ],
      bets: [],
    });

    expect(score.score).toBeGreaterThanOrEqual(85);
    expect(score.band).toBe("Elite");
    expect(score.feedbackCoverage).toBe(100);
  });

  it("penalizes stale open bets and high exposure", () => {
    const score = computeDisciplineScore({
      bankroll: "100",
      resultFeedback: [{ status: "placed" }],
      bets: [
        { status: "open", stake: "45", date: "2026-04-01" },
        { status: "pending", stake: "10", date: "2026-04-02" },
      ],
    }, new Date("2026-04-20T12:00:00Z"));

    expect(score.score).toBeLessThan(40);
    expect(score.tone).toBe("risk");
    expect(score.next).toContain("stale open bets");
  });

  it("does not reward raw volume without outcomes", () => {
    const score = computeDisciplineScore({
      bankroll: "2000",
      workflowInbox: Array.from({ length: 20 }, (_, i) => ({ id: `w${i}` })),
      resultFeedback: [],
      bets: Array.from({ length: 20 }, () => ({ status: "open", stake: "10", date: "2026-05-14" })),
    }, new Date("2026-05-14T12:00:00Z"));

    expect(score.score).toBeLessThan(55);
    expect(score.band).not.toBe("Elite");
  });
});
