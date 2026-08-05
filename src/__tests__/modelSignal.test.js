import { describe, expect, it } from "vitest";
import { buildModelSignal, juiceFromEVPct, juiceFromROI } from "../lib/juiceScore.js";

describe("model signal receipts", () => {
  it("bounds the legacy score but labels it as assumption-bound, not play quality", () => {
    const receipt = buildModelSignal({ score: 120, basis: "Quoted return", assumption: "Prices remain live" });
    expect(receipt).toMatchObject({ score: 100, band: "higher", label: "HIGHER MODEL SIGNAL", confidence: "assumption-bound", basis: "Quoted return" });
    expect(receipt.interpretation).toMatch(/not a recommendation or outcome probability/i);
    expect(receipt.label).not.toMatch(/play|excellent|good/i);
  });

  it("preserves deterministic transforms while keeping their basis external", () => {
    expect(juiceFromROI(5)).toBe(80);
    expect(juiceFromEVPct(5)).toBe(80);
    expect(buildModelSignal({ score: juiceFromEVPct(-50) }).score).toBeGreaterThanOrEqual(0);
  });

  it("provides safe defaults for malformed input", () => {
    expect(buildModelSignal({ score: "bad" })).toMatchObject({ score: 0, band: "lower", confidence: "assumption-bound" });
  });
});
