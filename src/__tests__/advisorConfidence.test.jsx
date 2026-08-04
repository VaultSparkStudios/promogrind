// @vitest-environment happy-dom
import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { governAdvisorConfidence } from "../lib/advisorConfidence.js";
import AdvisorConfidenceCard from "../components/AdvisorConfidenceCard.jsx";

const supportive = { source: "promo-advisor", sample: 14, calibration: 84, showable: true };

describe("Advisor confidence governor", () => {
  it("abstains from an overconfident estimate with missing facts", () => {
    const result = governAdvisorConfidence({ confidence: "high", evidenceGrade: "estimate", missingInputs: ["cap", "expiry"], analysisSource: "model", calibration: supportive });
    expect(result.posture).toBe("abstain");
    expect(result.actionabilityCap).toBe(0);
    expect(result.reasonCodes).toEqual(expect.arrayContaining(["evidence-estimate", "multiple-missing-inputs"]));
    expect(result.receipt.outcomeProbabilityClaimed).toBe(false);
  });

  it("uses an explicit verify posture during calibration cold start", () => {
    const result = governAdvisorConfidence({ confidence: "high", evidenceGrade: "complete", analysisSource: "model", calibration: { sample: 4, calibration: 95, showable: false } });
    expect(result.posture).toBe("verify");
    expect(result.actionabilityCap).toBe(35);
    expect(result.reasonCodes).toContain("calibration-cold-start");
  });

  it("abstains when resolved history is materially degraded", () => {
    const result = governAdvisorConfidence({ confidence: "high", evidenceGrade: "complete", analysisSource: "model", calibration: { sample: 20, calibration: 52, showable: true } });
    expect(result.posture).toBe("abstain");
    expect(result.reasonCodes).toContain("calibration-degraded");
  });

  it("discloses rule-engine provenance without granting cold-start authority", () => {
    const result = governAdvisorConfidence({ confidence: "high", evidenceGrade: "complete", analysisSource: "rule_engine", calibration: null });
    expect(result.posture).toBe("verify");
    expect(result.reasonCodes).toContain("rule-engine-provenance");
  });

  it("permits bounded action only with complete inputs and supportive revealed calibration", () => {
    const result = governAdvisorConfidence({ confidence: "high", evidenceGrade: "complete", missingInputs: [], analysisSource: "model", calibration: supportive });
    expect(result.posture).toBe("act");
    expect(result.actionabilityCap).toBe(100);
    expect(result.receipt).toMatchObject({ rawConfidence: "high", missingInputCount: 0, analysisSource: "model" });
  });

  it("renders an accessible posture receipt that distinguishes raw confidence", () => {
    const governor = governAdvisorConfidence({ confidence: "high", evidenceGrade: "partial", missingInputs: ["expiry"], analysisSource: "model", calibration: supportive });
    render(<AdvisorConfidenceCard governor={governor} />);
    expect(screen.getByRole("status", { name: /advisor posture: verify first/i })).toBeTruthy();
    expect(screen.getByText(/Raw high · partial evidence/i)).toBeTruthy();
    expect(screen.getByText(/no outcome probability inferred/i)).toBeTruthy();
  });
});
