# Current State

Last updated: 2026-03-27 (v22.0 — light mode toggle, math refactor, Profit Certificate, 71 tests, PT-BR completion)

## Version
v22.0 (app) / 3.0.0 (package.json — not critical)

## App.jsx
~7,165 lines. Single-file React SPA. Dark/light mode toggle (KD/KL palette swap via Object.assign). Math imported from shared.js (28 functions deduplicated).

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

## Static SEO Pages: 88
- 17 keyword pages (bonus-bet, arb-calculator, kelly-criterion, no-vig, profit-boost, parlay-calculator, hedge-calculator, ev-calculator, matched-betting, promo-converter, sportsbook-promo, sports-betting-tools, arbitrage-betting, free-bet-calculator, deposit-match-calculator, rollover-calculator, same-game-parlay)
- 10 US state pages (NY, NJ, IL, MI, OH, CO, PA, VA, AZ, TN)
- 8 UK pages (matched-betting-uk, bonus-bets-uk, London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool)
- 10 Spanish (ES) pages (bonus-bet-es, arb-calculator-es, no-vig-es, profit-boost-es, kelly-criterion-es, ev-calculator-es, parlay-calculator-es, hedge-calculator-es, matched-betting-es, sportsbook-promo-es)
- 6 Portuguese (PT-BR) pages: bonus-bet-pt, arb-calculator-pt, kelly-criterion-pt, ev-calculator-pt, parlay-calculator-pt, matched-betting-pt (Brazil market)
- 3 competitor comparison pages (vs-profitduel, vs-oddsjam, vs-betterbet)
- 5 blog posts + blog index
- 2 tool pages (income-estimator, embed)
- 3 support pages (landing, privacy, terms)
- 1 partner page (promogrind-verified)
- 1 PR/data report page (annual-report)
- 2 growth/distribution pages (the-grind newsletter, creator-program affiliate)
- sitemap.xml: 178+ URLs

## v22.0 New Features
- **Light mode toggle** — `darkMode` React state + localStorage(`pg_theme`) + `Object.assign(K, darkMode ? KD : KL)` + blocking script + body.light CSS + toggle button
- **Math refactor** — Removed 28 inline math functions from App.jsx; single import from `./lib/shared.js`; S extended with JSX meter locally
- **Profit Certificate** — New Track tool; shareable ledger-backed win card; period filter (week/month/year); copy + native share
- **UX polish** — Ctrl+K calc search, scroll-to-top on nav, input focus rings, text selection highlighting (all theme-aware)
- **Test suite expanded** — 32 → 71 tests (39 new); 13 previously untested functions now covered
- **PT-BR completion** — 3 new pages: ev-calculator-pt, parlay-calculator-pt, matched-betting-pt; sitemap 178+ URLs

## v20.0 New Features
- **Test suite** — `src/__tests__/math.test.js` (71 tests, all passing); `vitest.config.js`; vitest + @vitest/ui devDependencies in package.json; `npm test` runs all
- **`src/lib/shared.js`** — canonical pure-JS module: all calc math, K palette, S styles, converters; testable in Node; App.jsx now imports from shared.js (v22 refactor complete)
- **StackBuilder component** — VaultSparked-gated Live tab; bankroll + book multi-select; calls `stack-builder` edge fn; AI-generated 3-step promo plan with estimated total; added as 4th item in Live group
- **stack-builder edge fn** — `supabase/functions/stack-builder/index.ts`; POST `{bankroll, booksAvailable}` → Claude Haiku → 3-step plan; deploy + `ANTHROPIC_API_KEY` needed
- **ShareCard enhanced** — Reddit + X/Twitter buttons; improved share copy; Arb2Way gets share button
- **Dev auth bypass** — `VITE_DEV_BYPASS_AUTH=true` in `.env` skips VaultSparked redirect in local dev
- **PT-BR SEO pages** — bonus-bet-pt, arb-calculator-pt, kelly-criterion-pt; full Portuguese content; hreflang en/es/pt-BR; Brazil market expansion
- **Newsletter landing** — `public/the-grind/index.html`; email → newsletter_subscribers; $487/wk avg promo digest preview
- **Creator program landing** — `public/creator-program/index.html`; 30% rev share; earnings calculator; application form → newsletter_subscribers

## v19.0 New Features
- **PromoChat AI widget** — floating 💬 button (bottom-right); slide-out panel; Claude Haiku conversational AI; 10/day free (localStorage); unlimited VaultSparked; calculator suggestion chips; calls promo-chat edge fn
- **B2B Agency pricing tier** — 4th card in PricingPage ($199/mo, purple accent); 6 feature bullets; "Contact Sales" mailto CTA
- **create-checkout edge fn** — Stripe test/live dual mode; test mode default until LLC+EIN; plans: monthly ($24.99), annual ($199), agency ($199)
- **promo-chat edge fn** — Claude Haiku; 10/day free via vault_events; keyword-based calc suggestions; unlimited VaultSparked/trial
- **isAgency() + startCheckout() test mode** — auth.js additions for Agency tier + Stripe test mode alert
- **20 hreflang edits** — all 10 EN + 10 ES calculator pages updated with reciprocal hreflang alternate links
- **public/annual-report/index.html** — "State of Sports Betting Promos 2026" PR backlink magnet; Schema.org Report JSON-LD

## Build
- App chunk: ~434KB raw / **~116.60 kB gzip** (3.60s build)
- Vendor chunk: 152KB raw / 49KB gzip (cached across deploys)
- Supabase chunk: 194KB raw / 51KB gzip
- Strategy: network-first JS/CSS, cache-first fonts/images
- SW version: promogrind-v3

## v17.0 New Features
- **10 Spanish SEO pages** — `public/{slug}-es/index.html` for all top calculator keywords; US Hispanic market; full content + schema + FAQ + pg-capture.js email capture + UTM redirect
- **Onboarding drip extended to 14 days** — added day 10 (promo stacking) + day 14 (2-week check-in); full sequence: 1, 2, 3, 4, 5, 6, 7, 10, 14
- **Ledger by-book empty state** — upgraded from bare "No entries yet." to icon + heading + contextual hint
- **OnboardingChecklist invite auto-detect** — auto-marks invite step done when `pg_referral_shared` is set (wired to ReferralHub copy button)
- **Mobile nav content padding** — `pg-main-content` class + CSS `padding-bottom: 72px` prevents bottom nav from overlapping tab content on mobile

## v16.0 New Features
- **Email Capture Interstitial** — `public/js/pg-capture.js` injected on 5 SEO pages; 5s countdown + skip; saves to `newsletter_subscribers` Supabase table
- **Gift 14 Days Free** — `GiftTrialBox` in ReferralHub + `supabase/functions/gift-trial/index.ts`; rate-limited (5/30d), awards sender 7 bonus days, Resend email optional
- **Live Activity Feed** — rotating 10-event social proof ticker on PricingPage; rotates every 3.5s, seeded pseudo-randomly per 10-min window
- **AI Action Plan** — `AIActionPlan` component + `supabase/functions/ai-action-plan/index.ts`; Claude Haiku, tiered by bankroll, cached daily in localStorage; added as "Action Plan" tab in Live group
- **Starter Pack Modal** — 3 onboarding profiles (Casual $500/Hunter $2K/Grinder $5K) pre-fill bankroll + profit goal on first Dashboard visit
- **Chrome Extension Bet Slip Auto-Fill** — `detectBetSlip()` polls DOM every 2s; auto-fills `?sz=&bo=` on calculator opens; `⚡ Auto-fill ready` indicator
- **PromoGrind Verified Badge** — `public/promogrind-verified/index.html` + `badge.svg`; partner badge outreach landing page; added to sitemap
- **Public Calculator REST API** — `supabase/functions/calc-api/index.ts`; 6 endpoints (bonus-bet, arb, ev, profit-boost, no-vig, kelly); no auth required; attribution header
- **EV Scanner Teaser** — free users see live-counting opportunity numbers above upgrade gate in LiveScanner
- **Account Health Alert Panel** — gubbed/limited/inactive book detection in Tracker; colored alert rows with specific advice
- **SQL migrations** — `scripts/migration-gift-tokens.sql` (gift_tokens + redeem_gift_token RPC + newsletter_subscribers)

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
| `gift_tokens` | Gift trial tokens | ⏳ migration not yet run |
| `newsletter_subscribers` | Email capture | ⏳ migration not yet run |

## Blockers (external — parked)
1. **Affiliate links** — placeholder URLs in `src/books.js`; zero affiliate revenue
2. **ANTHROPIC_API_KEY** — parse-bet-slip + ai-action-plan edge functions ready, not deployed
3. **Odds API** — key not set; Live Scanner non-functional for VaultSparked users
4. **Stripe** — LLC + EIN needed; products not created; checkout + webhook ready
5. **Resend** — onboarding-drip + weekly-digest + gift-trial functions ready; key not set
6. **VAPID keys** — push notifications skeleton ready; not deployed
7. **Google Search Console** — sitemap (139+ URLs) not yet submitted
8. **promogrind.com** — CNAME file ready; domain not purchased
9. **Chrome Web Store** — extension ready; screenshots + $5 fee needed
10. **Discord bot** — code ready; needs Discord dev account + env vars
11. **migration-gift-tokens.sql** — must run in Supabase SQL Editor before gift-trial goes live
12. **calc-api** — deploy: `supabase functions deploy calc-api` (no secrets needed)

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
