import { describe, expect, it } from "vitest";
import { BREAKPOINTS, DVH_SHELL_CSS, MOBILE_NAV_RESPONSIVE_CSS, getViewportState } from "../app/responsive.js";

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

  it("DVH_SHELL_CSS provides 100dvh with 100vh fallback for the app shell", () => {
    expect(DVH_SHELL_CSS).toContain(".pg-app-shell");
    expect(DVH_SHELL_CSS).toContain("100vh");
    expect(DVH_SHELL_CSS).toContain("100dvh");
  });
});
