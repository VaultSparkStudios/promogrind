import React from "react";

export const BREAKPOINTS = {
  xs: 390,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1440,
};

export const MOBILE_NAV_RESPONSIVE_CSS = [
  "@media (min-width: 769px) { .pg-mobile-nav { display: none !important; } }",
  /* Hide the redundant top group-tabs bar on mobile — the bottom nav handles group switching */
  "@media (max-width: 768px) { .pg-group-tabs-bar { display: none !important; } }",
  "@media (max-width: 768px) { .pg-main-content { padding-bottom: 88px !important; } }",
].join(" ");

export function getViewportState(width = 1280) {
  const w = Number(width || 1280);
  const isPhone = w < BREAKPOINTS.sm;
  const isTablet = w >= BREAKPOINTS.sm && w < BREAKPOINTS.lg;
  const isDesktop = w >= BREAKPOINTS.lg;
  const size =
    w < BREAKPOINTS.xs ? "xs" :
    w < BREAKPOINTS.sm ? "sm" :
    w < BREAKPOINTS.md ? "md" :
    w < BREAKPOINTS.lg ? "lg" :
    w < BREAKPOINTS.xl ? "xl" :
    "xxl";

  const shellPadding =
    size === "xs" ? 12 :
    size === "sm" ? 16 :
    size === "md" ? 18 :
    size === "lg" ? 22 :
    28;

  const contentPadding =
    isPhone ? 14 :
    isTablet ? 18 :
    24;

  const cardPadding =
    size === "xs" ? 14 :
    isPhone ? 16 :
    isTablet ? 18 :
    20;

  return {
    width: w,
    size,
    isPhone,
    isMobile: isPhone,
    isTablet,
    isDesktop,
    isWide: w >= BREAKPOINTS.xl,
    shellPadding,
    contentPadding,
    cardPadding,
    sectionGap: isPhone ? 14 : isTablet ? 18 : 22,
    navMode: isPhone ? "bottom-tabs" : isTablet ? "hybrid" : "top-tabs",
    landingColumns: w >= BREAKPOINTS.lg ? 2 : 1,
    contentMaxWidth: w >= BREAKPOINTS.xl ? 1280 : 1120,
  };
}

export function useViewport() {
  const readWidth = () => {
    if (typeof window === "undefined") return 1280;
    if (window.visualViewport?.width) return Math.round(window.visualViewport.width);
    return window.innerWidth;
  };

  const [width, setWidth] = React.useState(readWidth);

  React.useEffect(() => {
    const onResize = () => setWidth(readWidth());
    window.addEventListener("resize", onResize, { passive: true });
    window.visualViewport?.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, []);

  return React.useMemo(() => getViewportState(width), [width]);
}
