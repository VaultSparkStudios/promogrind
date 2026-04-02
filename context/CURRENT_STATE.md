# Current State

Last updated: 2026-04-02 (v26.0 — component extraction sprint, trust strip propagation, server-backed wins wall, 78 tests)

## Version
v26.0 (app) / 3.0.0 (package.json — not critical)

## Audit Snapshot
- App.jsx reduced from ~7,459 to ~5,785 lines (-22%) via component extraction to src/components/.
- Shared infrastructure now lives in contexts.jsx, ui.jsx, and data/promoSchedule.js.
- Trust strip + footer note propagated to 84+ static SEO pages in public/.
- CommunityWinsWall is now server-backed (Supabase wins_wall table) with local fallback for unauthenticated users.
- Migration SQL ready at scripts/migration-wins-wall.sql (not yet run in prod).
- Build passes and tests remain green at 78/78.

## App.jsx
~5,785 lines. Single-file React SPA with 5 major components extracted to src/components/:
- Tracker.jsx (288 lines)
- Ledger.jsx (500 lines) — includes ShareWeekBtn, ReportCard, BetHeatmap, TaxTimingAdvisor
- LiveScanner.jsx (407 lines) — includes detectArbs, detectEV, SPORTS_LIST, PROP_MARKETS
- TaxesEstimator.jsx (134 lines)
- PromoChat.jsx (231 lines)

Shared modules:
- src/contexts.jsx — ToastCtx, useToast, ToastProvider, AppDataCtx, CompactCtx, FX, CurrencyCtx
- src/ui.jsx — In, RR, Tl, Nt, BookCTA, FeatureUnavailableCard, useCalcMemory, shouldShowTrigger, dismissTrigger, S (with JSX meter)
- src/data/promoSchedule.js — PROMO_SCHED, DAYS_ORDER

## Tabs / Tools
| Group | Count | Tools |
|---|---|---|
| Home | 1 | Dashboard |
| Convert | 5 | Bonus Bet, Profit Boost, First Bet, Deposit Match, Insurance |
| Calculate | 24 | No-Vig, 3-Way No-Vig, +EV, Kelly, 2-Way Arb, 3-Way Arb, Parlay Hedge, Middle, Odds Convert, Line Shop, Rollover, Teaser, Round Robin, Parlay Builder, SGP Estimator, Hold Calc, Bet Sizer, Income Est., Deposit Optimizer, Hedge Validator, Promo Guarantee, Gut Check, Promo Stacking, **Taxes Estimator** |
| Track | 8 | Sportsbooks, Bet Tracker, P/L Ledger, Leaderboard, Free Bet Arb, Trade Journal, Odds Compare, **Profit Cert** |
| Live | 4 | Arb Scanner, +EV Scanner, Action Plan (VaultSparked), **Stack Builder** (VaultSparked) |
| Learn | 11 | Knowledge Base, Promo Finder, Promo Calendar, Promo Board, Glossary, Refer & Earn, Upgrade, Team Accounts, vs Competitors, Promo Arb Finder, Community Promos |

**Total: 53 tools**

## Static SEO Pages: 93
All pages now have trust strip + footer note via docs/SEO_TRUST_STRIP_TEMPLATE.md pattern.

## Build
- `npm run build` → 121.46 KB gzip (index), 49.33 KB (vendor), 50.93 KB (supabase)
- `npm test` → 78/78 passing
