import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const navSource = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "AppNavigation.jsx"),
  "utf8"
);

describe("CANON-041 MobileBottomNav icon contract", () => {
  it("exports SVG icons for all six tab groups", () => {
    expect(navSource).toContain("NAV_ICONS");
    for (const group of ["Home", "Convert", "Calculate", "Track", "Live", "Learn"]) {
      expect(navSource).toContain(`${group}:`);
    }
  });

  it("uses real SVG paths, not text placeholders as icons", () => {
    // Confirm SVG elements are present
    expect(navSource).toContain("<svg");
    expect(navSource).toContain("viewBox");
    expect(navSource).toContain("stroke=");
    // Old text-only icon pattern must be absent
    expect(navSource).not.toMatch(/icons\s*=\s*\["Home"/);
  });

  it("provides aria-label on each bottom nav button", () => {
    expect(navSource).toContain('aria-label={`Go to ${tab.group}`}');
    expect(navSource).toContain('aria-current={active ? "page" : undefined}');
  });

  it("maps group names to abbreviated labels for compact display", () => {
    expect(navSource).toContain("NAV_LABELS");
    expect(navSource).toContain('Calculate: "Calc"');
  });

  it("uses an accent indicator bar instead of color alone for active state", () => {
    // Active state renders a top accent stripe (not just color change)
    expect(navSource).toContain("top: 0");
    expect(navSource).toContain('height: 2');
    expect(navSource).toContain("borderRadius");
  });
});
