// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  recordPrediction,
  resolvePrediction,
  resolveWorkflowPrediction,
  summarizeCalibration,
  renderCalibrationBadge,
  MIN_SAMPLE,
} from "../lib/aiCalibration.js";
import { patchWorkflowState } from "../workflows/store.js";
import { buildTrackInsights } from "../track/insights.js";

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

  it("reports unresolved entries without treating them as calibration evidence", () => {
    recordPrediction({ id: "x", source: "advisor", predicted: 0.5 });
    const [summary] = summarizeCalibration();
    expect(summary).toMatchObject({ sample: 0, total: 1, unresolved: 1, brier: null, showable: false });
  });

  it("resolves a linked workflow from the canonical realized outcome", () => {
    recordPrediction({
      id: "advisor:wf-1",
      source: "promo-advisor",
      predicted: 0.62,
      probabilityBasis: "Offer-implied conversion range.",
    });
    const resolved = resolveWorkflowPrediction({ calibrationPredictionId: "advisor:wf-1" }, "($4.50)");
    expect(resolved).toMatchObject({ actual: 0, predicted: 0.62, probabilityBasis: "Offer-implied conversion range." });
  });

  it("connects an advisor save through waiting, Track settlement, and calibration summary", () => {
    const workflow = {
      id: "advisor-flow-1",
      title: "Advisor workflow",
      source: "promo_advisor",
      status: "queued",
      promoType: "bonus_bet",
      positiveOutcomeProbability: 0.62,
      probabilityBasis: "Offer-implied conversion range.",
      calibrationPredictionId: "advisor:advisor-flow-1",
    };
    recordPrediction({
      id: workflow.calibrationPredictionId,
      source: "promo-advisor",
      predicted: workflow.positiveOutcomeProbability,
      probabilityBasis: workflow.probabilityBasis,
    });
    const appData = patchWorkflowState({ workflowInbox: [workflow], resultFeedback: [] }, workflow, { status: "waiting" });
    const insights = buildTrackInsights(appData, new Date("2026-07-31T12:00:00.000Z"));
    expect(insights.openFeedback).toHaveLength(1);
    expect(insights.openFeedback[0]).toMatchObject({
      id: workflow.id,
      status: "waiting",
      calibrationPredictionId: workflow.calibrationPredictionId,
    });
    resolveWorkflowPrediction(insights.openFeedback[0], "12.40");
    expect(summarizeCalibration()[0]).toMatchObject({ sample: 1, total: 1, unresolved: 0 });
  });

  it("is idempotent when the same workflow is saved twice", () => {
    const first = recordPrediction({ id: "same", source: "advisor", predicted: 0.4 });
    resolvePrediction("same", 1);
    const duplicate = recordPrediction({ id: "same", source: "advisor", predicted: 0.9 });
    expect(first.predicted).toBe(0.4);
    expect(duplicate).toMatchObject({ predicted: 0.4, actual: 1 });
  });

  it("renderCalibrationBadge returns formatted string when showable", () => {
    seedPerfectCalibration("promo-advisor", MIN_SAMPLE);
    const [summary] = summarizeCalibration();
    expect(renderCalibrationBadge(summary)).toBe(`promo-advisor: 100% calibrated (n=${MIN_SAMPLE})`);
  });
});
