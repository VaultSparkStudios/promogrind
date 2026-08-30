import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const navSource = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "AppNavigation.jsx"),
  "utf8",
);

describe("mobile nav SVG icon upgrade (CANON-041)", () => {
  it("exports NAV_ICONS with an entry for every core tab group", () => {
    const groups = ["Home", "Convert", "Calculate", "Track", "Live", "Learn"];
    for (const group of groups) {
      expect(navSource).toContain(`${group}:`);
    }
  });

  it("uses inline SVG elements instead of text pseudo-icons", () => {
    expect(navSource).toContain("<svg ");
    expect(navSource).toContain("viewBox");
    expect(navSource).toContain("currentColor");
  });

  it("renders an active indicator bar at the top of the active tab", () => {
    // The glowing top-edge indicator is the CANON-041 craft signal
    expect(navSource).toContain("active && (");
    expect(navSource).toContain("boxShadow");
  });

  it("applies aria-current=page to the active tab for accessibility", () => {
    expect(navSource).toContain('aria-current={active ? "page" : undefined}');
  });

  it("abbreviates Calculate to Calc in the nav label", () => {
    expect(navSource).toContain('Calculate: "Calc"');
  });

  it("uses safe-area-inset-bottom for modern mobile viewport support", () => {
    expect(navSource).toContain("env(safe-area-inset-bottom");
  });

  it("does not use text strings as icon substitutes", () => {
    // The old pattern was a simple icons array with text labels
    expect(navSource).not.toContain('const icons = ["Home"');
    expect(navSource).not.toContain('const labels = ["Home"');
  });
});
