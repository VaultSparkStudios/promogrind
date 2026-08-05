import { describe, expect, it } from "vitest";
import { buildToolMixProfile } from "../lib/userProfile.js";

describe("tool-mix observation", () => {
  it("keeps sparse history neutral and explicitly non-performance", () => {
    const result = buildToolMixProfile({ "arb-2way": 2 });
    expect(result).toMatchObject({ type: "general", count: 2, evidence: { confidence: "limited-sample", performanceClaim: false } });
    expect(result.disclaimer).toMatch(/not evidence of skill, profit, or future outcomes/i);
  });

  it("labels a dominant family only from a sufficient count and reports its basis", () => {
    const result = buildToolMixProfile({ "arb-2way": 7, "ev": 2 }, { primaryCalc: "arb-2way" });
    expect(result).toMatchObject({ type: "arb", count: 9, primaryCalc: "arb-2way", evidence: { source: "local-calculator-history", dominanceRatio: 3.5 } });
    expect(result.label).toMatch(/tool concentration/i);
  });

  it("keeps tied families mixed and ignores malformed counts", () => {
    const result = buildToolMixProfile({ "bonus-bet": 4, "ev": 4, "arb-2way": -2, teaser: "bad", unknown: 99 });
    expect(result).toMatchObject({ type: "general", count: 8 });
    expect(result.evidence.distribution.bonus).toBe(0.5);
    expect(result.evidence.distribution.ev).toBe(0.5);
  });
});
