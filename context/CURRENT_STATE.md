# Current State

Last updated: 2026-03-26 (v13.0 — Chrome extension + AI parser + UK market + blog)

## Version
v13.0 (app) / 3.0.0 (package.json — not critical)

## App.jsx
~5,870 lines. Single-file React SPA.

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

## Static SEO Pages: 45
- 17 keyword pages (bonus-bet, arb-calculator, kelly-criterion, no-vig, profit-boost, parlay-calculator, hedge-calculator, ev-calculator, matched-betting, promo-converter, sportsbook-promo, sports-betting-tools, arbitrage-betting, free-bet-calculator, deposit-match-calculator, rollover-calculator, same-game-parlay)
- 10 state pages (NY, NJ, IL, MI, OH, CO, PA, VA, AZ, TN)
- 8 UK pages (matched-betting-uk, bonus-bets-uk, London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool)
- 5 blog posts + blog index
- 3 support pages (landing, privacy, terms)
- sitemap.xml: 131+ URLs

## Build
- App chunk: ~355KB raw / **98.41 kB gzip**
- Vendor chunk: 152KB raw / 49KB gzip (cached across deploys)
- Supabase chunk: 194KB raw / 51KB gzip
- Strategy: network-first JS/CSS, cache-first fonts/images
- SW version: promogrind-v3

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

## Blockers (external — parked)
1. **Affiliate links** — placeholder URLs in `src/books.js`, zero affiliate revenue
2. **ANTHROPIC_API_KEY** — parse-bet-slip deployed but inactive; set secret + deploy function
3. **Odds API** — key not set, Live Scanner non-functional for VaultSparked users
4. **Stripe** — needs LLC + EIN before live mode; Monthly $24.99 + Annual $199 products not yet created
5. **Resend** — weekly-digest function ready, key not set
6. **VAPID keys** — push notifications inactive; generate keys → deploy → run migration
7. **Plausible** — ✅ activated in `index.html` (session 12)

## What's working end-to-end
- Auth (Supabase email/password)
- Cloud sync (loadData / syncAppData — all fields synced via tracker JSONB)
- Vault points (award_vault_points RPC)
- Referrals (referrals table + get_my_referral_count RPC)
- Leaderboard (leaderboard SQL view)
- PromoBoard (community_board table)
- PWA install (manifest + service worker v3)
- GitHub Pages deploy (auto on push to main)
- 7-Day free trial (trial_started_at metadata, isPro() accepts trial status)
- Plausible analytics (activated)
- 45 static SEO pages live

## Chrome Extension (session 13)
- `extension/` — MV3, 5 files, matches 12 sportsbooks
- **Status:** ready to load unpacked (`chrome://extensions → Load unpacked → extension/`)
- Web Store submission parked — needs screenshots + listing copy

## AI Bet Slip Parser (session 13)
- `supabase/functions/parse-bet-slip/index.ts` — claude-haiku vision
- **Status:** code complete, not deployed — needs `ANTHROPIC_API_KEY` secret
- UI: 📷 Scan button in BonusBet calculator (already in App.jsx)

## Module utilities (as of v9.1)
- `f(n, dp=2)` — number formatter
- `toD(v)` — American/decimal/fractional odds → decimal
- `calcROI(profit, wagered)` — `profit/wagered*100`, null if wagered=0
- `downloadFile(content, filename, mimeType)` — anchor-click-revoke download helper
- `parseNL(text)` — natural language bet input parser (module scope)
- `parseBetSlip(text)` — bet slip text parser (module scope)
