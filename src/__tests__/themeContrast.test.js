import { describe, expect, it } from "vitest";
import { auditSemanticPalette, contrastRatio, relativeLuminance } from "../lib/colorContrast.js";
import { KD, KL } from "../lib/shared.js";

describe("semantic theme contrast", () => {
  it("implements the WCAG relative-luminance and contrast formulas", () => {
    expect(relativeLuminance("#000000")).toBe(0);
    expect(relativeLuminance("#ffffff")).toBe(1);
    expect(contrastRatio("#000000", "#ffffff")).toBe(21);
    expect(() => contrastRatio("transparent", "#fff")).toThrow(TypeError);
  });

  it.each([["dark", KD], ["light", KL]])("keeps every %s semantic foreground and accent ink pair AA-readable", (_name, palette) => {
    const report = auditSemanticPalette(palette);
    expect(report.pairs).toHaveLength(37);
    expect(report.failures).toEqual([]);
    expect(Math.min(...report.pairs.map((pair) => pair.ratio))).toBeGreaterThanOrEqual(4.5);
  });
});
