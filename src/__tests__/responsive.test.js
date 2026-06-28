import { describe, expect, it } from "vitest";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, APP_DVH_CSS, getViewportState } from "../app/responsive.js";

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

  it("hides the mobile nav scrollbar", () => {
    expect(MOBILE_NAV_RESPONSIVE_CSS).toContain(".pg-mobile-nav::-webkit-scrollbar");
  });
});

describe("APP_DVH_CSS viewport height contract", () => {
  it("targets the pg-app-root class", () => {
    expect(APP_DVH_CSS).toContain(".pg-app-root");
  });

  it("includes a 100vh legacy fallback", () => {
    expect(APP_DVH_CSS).toContain("100vh");
  });

  it("includes 100dvh for iOS Safari 15.4+ dynamic viewport", () => {
    expect(APP_DVH_CSS).toContain("100dvh");
  });

  it("declares dvh after vh so modern browsers use dvh (cascade order)", () => {
    const vhPos = APP_DVH_CSS.indexOf("100vh");
    const dvhPos = APP_DVH_CSS.indexOf("100dvh");
    expect(vhPos).toBeGreaterThanOrEqual(0);
    expect(dvhPos).toBeGreaterThan(vhPos);
  });
});
