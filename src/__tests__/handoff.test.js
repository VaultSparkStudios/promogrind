import { describe, it, expect } from "vitest";
import { buildHandoffWorkflow, buildTrackerPrefill } from "../workflows/handoff.js";

const samplePayload = {
  calcKey: "bonus-bet",
  calcName: "Bonus Bet Converter",
  book: "DraftKings",
  promoType: "bonus_bet",
  inputs: [
    { label: "Bonus", value: "$25" },
    { label: "Odds", value: "+150" },
  ],
  outputs: [
    { label: "Stake", value: "$25", highlight: true },
    { label: "Guaranteed Profit", value: "$10.50", highlight: true },
  ],
  terms: "Use within 7 days. Min odds -200.",
  expiresAt: "2026-05-25T00:00:00Z",
  occurredAt: "2026-05-18T10:00:00Z",
};

describe("buildHandoffWorkflow", () => {
  it("produces a stable, deterministic ID for the same calc+book", () => {
    const a = buildHandoffWorkflow(samplePayload);
    const b = buildHandoffWorkflow(samplePayload);
    expect(a.id).toBe(b.id);
    expect(a.id).toBe("calc-handoff:bonus-bet:draftkings");
  });

  it("marks sourceCalc and sourceType so adaptive ranking can attribute", () => {
    const wf = buildHandoffWorkflow(samplePayload);
    expect(wf.sourceCalc).toBe("bonus-bet");
    expect(wf.sourceType).toBe("calculator");
    expect(wf.kind).toBe("calc-handoff");
  });

  it("extracts stake and expected return from outputs", () => {
    const wf = buildHandoffWorkflow(samplePayload);
    expect(wf.stake).toBe(25);
    expect(wf.expectedReturn).toBe(10.5);
  });

  it("snapshots terms text under 600 chars", () => {
    const longTerms = "x".repeat(900);
    const wf = buildHandoffWorkflow({ ...samplePayload, terms: longTerms });
    expect(wf.termsSnapshot.length).toBe(600);
  });

  it("builds a tracker prefill that mirrors workflow truth", () => {
    const { workflow, prefill } = buildTrackerPrefill(samplePayload);
    expect(prefill.book).toBe("DraftKings");
    expect(prefill.stake).toBe(25);
    expect(prefill.sourceWorkflowId).toBe(workflow.id);
    expect(prefill.sourceCalc).toBe("bonus-bet");
  });
});
