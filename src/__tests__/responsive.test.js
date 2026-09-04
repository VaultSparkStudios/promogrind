import { describe, expect, it } from "vitest";
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

  it("hides the sub-nav sheet on desktop via the responsive CSS contract", () => {
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-subnav-sheet-backdrop");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain("@media (min-width: 769px)");
  });

  it("provides scroll-behavior and scrollbar-hiding for the sub-nav sheet", () => {
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-subnav-sheet");
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain("scrollbar-width: none");
  });
});
