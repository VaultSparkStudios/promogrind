// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordPrediction,
  resolvePrediction,
  summarizeCalibration,
  renderCalibrationBadge,
  MIN_SAMPLE,
} from "../lib/aiCalibration.js";

beforeEach(() => {
  window.localStorage.clear();
});

function seedPerfectCalibration(source, n) {
  for (let i = 0; i < n; i++) {
    const id = `${source}-${i}`;
    const predicted = i % 2 ? 1 : 0;
    recordPrediction({ id, source, predicted });
    resolvePrediction(id, predicted);
  }
}

describe("aiCalibration", () => {
  it("hides per-source summary until min-sample is reached", () => {
    for (let i = 0; i < MIN_SAMPLE - 1; i++) {
      recordPrediction({ id: `p-${i}`, source: "promo-advisor", predicted: 0.7 });
      resolvePrediction(`p-${i}`, 1);
    }
    const [summary] = summarizeCalibration();
    expect(summary.sample).toBe(MIN_SAMPLE - 1);
    expect(summary.showable).toBe(false);
    expect(renderCalibrationBadge(summary)).toBeNull();
  });

  it("computes Brier score = 0 for perfectly-calibrated source", () => {
    seedPerfectCalibration("promo-advisor", MIN_SAMPLE);
    const [summary] = summarizeCalibration();
    expect(summary.sample).toBe(MIN_SAMPLE);
    expect(summary.brier).toBe(0);
    expect(summary.calibration).toBe(100);
    expect(summary.showable).toBe(true);
  });

  it("computes Brier > 0 for poorly-calibrated source", () => {
    // Predicts 0.9 each time, actual is 0 each time → (0.9-0)^2 = 0.81
    for (let i = 0; i < MIN_SAMPLE; i++) {
      recordPrediction({ id: `b-${i}`, source: "action-plan", predicted: 0.9 });
      resolvePrediction(`b-${i}`, 0);
    }
    const summary = summarizeCalibration().find((s) => s.source === "action-plan");
    expect(summary.brier).toBeCloseTo(0.81, 2);
    expect(summary.calibration).toBe(19);
  });

  it("excludes unresolved entries", () => {
    recordPrediction({ id: "x", source: "advisor", predicted: 0.5 });
    const summaries = summarizeCalibration();
    expect(summaries).toHaveLength(0);
  });

  it("renderCalibrationBadge returns formatted string when showable", () => {
    seedPerfectCalibration("promo-advisor", MIN_SAMPLE);
    const [summary] = summarizeCalibration();
    expect(renderCalibrationBadge(summary)).toBe(`promo-advisor: 100% calibrated (n=${MIN_SAMPLE})`);
  });
});
