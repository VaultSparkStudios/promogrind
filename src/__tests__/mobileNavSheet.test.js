import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const navSrc = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "AppNavigation.jsx"),
  "utf8"
);

describe("CANON-041 mobile nav sheet contract", () => {
  it("exports MobileNavSheet inner component for the 100dvh overlay", () => {
    expect(navSrc).toContain("MobileNavSheetInner");
  });

  it("uses 100dvh for the nav sheet height", () => {
    expect(navSrc).toContain("100dvh");
  });

  it("includes ARIA dialog role and aria-modal for accessibility", () => {
    expect(navSrc).toContain('role="dialog"');
    expect(navSrc).toContain('aria-modal="true"');
    expect(navSrc).toContain('aria-label="Navigation menu"');
  });

  it("includes an Escape key handler to close the sheet", () => {
    expect(navSrc).toContain('"Escape"');
  });

  it("includes slide-up animation for elite visual craft", () => {
    expect(navSrc).toContain("pg-slide-up");
    expect(navSrc).toContain("translateY");
  });

  it("includes pro badge for gated live features", () => {
    expect(navSrc).toContain("Pro");
    expect(navSrc).toContain("item.pro");
  });

  it("includes filter/search input for navigation discovery", () => {
    expect(navSrc).toContain("Filter navigation items");
    expect(navSrc).toContain("Search navigation");
  });

  it("includes a More button with aria-expanded for screen readers", () => {
    expect(navSrc).toContain('aria-expanded');
    expect(navSrc).toContain("Open full navigation menu");
  });

  it("keeps primary bottom bar slots for Home/Convert/Calc/Track", () => {
    expect(navSrc).toContain("PRIMARY_SLOTS");
    expect(navSrc).toContain("NAV_ICONS");
    expect(navSrc).toContain("NAV_LABELS");
  });

  it("keeps the responsive CSS contract intact for tests and smoke checks", () => {
    const responsive = fs.readFileSync(
      path.join(process.cwd(), "src", "app", "responsive.js"),
      "utf8"
    );
    expect(responsive).toContain(".pg-mobile-nav");
    expect(responsive).toContain(".pg-main-content");
    expect(responsive).toContain("@media (max-width: 768px)");
    expect(responsive).toContain("100dvh");
  });
});
