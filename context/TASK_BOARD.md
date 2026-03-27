# Task Board

---

## 🔴 Human Action Required — Priority Queue

> All items require manual browser logins, credentials, purchases, or CLI commands. Park until you have 30–60 min for setup work. Sorted by impact-per-minute.

### P0 — Zero cost, unblocks features now (< 15 min each)
- [ ] **`supabase functions deploy calc-api`** — public calculator REST API; no secrets; 1 command
- [ ] **Run `scripts/migration-gift-tokens.sql`** in Supabase SQL Editor — creates gift_tokens + newsletter_subscribers tables; required before gift-trial function is usable
- [ ] **Submit sitemap to Google Search Console** — add property → verify → submit `https://vaultsparkstudios.com/promogrind/sitemap.xml` (149+ URLs); 5 minutes, zero cost

### P1 — API keys (Resend unlocks 4 functions at once)
- [ ] **Resend key** — resend.com → verify vaultsparkstudios.com → get key → `supabase secrets set RESEND_API_KEY=...` → then deploy:
  - `supabase functions deploy onboarding-drip` → schedule daily cron (Supabase dashboard → Schedules → every day 9am UTC)
  - `supabase functions deploy weekly-digest` → schedule weekly cron (Monday 9am UTC)
  - `supabase functions deploy gift-trial`
- [ ] **Anthropic key** → `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` → then deploy:
  - `supabase functions deploy ai-action-plan` — AI Action Plan tab goes live (VaultSparked-gated)
  - `supabase functions deploy parse-bet-slip` — 📷 Scan button in BonusBet goes live

### P2 — Affiliate programs (revenue blocker #1)
- [ ] Apply to DraftKings Partners (CPA: $75+/user): draftkings.com/partners
- [ ] Apply to FanDuel Partners (CPA: $25–35 or 35% RevShare): partners.fanduel.com
- [ ] Apply to BetMGM Partners (CPA: $50+/user): betmgmpartners.com
- [ ] Apply to remaining books: Caesars, bet365, ESPN BET, Fanatics, BetRivers — or via Income Access / Gambling.com Group network
- [ ] Once approved: replace placeholder `referralLink` URLs in `src/books.js`

### P3 — Stripe (blocked: needs LLC + EIN first)
- [ ] Form LLC → get EIN → open business bank account
- [ ] Create Monthly ($24.99/mo) + Annual ($199/yr) Stripe products → set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → deploy `create-checkout` + `stripe-webhook`

### P4 — Distribution & growth
- [ ] **Buy promogrind.com** (~$15/yr at Namecheap/Cloudflare) — CNAME file already in place; removes subdirectory SEO penalty immediately
- [ ] **Chrome Web Store** — screenshots (1280×800) + listing copy + $5 one-time dev fee at chrome.google.com/webstore/devconsole; privacy policy already live at `/promogrind/privacy/`
- [ ] **Google OAuth** — console.cloud.google.com → OAuth 2.0 Client ID → Supabase Auth Providers
- [ ] **Discord OAuth** — discord.com/developers → New App → Supabase Auth Providers

### P5 — Infrastructure (requires cost or special tooling)
- [ ] **Push notifications** — `npx web-push generate-vapid-keys` → `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...` → `supabase functions deploy send-daily-brief` → run `scripts/migration-push-subscriptions.sql` → add `VITE_VAPID_PUBLIC_KEY` to `.env`
- [ ] **Odds API** — theoddsapi.com → subscribe → `supabase secrets set ODDS_API_KEY=...` → deploy `odds` function; change LiveScanner refresh 120s → 300s
- [ ] **Discord bot** — Discord developer account → create bot → get token → `DISCORD_TOKEN` + `DISCORD_CHANNEL_ID` + `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` → `npm install` in `discord-bot/` → `node bot.js` or deploy to Railway
- [ ] **Mobile app (Capacitor)** — requires Mac for iOS signing; `npm run cap:sync` → iOS/Android builds + App Store/Play Store submissions

---

## 🚧 Manual / External — PARKED (requires credentials, accounts, or purchases)

> These require browser logins, third-party accounts, or credentials. Touch last. Flagged from session 13.

### Deploy gates (need secrets first)
- [ ] **parse-bet-slip Edge Function** — `supabase functions deploy parse-bet-slip` + `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` → AI Scan button in BonusBet goes live
- [ ] **Onboarding drip** — `supabase functions deploy onboarding-drip` then schedule as daily cron in Supabase dashboard (Cron → every day at 9am UTC). Needs `RESEND_API_KEY` set first.
- [ ] **Push notifications** — `npx web-push generate-vapid-keys` → `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...` → deploy `send-daily-brief` → run `scripts/migration-push-subscriptions.sql` → add `VITE_VAPID_PUBLIC_KEY` to `.env`
- [ ] **Odds API** — theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → deploy `odds` function; change refresh 120s → 300s in LiveScanner
- [ ] **Weekly digest** — `supabase functions deploy weekly-digest` + set `RESEND_API_KEY` + schedule weekly cron in Supabase dashboard (every Monday 9am UTC)
- [ ] **Discord bot** — `discord-bot/` directory contains bot code; needs: Discord developer account → create bot → get token → add to server → `npm install` in `discord-bot/` → set `DISCORD_TOKEN`, `DISCORD_CHANNEL_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` env vars → `node bot.js` or deploy to Railway/Heroku
- [ ] **Resend newsletter** — resend.com → verify vaultsparkstudios.com → `supabase secrets set RESEND_API_KEY=...` → deploy `weekly-digest`
- [ ] **Stripe** — create Monthly ($24.99/mo) + Annual ($199/yr) products → set `STRIPE_*` secrets → deploy `create-checkout` + `stripe-webhook`. **Blocked by LLC + EIN.**

### SQL (run in Supabase SQL Editor)
- [x] `scripts/migration-community-board.sql` ✓
- [x] `scripts/migration-leaderboard.sql` ✓
- [x] `scripts/migration-referrals.sql` ✓
- [ ] `scripts/migration-push-subscriptions.sql` — run when activating push notifications
- [x] `scripts/migration-team-accounts.sql` ✓
- [x] `scripts/migration-community-promos.sql` ✓
- [x] `scripts/migration-influencer-codes.sql` ✓
- [ ] `scripts/migration-gift-tokens.sql` — run before deploying gift-trial edge function

### Affiliate programs (revenue blocker #1)
- [ ] Apply to DraftKings Partners: draftkings.com/partners (CPA: $75+/user)
- [ ] Apply to FanDuel Partners: partners.fanduel.com (CPA: $25-35 or 35% RevShare)
- [ ] Apply to BetMGM Partners: betmgmpartners.com (CPA: $50+/user)
- [ ] Apply to remaining books (Caesars, bet365, ESPN BET, Fanatics, BetRivers)
- [ ] OR: apply via Income Access / Gambling.com Group (single network, multiple books)
- [ ] Once tracking URLs received: replace placeholder URLs in `src/books.js` `referralLink` fields

### Chrome Extension — Web Store submission
- [ ] Capture 1280x800 screenshots of extension popup + sidebar panel
- [ ] Write Chrome Web Store listing copy (description, categories)
- [ ] Submit at chrome.google.com/webstore/devconsole (one-time $5 dev fee)
- [ ] Add privacy policy URL (already live at `/promogrind/privacy/`)

### Domain migration — promogrind.com
- [ ] Purchase promogrind.com (GoDaddy / Namecheap / Cloudflare)
- [ ] Add CNAME DNS record: `promogrind.com` → `vaultsparkstudios.github.io`
- [ ] After DNS propagates: update all 45 SEO page `window.location.href` redirects from `vaultsparkstudios.com/promogrind/#/` → `promogrind.com/#/`
- [ ] Update all 45 SEO page `<link rel="canonical">` from `vaultsparkstudios.com/promogrind/...` → `promogrind.com/...`
- [ ] Update `sitemap.xml` base URL
- [ ] Update `context/PROJECT_STATUS.json` `public_url` field

### SEO & Growth (high-leverage, 5-15 min each)
- [ ] **promogrind.com domain** — $15/yr at Namecheap/Cloudflare. CNAME file ready. Removes subdirectory SEO penalty immediately.
- [ ] **Google Search Console** — add property → verify → submit `https://vaultsparkstudios.com/promogrind/sitemap.xml` (133+ URLs). 5 minutes.
- [ ] **Mobile App (Capacitor)** — `npm run cap:sync` then iOS/Android builds + App Store/Play Store submissions. Needs Mac for iOS signing.

### OAuth & Analytics
- [ ] **Google OAuth** — console.cloud.google.com → OAuth 2.0 Client ID → Supabase Auth Providers
- [ ] **Discord OAuth** — discord.com/developers → New App → Supabase Auth Providers

---

## 🎯 Now — Polish & tighten (current focus)

- [ ] UX audit pass — identify rough edges, inconsistent states, weak copy
- [ ] Mobile layout audit — check all tabs on narrow viewport
- [ ] Empty state quality check — every tab with no data should feel intentional
- [ ] Onboarding flow tightening — wizard copy, step clarity, first-run experience
- [ ] Landing page (`/landing/`) copywriting review — conversion-focused
- [ ] PricingPage final review — ensure trial CTA, testimonials, and value props are tight
- [ ] Error/edge state handling — expired session, failed sync, bad inputs

---

## [SIL] Items (from Self-Improvement Loop brainstorm)

- [ ] **[SIL] Wire affiliate links** — replace placeholder `referralLink` URLs in `src/books.js` with real affiliate-approved tracking links once approved; zero-code revenue unlocker
- [ ] **[SIL] Add Supabase per-tool usage event** — one row per calculation run to `vault_events` or new `calc_events` table; enables Engagement scoring in SIL
- [x] **[SIL] Spanish-language top 10 SEO pages** ✓ — shipped session 17
- [x] **[SIL] "Beat the House" drip** ✓ — extended onboarding-drip to 14 days (days 10 + 14 added), shipped session 17
- [ ] **[SIL] hreflang tags on English+ES page pairs** — add `<link rel="alternate" hreflang="es">` to 10 English pages and `hreflang="en"` to 10 ES pages; 15-min Google i18n signal
- [ ] **[SIL] Weekly Promo Report Card email** — Monday Resend email: user's P/L last 7 days + top book + one action item; highest-retention email type; needs RESEND_API_KEY first

---

## Next (code — after polish + external setup)

- [ ] Test VaultSparked upgrade flow end-to-end (monthly + annual checkout → webhook → subscription → badge)
- [ ] Test LiveScanner with real Odds API key
- [ ] Test weekly-digest Edge Function with real Resend key
- [x] **Social share cards from calculator results** — canvas/HTML share card after profitable calc result; one-tap to Twitter/X + Reddit (viral loop)
- [ ] **Annual profit summary PDF export** — styled print view pulling from Ledger; tax record + shareable milestone card
- [ ] **Promo Alert Discord Bot** — Discord server + bot posting top daily promos to a #opportunities channel
- [ ] **Taxes Calculator (in-app)** — reads from Ledger; calculates W-2G threshold exposure, quarterly estimated payments, net after-tax profit, best timing for loss deductions
- [ ] **Competitor SEO comparison pages (10)** — `promogrind-vs-profitduel`, `promogrind-vs-oddsjam`, `promogrind-vs-betterbet` etc. High-intent branded search traffic.
- [ ] **Behavioral upgrade triggers** — context-aware upsells: after 10 Arb Calc uses → "Live Scanner catches these in real time"; after 5 ledger entries → "never miss a promo again"
- [ ] **Real-time shared odds cache** — Supabase Realtime broadcast: 1 Odds API poll → broadcast to all active VaultSparked users. Required at 10+ concurrent users.
- [ ] Shared odds cache in Supabase (needed at 10+ concurrent VaultSparked users)
- [ ] Discord community + bot integration
- [ ] Firefox extension (port from Chrome MV3)
- [ ] More state SEO pages (20 more US states still unserved: IN, IA, WV, KS, MD, MA, LA, KY, NC, VT + 10 more)
- [ ] More UK city pages (Leeds, Bristol, Newcastle, Cardiff, Belfast)
- [ ] Crowdsourced promo API endpoint (public REST API for approved community promos)

## Blocked

- **Stripe live mode** — requires LLC + EIN + bank account

## Later

- Capacitor mobile build: `npm run cap:sync` (see PARKED — mobile app)
- Props scanner cost optimization
- **PromoGrind Influencer Affiliate Program** — tiered commission structure for content creators (YouTube/TikTok); vanity code dashboard already built (v14); add commission tracking + payout reporting

---

---

## Backlog — Session 16 Brainstorm (all 20 items, scored)

> Full innovation brainstorm from v16.0 audit session. Score = impact on overall project score (1–10).

| # | Item | Score | Status |
|---|------|-------|--------|
| 1 | Email capture interstitial on SEO pages (`pg-capture.js`) | 9 | ✅ Done |
| 2 | Gift 14 Days Free — referral gifting (`gift-trial` edge fn + `GiftTrialBox`) | 8 | ✅ Done |
| 3 | Live Activity Feed social proof on PricingPage | 7 | ✅ Done |
| 4 | AI Action Plan tab (`ai-action-plan` edge fn + `AIActionPlan` component) | 9 | ✅ Done |
| 5 | Starter Pack Modal — bankroll/goal presets on first launch | 7 | ✅ Done |
| 6 | Chrome Extension bet slip auto-fill (`detectBetSlip` + URL params) | 8 | ✅ Done |
| 7 | PromoGrind Verified badge program (`promogrind-verified/` landing page) | 6 | ✅ Done |
| 8 | Public Calculator REST API (`calc-api` edge function, 6 endpoints) | 7 | ✅ Done |
| 9 | EV Scanner teaser for free users (live count tease in LiveScanner gate) | 6 | ✅ Done |
| 10 | Account Health Alert Panel in Tracker (gubbed/limited/inactive book alerts) | 7 | ✅ Done |
| 11 | Promo expiry 24h alert digest (`promo-expiry-digest` edge fn) | 7 | 🔲 Deploy gated (needs RESEND_API_KEY) |
| 12 | Crowdsourced odds database (community-submitted sharp lines) | 5 | 🔲 Parked |
| 13 | "Bet of the Day" curator (manual weekly pick + email blast) | 5 | 🔲 Parked |
| 14 | Sportsbook API directory page (links to books' official APIs) | 4 | 🔲 Parked |
| 15 | Promo conversion rate benchmarks (anonymized aggregate stats) | 6 | 🔲 Parked |
| 16 | Automated promo calendar scraping (Playwright/cron) | 6 | 🔲 Parked (Playwright not viable in Deno) |
| 17 | App Store presence (Capacitor iOS/Android) | 8 | 🔲 MANUAL (needs Mac for iOS) |
| 18 | Discord community server (#opportunities bot) | 5 | 🔲 MANUAL (code exists in discord-bot/) |
| 19 | Affiliate link auto-rotation (A/B test CPA vs RevShare tracking links) | 6 | 🔲 Parked (needs affiliate programs first) |
| 20 | Pro referral double-credit (2x reward if referral upgrades within 7 days) | 6 | 🔲 Parked |

---

## Completed ✓

### Session 16 — v16.0 (audit + 10 features)

- [x] Full project audit (score: 75/100 — gaps: monetization, SEO authority, distribution)
- [x] Email capture interstitial — `public/js/pg-capture.js` injected on 5 SEO pages; captures to `newsletter_subscribers` Supabase table
- [x] Gift 14 Days Free — `GiftTrialBox` component + `supabase/functions/gift-trial/index.ts`; rate-limited (5/30d), awards sender 7 bonus days
- [x] Live Activity Feed — rotating anonymized social proof events on PricingPage
- [x] AI Action Plan — `AIActionPlan` component + `supabase/functions/ai-action-plan/index.ts`; Claude Haiku, tiered by bankroll; added as "Action Plan" tab in Live group
- [x] Starter Pack Modal — bankroll/goal presets shown on first launch before onboarding checklist
- [x] Chrome Extension bet slip auto-fill — `detectBetSlip()` polls DOM every 2s; appends `?sz=&bo=` to calculator URLs; `⚡ Auto-fill ready` indicator in panel
- [x] PromoGrind Verified badge — `public/promogrind-verified/index.html` + `badge.svg`; partner badge program landing page; added to sitemap
- [x] Public Calculator REST API — `supabase/functions/calc-api/index.ts`; 6 endpoints (bonus-bet, arb, ev, profit-boost, no-vig, kelly); no auth required
- [x] EV Scanner teaser — free users see live-counting opportunity tease above upgrade gate in LiveScanner
- [x] Account Health Alert Panel — gubbed/limited/inactive book detection in Tracker with colored alerts + advice
- [x] `scripts/migration-gift-tokens.sql` — gift_tokens table + redeem_gift_token RPC + newsletter_subscribers table
- [x] sitemap.xml — added promogrind-verified/
- [x] Build: ✓ clean (109.61 kB gzip)

### Session 15 — v15.0

- [x] Onboarding checklist on Dashboard (5-step: first calc, first book, first bet, start trial, invite friend)
- [x] Book signup progress tracker on Sportsbooks tab — unsigned books + estimated value + affiliate CTAs
- [x] Behavioral upgrade triggers — contextual upsells after arb/ledger/BonusBet usage thresholds
- [x] Plausible funnel events — trial_start, first_calc_run, upgrade_click, referral_shared, first_ledger_entry
- [x] Calculator share cards — profitable BonusBet/ProfitBoost/FirstBet results → copy/share card
- [x] Taxes Calculator — new Calculate tool, W-2G tracker, federal bracket estimate, PDF print export
- [x] UTM params on all SEO page redirects — Plausible now attributes organic traffic by source page
- [x] 3 competitor SEO pages: promogrind-vs-profitduel/, promogrind-vs-oddsjam/, promogrind-vs-betterbet/
- [x] Discord bot code: discord-bot/ (needs manual Discord setup to activate)

### Session 14 — Full audit + 5 features + infrastructure (v14.0)

- [x] Full project audit (74/100 honest score — revenue gap identified as #1 priority)
- [x] **"How Much Can I Make?" income estimator** — `public/income-estimator/index.html` with interactive state/bankroll/time inputs + real income estimates; added to sitemap
- [x] **Bet Slip → Auto-Track** — "➕ Add to Tracker" button after AI scan result in BonusBet; creates bet entry via `syncAppData`
- [x] **White-Label Embed Mode** — `?embed=1` URL param hides nav, shows only calculator + "Powered by PromoGrind" watermark; `public/embed/index.html` with copy-paste iframe codes
- [x] **Crowdsourced Promo Database** — new "Community Promos" Learn tab; browse/upvote community promos; VaultSparked users can submit; backed by `community_promos` Supabase table
- [x] **Team Accounts UI** — full create/invite/manage UI (replaces waitlist); backed by `team_accounts` + `team_members` tables
- [x] **Influencer Affiliate Dashboard** — "⚡ Creator Mode" in ReferralHub (VaultSparked-gated); custom vanity code, click/signup stats, estimated commission; backed by `influencer_codes` table
- [x] **SQL migrations** — `migration-team-accounts.sql`, `migration-community-promos.sql`, `migration-influencer-codes.sql` created (run in Supabase SQL Editor)
- [x] sitemap.xml — added `income-estimator/` + `embed/` entries (133+ URLs)
- [x] Task board + memory updated with all 20 brainstorm items
- [x] Build: ✓ clean

### Session 13 — 4 high-ceiling items + domain prep (v13.0)

- [x] Chrome Extension (MV3) — `extension/` directory: manifest, content.js, popup, background.js; floating ⚡ trigger + slide-out panel on 12 sportsbooks
- [x] AI bet slip parser — `supabase/functions/parse-bet-slip/index.ts` using Claude claude-haiku vision; 📷 Scan button in BonusBet auto-fills stake/odds/hedgeOdds
- [x] UK market module — `matched-betting-uk/` + `bonus-bets-uk/` + 6 city pages (London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool)
- [x] PromoCalendar market toggle — 🌎/🇺🇸/🇬🇧 filter; book select respects active market
- [x] Content blog — `public/blog/` index + 5 posts (matched betting, promos 2026, DK vs FD, taxes, arb)
- [x] CNAME file — `public/CNAME = promogrind.com` (passive, DNS not yet configured)
- [x] sitemap.xml — 131+ URLs (+8 UK + blog index + 5 posts)
- [x] Build: ✓ 98.41 kB gzip

### Session 12 — Full audit + implementation sprint (v12.0)

**App.jsx changes (~5,447 → ~5,780 lines):**
- Header + CompetitorComparison: 27 calculators stat corrected
- Loading splash screen (marketing cards replace spinner)
- Ledger EV% field: input + stats AVG EV% + CSV export column
- PROMO_SCHED: timeMin on all entries + 5 UK books added
- PromoCalendar: Time column
- SmartPromoRecommender → "Today's Action Plan": urgency badges, limitedBooks detection, openBets warning, time display
- PushEnableBtn component added to DailyDashboard (VaultSparked-gated)
- Testimonials section in PricingPage
- Footer legal links (Privacy / Terms / About)

**Supporting files:**
- `src/books.js`: referralLink on all 8 books
- `index.html`: Plausible analytics activated
- `public/privacy/index.html`, `public/terms/index.html`, `public/landing/index.html` — created
- `public/free-bet-calculator/`, `deposit-match-calculator/`, `rollover-calculator/`, `same-game-parlay/` — created
- 10 state SEO pages: NY, NJ, IL, MI, OH, CO, PA, VA, AZ, TN

**Build:** ✓ built in 3.30s — 97.02 kB gzip

### Session 11 — Audit #5 + 15 features + push system + 13 SEO pages (v11.0)
- 7-Day Free Trial system (auth.js + App.jsx)
- DashboardHero, Smart Promo Recommender, Profit Milestone Celebrations
- Promo Countdown Timers, Calculator Result History, Quick Add Bet from Dashboard
- Book Promo Badges, System Dark Mode Auto, Opportunity Log CSV Export
- Multi-Sport Scanner, Profit Goal Notifications, Share Card V2
- Push notification skeleton: sw.js handlers, send-daily-brief edge function, sw-register.js
- 8 more static SEO pages (13 total)

### Session 9 — Third audit + 20 features (v9.0)
- Promo Stacking Calculator, Copy My Setup, Daily Grind Routine Generator
- Profit Goal Milestone Tracker, Promo Trade Journal, Odds Comparison Table
- Calculator Sub-Categories, Push Notification Daily Briefing, Promo Value History
- Kelly Fractional Risk, Tax Bracket Timing, Bet Slip Text Parser
- Multi-Book Pending Exposure, CLV Leaderboard, New State Alert
- Promo Arb Finder, Leaderboard Privacy, Multi-Currency Mode
- Sportsbook Health Score, Calculator Usage Analytics

### Session 8 — Second audit + 20 features (v8.0)
- Tax Export CSV, Embed Mode, Deposit Optimizer, Hedge Validator
- Weekly P&L Share Card, Promo Complexity tags, Multi-Account Ledger
- Free Bet Arb Tracker, Calendar Export .ics, Promo Guarantee Calculator
- Book ROI%, Streak + Consistency, Promo Alert UI, Natural Language Input
- EV Opportunity Log, Welcome Promo Progress Bars, Gut Check validator
- Scanner Watchlist, Session Summary modal, Offline Mode indicator
- Critical sync.js fix (was dropping all non-ledger appData)

### Session 7 — Full audit + features (v7.0)
- Input-encoded shareable links, Affiliate deep-link CTAs
- Promo grading A/B/C, State-based personalization
- Personal book referral tracker, Competitor comparison page
- All-Time Report Card, Show Example buttons, Daily Dashboard (default landing)

### Simplify session — Code review + cleanup (v9.1)
- Fixed 4 React Rules of Hooks violations
- Added `downloadFile` + `calcROI` module utilities
- Moved `parseNL` to module scope
- Added `useMemo` to filtered (PromoCalendar) and myAvgClv (Leaderboard)
- Fixed health score hot path

### Sessions 1–6 — Foundation through engagement features
- Full app, auth, cloud sync, 27 calculators, all Track/Learn tabs, PWA, Supabase live
