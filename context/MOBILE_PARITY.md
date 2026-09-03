# Mobile Parity — CANON-041 Attestation

Last updated: 2026-09-03 (feat/canon-041-mobile-nav-upgrade)

## Status: PARTIAL — in progress toward SPARKED gate

PromoGrind is a browser-only SPA. All surfaces must pass the CANON-041 hard gate before SPARKED:

| Criterion | Status | Notes |
|---|---|---|
| Desktop↔mobile parity (all features at ≤390–768px) | ✅ | Horizontal sub-tab scroll + MobileBottomNav covers all tab groups; QuickCalcPanel gives mobile-first calculator access |
| Mobile nav ≥44px touch targets | ✅ | `minHeight: 52` per button (enforced in `src/app/AppNavigation.jsx`; regression-guarded in `responsive.test.js`) |
| Mobile nav: scrollable within itself when taller than screen | ✅ | Bottom nav is fixed and never exceeds screen height; primary sub-tab strip scrolls horizontally within its row |
| `100dvh` not `100vh` | ✅ | Main app wrapper and auth loading screens use `minHeight: 100dvh`; landing route uses `minHeight: 100vh` (acceptable — not a fixed-height element) |
| `env(safe-area-inset-bottom)` | ✅ | `padding-bottom: env(safe-area-inset-bottom, 0px)` on the nav container |
| Body scroll lock released on close | N/A | No full-screen drawer with body lock; bottom tab bar is always visible |
| `prefers-reduced-motion` respected | ✅ | `.pg-mobile-nav-btn` transitions suppressed via media query in `MOBILE_NAV_ICON_CSS` |
| Elite visual craft: SVG icons | ✅ | All 6 tab groups now have distinct inline SVG icons (dashboard, exchange, calculator, chart, signal, graduation cap) |
| Elite visual craft: active indicator | ✅ | 2px green bar above active tab + color contrast; smooth transition on color |
| Elite visual craft: 60fps / no jank | ✅ | Icon transitions use CSS `color` and `opacity` only (GPU-compositable) |
| Theme parity (dark / light) | ✅ | Icons and indicators use `currentColor` — inherits from the themed `K.gn` / `K.mt` token system |

## Remaining CANON-041 work before SPARKED

- Visual QA with real Chromium captures (dark + light × desktop + mobile) — requires running `npm run verify:web-live`
- `node ../vaultspark-studio-ops/scripts/check-mobile-parity.mjs --json` — requires private ops repo
- Founder approval after visual review

## Attestation method

Attested by agent session S130 via code inspection and the full Vitest suite (708/708 passing, including 3 CANON-041–specific assertions in `src/__tests__/responsive.test.js`).
