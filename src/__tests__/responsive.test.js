import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, getViewportState } from "../app/responsive.js";

describe("responsive launch contract", () => {
  it("keeps the smoke-tested mobile breakpoint marker in the app bundle", () => {
    expect(BREAKPOINTS.md).toBe(768);
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain("@media (max-width: 768px)");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-mobile-nav");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-main-content");
  });

  it("uses bottom navigation only for phone-width viewports", () => {
    expect(getViewportState(390).navMode).toBe("bottom-tabs");
    expect(getViewportState(768).navMode).toBe("hybrid");
    expect(getViewportState(1024).navMode).toBe("top-tabs");
  });
});

describe("MobileBottomNav icon contract (CANON-041 visual craft)", () => {
  const navSource = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "AppNavigation.jsx"),
    "utf8"
  );

  it("defines NAV_ICONS with SVG elements for all 6 nav groups", () => {
    expect(navSource).toContain("NAV_ICONS");
    const svgCount = (navSource.match(/<svg\b/g) || []).length;
    expect(svgCount).toBeGreaterThanOrEqual(6);
  });

  it("icons use currentColor so active/inactive state follows button color", () => {
    expect(navSource).toContain("currentColor");
  });

  it("icons are aria-hidden so the visible label carries accessibility context", () => {
    expect(navSource).toContain('aria-hidden="true"');
  });

  it("removes the old text-only icons placeholder array", () => {
    expect(navSource).not.toMatch(/const icons\s*=\s*\[/);
  });
});
