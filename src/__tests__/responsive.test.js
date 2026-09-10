import { describe, expect, it } from "vitest";
import { BREAKPOINTS, MOBILE_NAV_RESPONSIVE_CSS, MOBILE_DRAWER_CSS, getViewportState } from "../app/responsive.js";

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

describe("CANON-041 mobile drawer contract", () => {
  it("uses 100dvh so the sheet fills the visual viewport on mobile (100vh fallback allowed)", () => {
    expect(MOBILE_DRAWER_CSS).toContain("100dvh");
    // 100dvh must come after the 100vh fallback (cascade order: dvh wins in supporting browsers)
    const dvhIdx = MOBILE_DRAWER_CSS.indexOf("100dvh");
    const vhIdx = MOBILE_DRAWER_CSS.indexOf("100vh");
    // If 100vh exists, 100dvh must follow it in the cascade
    if (vhIdx !== -1) {
      expect(dvhIdx).toBeGreaterThan(vhIdx);
    }
  });

  it("includes prefers-reduced-motion guard on the slide animation", () => {
    expect(MOBILE_DRAWER_CSS).toContain("prefers-reduced-motion: reduce");
    expect(MOBILE_DRAWER_CSS).toContain("animation: none");
  });

  it("exports the drawer CSS so it can be injected into the component", () => {
    expect(typeof MOBILE_DRAWER_CSS).toBe("string");
    expect(MOBILE_DRAWER_CSS.length).toBeGreaterThan(0);
    expect(MOBILE_DRAWER_CSS).toContain("pg-nav-drawer-sheet");
  });
});
