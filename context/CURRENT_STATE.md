# Current State

Last updated: 2026-03-26 (v9.1 — simplify session)

## Version
v9.1 (app) / 3.0.0 (package.json — not critical)

## App.jsx
~4,600 lines. Single-file React SPA.

## Tabs / Tools
| Group | Count | Tools |
|---|---|---|
| Home | 1 | Dashboard |
| Convert | 5 | Bonus Bet, Profit Boost, First Bet, Deposit Match, Insurance |
| Calculate | 23 | No-Vig, 3-Way No-Vig, +EV, Kelly, 2-Way Arb, 3-Way Arb, Parlay Hedge, Middle, Odds Convert, Line Shop, Rollover, Teaser, Round Robin, Parlay Builder, SGP Estimator, Hold Calc, Bet Sizer, Income Est., Deposit Optimizer, Hedge Validator, Promo Guarantee, Gut Check, Promo Stacking |
| Track | 7 | Sportsbooks, Bet Tracker, P/L Ledger, Leaderboard, Free Bet Arb, Trade Journal, Odds Compare |
| Live | 2 | Arb Scanner, +EV Scanner (VaultSparked-gated) |
| Learn | 10 | Knowledge Base, Promo Finder, Promo Calendar, Promo Board, Glossary, Refer & Earn, Upgrade, Team Accounts, vs Competitors, Promo Arb Finder |

**Total: 48 tools**

## Build
- App chunk: ~298KB raw / ~84KB gzip
- Vendor chunk: 152KB raw / 49KB gzip (cached across deploys)
- Supabase chunk: 194KB raw / 51KB gzip
- Strategy: network-first JS/CSS, cache-first fonts/images

## Key Data Stores
| Store | Location | Synced? |
|---|---|---|
| Ledger entries | `appData.ledger` | Supabase `promogrind_data.ledger` ✓ |
| All other appData | `appData.*` | Supabase `promogrind_data.tracker` (JSONB) ✓ |
| Profit goal | `appData.profitGoal` | ✓ via tracker |
| Trade journal | `appData.journal` | ✓ via tracker |
| Odds compare rows | `appData.oddsCompare` | ✓ via tracker |
| Promo value history | `appData.promoValueHistory` | ✓ via tracker |
| Calculator state | `localStorage(key)` | No — device-local |
| Login streak dates | `localStorage('pg_login_dates')` | No |
| Alert preferences | `localStorage('pg_alert_prefs')` | No |
| Opportunity log | `localStorage('pg_opp_log')` | No |
| Scanner watchlist | `localStorage('pg_watchlist')` | No |
| Bankroll (setup share) | `localStorage('pg_bankroll')` | No |
| Daily brief enabled | `localStorage('pg_daily_brief')` | No |
| Currency selection | `localStorage('pg_currency')` | No |
| Usage analytics | `localStorage('pg_usage_log')` | No |
| Session tracking | `sessionStorage('pg_session_start')` | No |

## Blockers (unchanged)
1. Affiliate links — placeholder URLs in `src/books.js`, zero revenue
2. Odds API — key not set, scanner non-functional for paying users
3. Stripe — needs LLC + EIN before live mode; test mode setup pending
4. Resend — weekly-digest deployed but key not set
5. Plausible — script in index.html (commented out)

## What's working end-to-end
- Auth (Supabase email/password)
- Cloud sync (loadData / saveData — all fields synced via tracker JSONB)
- Vault points (award_vault_points RPC)
- Referrals (referrals table + get_my_referral_count RPC)
- Leaderboard (leaderboard SQL view)
- PromoBoard (community_board table)
- PWA install (manifest + service worker v2)
- GitHub Pages deploy (auto on push to main)

## Module utilities (as of v9.1)
- `f(n, dp=2)` — number formatter
- `toD(v)` — American/decimal/fractional odds → decimal
- `calcROI(profit, wagered)` — `profit/wagered*100`, null if wagered=0
- `downloadFile(content, filename, mimeType)` — anchor-click-revoke download helper
- `parseNL(text)` — natural language bet input parser (module scope)
- `parseBetSlip(text)` — bet slip text parser (module scope)
