# Current State

Last updated: 2026-03-26 (v15.0 — audit + onboarding checklist + book tracker + triggers + Plausible events + share cards + taxes calc + competitor pages + UTM + Discord bot)

## Version
v15.0 (app) / 3.0.0 (package.json — not critical)

## App.jsx
~6,279 lines. Single-file React SPA.

## Tabs / Tools
| Group | Count | Tools |
|---|---|---|
| Home | 1 | Dashboard |
| Convert | 5 | Bonus Bet, Profit Boost, First Bet, Deposit Match, Insurance |
| Calculate | 24 | No-Vig, 3-Way No-Vig, +EV, Kelly, 2-Way Arb, 3-Way Arb, Parlay Hedge, Middle, Odds Convert, Line Shop, Rollover, Teaser, Round Robin, Parlay Builder, SGP Estimator, Hold Calc, Bet Sizer, Income Est., Deposit Optimizer, Hedge Validator, Promo Guarantee, Gut Check, Promo Stacking, **Taxes Estimator** |
| Track | 7 | Sportsbooks, Bet Tracker, P/L Ledger, Leaderboard, Free Bet Arb, Trade Journal, Odds Compare |
| Live | 2 | Arb Scanner, +EV Scanner (VaultSparked-gated) |
| Learn | 11 | Knowledge Base, Promo Finder, Promo Calendar, Promo Board, Glossary, Refer & Earn, Upgrade, Team Accounts, vs Competitors, Promo Arb Finder, Community Promos |

**Total: 50 tools**

## Static SEO Pages: 50
- 17 keyword pages (bonus-bet, arb-calculator, kelly-criterion, no-vig, profit-boost, parlay-calculator, hedge-calculator, ev-calculator, matched-betting, promo-converter, sportsbook-promo, sports-betting-tools, arbitrage-betting, free-bet-calculator, deposit-match-calculator, rollover-calculator, same-game-parlay)
- 10 US state pages (NY, NJ, IL, MI, OH, CO, PA, VA, AZ, TN)
- 8 UK pages (matched-betting-uk, bonus-bets-uk, London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool)
- 3 competitor comparison pages (vs-profitduel, vs-oddsjam, vs-betterbet)
- 5 blog posts + blog index
- 2 tool pages (income-estimator, embed)
- 3 support pages (landing, privacy, terms)
- sitemap.xml: 138+ URLs — all 35 redirect pages have UTM params

## Build
- App chunk: ~390KB raw / **105.87 kB gzip**
- Vendor chunk: 152KB raw / 49KB gzip (cached across deploys)
- Supabase chunk: 194KB raw / 51KB gzip
- Strategy: network-first JS/CSS, cache-first fonts/images
- SW version: promogrind-v3

## v15.0 New Features
- **Onboarding Checklist** — 5-step card on Dashboard; auto-detects calc/book/bet/trial/invite completion; dismissible
- **Book Signup Progress Tracker** — Sportsbooks tab shows unsigned books + estimated promo value + Claim CTAs
- **Behavioral Upgrade Triggers** — arb calc (5+ uses) → Live Scanner upsell; ledger (3+ entries) → cloud sync upsell; both dismissible
- **Plausible Funnel Events** — `trial_start`, `upgrade_click`, `referral_shared`, `first_ledger_entry`, `first_calc_run`
- **Calculator Share Cards** — `ShareCard` component on profitable BonusBet/ProfitBoost results; copy text + native share / Twitter fallback
- **Taxes Estimator** — reads from Ledger auto; 2025 federal brackets + state rate; W-2G warning; quarterly payment schedule; print PDF
- **UTM attribution** — 35 SEO redirect pages updated with `?utm_source=seo&utm_medium=organic&utm_content={slug}`
- **3 competitor SEO pages** — vs ProfitDuel, vs OddsJam, vs BetterBet (high-intent comparison traffic)
- **Discord bot** — `discord-bot/` with `/promos`, `/calc` slash commands + daily 9am community promo digest

## v14.0 New Features
- **Community Promos tab** — browse/upvote/submit promos; backed by `community_promos` table (live ✓)
- **Team Accounts UI** — create/invite/manage teams; backed by `team_accounts` + `team_members` tables (live ✓)
- **Influencer Dashboard** — Creator Mode in ReferralHub; backed by `influencer_codes` table (live ✓)
- **Bet Slip → Auto-Track** — AI scan result → one-tap add to Bet Tracker
- **White-Label Embed Mode** — `?embed=1` strips nav, shows watermark
- **Income Estimator** — `public/income-estimator/` standalone promo income calculator
- **Embed docs page** — `public/embed/` with copy-paste iframe codes

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
| Onboarding steps | `localStorage('pg_onboarding_steps')` | No |
| Onboarding done | `localStorage('pg_onboarding_done')` | No |
| Trigger dismissed (arb) | `localStorage('pg_trigger_dismissed_arb_upsell')` | No |
| Trigger dismissed (ledger) | `localStorage('pg_trigger_dismissed_ledger_upsell')` | No |
| Bankroll (setup share) | `localStorage('pg_bankroll')` | No |
| Daily brief enabled | `localStorage('pg_daily_brief')` | No |
| Currency selection | `localStorage('pg_currency')` | No |
| Usage analytics | `localStorage('pg_usage_log')` | No |
| Session tracking | `sessionStorage('pg_session_start')` | No |

## Live Supabase Tables
| Table | Purpose | Status |
|---|---|---|
| `promogrind_data` | Cloud sync (ledger + tracker) | ✓ live |
| `vault_events` | Vault points | ✓ live |
| `leaderboard` | CLV leaderboard view | ✓ live |
| `community_board` | PromoBoard posts | ✓ live |
| `referrals` | Referral tracking | ✓ live |
| `community_promos` | Crowdsourced promo DB | ✓ live (v14) |
| `team_accounts` | Team tier | ✓ live (v14) |
| `team_members` | Team membership | ✓ live (v14) |
| `influencer_codes` | Creator vanity codes | ✓ live (v14) |

## Blockers (external — parked)
1. **Affiliate links** — placeholder URLs in `src/books.js`; zero affiliate revenue
2. **ANTHROPIC_API_KEY** — parse-bet-slip edge function ready, not deployed
3. **Odds API** — key not set; Live Scanner non-functional for VaultSparked users
4. **Stripe** — LLC + EIN needed; products not created; checkout + webhook ready
5. **Resend** — onboarding-drip + weekly-digest functions ready; key not set
6. **VAPID keys** — push notifications skeleton ready; not deployed
7. **Google Search Console** — sitemap (138+ URLs) not yet submitted
8. **promogrind.com** — CNAME file ready; domain not purchased
9. **Chrome Web Store** — extension ready; screenshots + $5 fee needed
10. **Discord bot** — code ready; needs Discord dev account + env vars

## What's working end-to-end
- Auth (Supabase email/password + 7-day trial)
- Cloud sync (loadData / syncAppData — all fields synced via tracker JSONB)
- Vault points (award_vault_points RPC)
- Referrals + Influencer codes (live tables)
- Leaderboard (leaderboard SQL view)
- PromoBoard (community_board table)
- Community Promos (community_promos table — browse/upvote/submit)
- Team Accounts (team_accounts + team_members tables — create/invite/manage)
- PWA install (manifest + service worker v3)
- GitHub Pages auto-deploy on push to main
- Plausible analytics + funnel events (trial_start, upgrade_click, etc.)
- 50 static SEO pages live with UTM attribution
- Competitor comparison pages (vs ProfitDuel, vs OddsJam, vs BetterBet)
- Income estimator standalone tool
- Embed mode documentation page
- Onboarding checklist (Dashboard)
- Book signup progress tracker (Sportsbooks)
- Behavioral upgrade triggers (Arb + Ledger)
- Calculator share cards (BonusBet, ProfitBoost)
- Taxes Estimator (Calculate tab)

## Module utilities (as of v9.1)
- `f(n, dp=2)` — number formatter
- `toD(v)` — American/decimal/fractional odds → decimal
- `calcROI(profit, wagered)` — `profit/wagered*100`, null if wagered=0
- `downloadFile(content, filename, mimeType)` — anchor-click-revoke download helper
- `parseNL(text)` — natural language bet input parser (module scope)
- `parseBetSlip(text)` — bet slip text parser (module scope)
- `shouldShowTrigger(key)` — checks localStorage dismissal for upgrade banners (v15)
- `dismissTrigger(key, setter)` — sets dismissal flag + hides banner (v15)
