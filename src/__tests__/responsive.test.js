import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, getViewportState } from "../app/responsive.js";
const NAV_SOURCE = fs.readFileSync(path.join(process.cwd(), "src", "app", "AppNavigation.jsx"), "utf8");

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

describe("CANON-041 mobile nav contract", () => {
  it("MobileBottomNav buttons meet the 44px minimum tap target (minHeight: 44)", () => {
    expect(NAV_SOURCE).toContain("minHeight: 44");
  });

  it("MobileBottomNav uses safe-area-inset-bottom for notch devices", () => {
    expect(NAV_SOURCE).toContain("safe-area-inset-bottom");
  });

  it("MobileBottomNav icons are distinct from labels (not duplicate text)", () => {
    expect(NAV_SOURCE).toContain("NAV_ICONS");
    expect(NAV_SOURCE).toContain("NAV_LABELS");
    expect(NAV_SOURCE).toMatch(/NAV_ICONS\s*=\s*\[/);
    expect(NAV_SOURCE).toMatch(/NAV_LABELS\s*=\s*\[/);
    const iconsMatch = NAV_SOURCE.match(/NAV_ICONS\s*=\s*\[([^\]]+)\]/);
    const labelsMatch = NAV_SOURCE.match(/NAV_LABELS\s*=\s*\[([^\]]+)\]/);
    expect(iconsMatch).not.toBeNull();
    expect(labelsMatch).not.toBeNull();
    expect(iconsMatch[1]).not.toBe(labelsMatch[1]);
  });

  it("tab transition animation respects prefers-reduced-motion", () => {
    const appSource = fs.readFileSync(path.join(process.cwd(), "src", "App.jsx"), "utf8");
    expect(appSource).toContain("prefers-reduced-motion");
    expect(appSource).toContain("pg-content-fade");
    expect(appSource).toContain("pg-content-enter");
  });
});
