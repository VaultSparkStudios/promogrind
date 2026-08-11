import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const navSource = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "AppNavigation.jsx"),
  "utf8"
);
const responsiveSource = fs.readFileSync(
  path.join(process.cwd(), "src", "app", "responsive.js"),
  "utf8"
);

describe("CANON-041 mobile nav elite upgrade", () => {
  it("exports MobileNavDrawer as a named export", () => {
    expect(navSource).toContain("export function MobileNavDrawer(");
  });

  it("MobileNavDrawer uses 90dvh height for the full-viewport scrollable panel", () => {
    expect(navSource).toContain("90dvh");
  });

  it("MobileNavDrawer has a scrollable content region for the nav tree", () => {
    expect(navSource).toContain("overflowY: \"auto\"");
  });

  it("MobileNavDrawer renders with aria-modal for accessibility", () => {
    expect(navSource).toContain("aria-modal=\"true\"");
  });

  it("MobileBottomNav uses SVG icons (not text-only labels as icon surrogates)", () => {
    // Confirms SVG elements are present (not just text labels at 10px)
    expect(navSource).toContain("<svg");
    expect(navSource).toContain("viewBox=\"0 0 24 24\"");
  });

  it("MobileBottomNav has the NAV_ICONS array of icon components", () => {
    expect(navSource).toContain("const NAV_ICONS");
    expect(navSource).toContain("IconHome");
    expect(navSource).toContain("IconConvert");
    expect(navSource).toContain("IconCalc");
    expect(navSource).toContain("IconTrack");
    expect(navSource).toContain("IconLive");
    expect(navSource).toContain("IconLearn");
  });

  it("MobileBottomNav applies glassmorphism via backdropFilter", () => {
    expect(navSource).toContain("backdropFilter");
    expect(navSource).toContain("blur(24px)");
  });

  it("MobileBottomNav active indicator animates via CSS transition", () => {
    expect(navSource).toContain("transition: \"width 0.2s");
  });

  it("tapping the active tab opens the drawer (drawer open on active re-tap)", () => {
    // The handler opens the drawer when gi === index
    expect(navSource).toContain("gi === index");
    expect(navSource).toContain("setDrawerOpen(true)");
  });

  it("responsive CSS hides the top group-tabs bar on mobile", () => {
    // MOBILE_NAV_RESPONSIVE_CSS now includes a rule for .pg-group-tabs-bar
    const { MOBILE_NAV_RESPONSIVE_CSS } = (() => {
      // Inline eval of the export — just check the source string for the rule
      return {};
    })();
    expect(responsiveSource).toContain(".pg-group-tabs-bar");
    expect(responsiveSource).toContain("display: none !important");
  });

  it("App.jsx tags the top group-tabs bar with pg-group-tabs-bar class", () => {
    const appSource = fs.readFileSync(
      path.join(process.cwd(), "src", "App.jsx"),
      "utf8"
    );
    expect(appSource).toContain("pg-group-tabs-bar");
  });
});
