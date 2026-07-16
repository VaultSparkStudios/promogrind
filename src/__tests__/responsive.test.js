import { describe, expect, it } from "vitest";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, getViewportState } from "../app/responsive.js";
import { NAV_TAB_LABELS } from "../app/AppNavigation.jsx";

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

describe("MobileBottomNav icon labels", () => {
  it("exports labels for all 6 primary nav tabs", () => {
    expect(NAV_TAB_LABELS).toHaveLength(6);
    expect(NAV_TAB_LABELS).toEqual(["Home", "Convert", "Calc", "Track", "Live", "Learn"]);
  });

  it("maps every tab group position to a named label", () => {
    const TAB_GROUPS = ["Home", "Convert", "Calculate", "Track", "Live", "Learn"];
    TAB_GROUPS.forEach((group, i) => {
      expect(typeof NAV_TAB_LABELS[i]).toBe("string");
      expect(NAV_TAB_LABELS[i].length).toBeGreaterThan(0);
    });
  });
});
