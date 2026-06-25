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
});

describe("MobileNavDrawer contract", () => {
  it("drawer file exports MobileNavDrawer", async () => {
    const mod = await import("../components/MobileNavDrawer.jsx");
    expect(typeof mod.MobileNavDrawer).toBe("function");
  });

  it("phone viewport is the target for mobile nav drawer", () => {
    const phone = getViewportState(390);
    expect(phone.isPhone).toBe(true);
    expect(phone.isMobile).toBe(true);
    expect(phone.navMode).toBe("bottom-tabs");
  });

  it("tablet and desktop viewports do not use bottom-tabs mode", () => {
    expect(getViewportState(900).navMode).not.toBe("bottom-tabs");
    expect(getViewportState(1280).navMode).not.toBe("bottom-tabs");
  });
});
