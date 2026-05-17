import { describe, expect, it } from "vitest";
import { buildTwinForecast, buildOperatorBaseline } from "../ai/operatorTwin.js";

const now = new Date("2026-05-17T12:00:00Z").getTime();

function feedbackAt(daysAgo, status) {
  return {
    status,
    settledAt: new Date(now - daysAgo * 86400000).toISOString(),
  };
}

describe("operator twin", () => {
  it("returns healthy tone when recent matches baseline", () => {
    const feedback = [];
    for (let d = 0; d < 28; d++) {
      feedback.push(feedbackAt(d, "settled"));
      feedback.push(feedbackAt(d, "open"));
    }
    const f = buildTwinForecast({ resultFeedback: feedback }, { now });
    expect(f.tone).toBe("healthy");
  });

  it("flags watch tone on a drop", () => {
    const feedback = [];
    // baseline: 100% closed for 28 days
    for (let d = 5; d < 28; d++) feedback.push(feedbackAt(d, "settled"));
    // recent: 0% closed for last 5
    for (let d = 0; d < 5; d++) feedback.push(feedbackAt(d, "open"));
    const f = buildTwinForecast({ resultFeedback: feedback }, { now });
    expect(f.tone).toBe("watch");
    expect(f.driftPct).toBeLessThan(0);
  });

  it("baseline averages to a number between 0 and 1", () => {
    const baseline = buildOperatorBaseline({ resultFeedback: [feedbackAt(1, "settled")] }, { now });
    expect(baseline.baseline).toBeGreaterThanOrEqual(0);
    expect(baseline.baseline).toBeLessThanOrEqual(1);
  });
});
