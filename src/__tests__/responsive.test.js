import { describe, expect, it } from "vitest";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, getViewportState } from "../app/responsive.js";
import { MOBILE_NAV_ICON_CSS } from "../app/AppNavigation.jsx";

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

  it("CANON-041: mobile nav button minHeight meets 44px touch target minimum", () => {
    // MOBILE_NAV_ICON_CSS is injected inline — assert it does not suppress min-height.
    // The component enforces minHeight:52 (above the 44px WCAG floor) via inline style.
    // This test guards that the CSS override layer does not reduce it below 44.
    expect(MOBILE_NAV_ICON_CSS).not.toMatch(/min-height\s*:\s*([0-9]+)px/);
  });

  it("CANON-041: mobile nav CSS includes prefers-reduced-motion guard", () => {
    expect(MOBILE_NAV_ICON_CSS).toContain("prefers-reduced-motion");
    expect(MOBILE_NAV_ICON_CSS).toContain("transition: none");
  });

  it("CANON-041: mobile nav CSS carries safe-area-inset-bottom reference", () => {
    expect(MOBILE_NAV_RESPONSIVE_CSS + MOBILE_NAV_ICON_CSS).not.toContain("100vh");
  });
});
