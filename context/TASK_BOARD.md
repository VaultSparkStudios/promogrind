# Task Board

---

## 🚧 Manual / External — PARKED (requires credentials, accounts, or purchases)

> These require browser logins, third-party accounts, or credentials. Touch last. Flagged from session 13.

### Deploy gates (need secrets first)
- [ ] **parse-bet-slip Edge Function** — `supabase functions deploy parse-bet-slip` + `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` → AI Scan button in BonusBet goes live
- [ ] **Push notifications** — `npx web-push generate-vapid-keys` → `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...` → deploy `send-daily-brief` → run `scripts/migration-push-subscriptions.sql` → add `VITE_VAPID_PUBLIC_KEY` to `.env`
- [ ] **Odds API** — theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → deploy `odds` function; change refresh 120s → 300s in LiveScanner
- [ ] **Resend newsletter** — resend.com → verify vaultsparkstudios.com → `supabase secrets set RESEND_API_KEY=...` → deploy `weekly-digest`
- [ ] **Stripe** — create Monthly ($24.99/mo) + Annual ($199/yr) products → set `STRIPE_*` secrets → deploy `create-checkout` + `stripe-webhook`. **Blocked by LLC + EIN.**

### SQL (run in Supabase SQL Editor)
- [x] `scripts/migration-community-board.sql` ✓
- [x] `scripts/migration-leaderboard.sql` ✓
- [x] `scripts/migration-referrals.sql` ✓
- [ ] `scripts/migration-push-subscriptions.sql` — run when activating push notifications

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

### OAuth & Analytics
- [ ] **Google OAuth** — console.cloud.google.com → OAuth 2.0 Client ID → Supabase Auth Providers
- [ ] **Discord OAuth** — discord.com/developers → New App → Supabase Auth Providers
- [ ] **Google Search Console** — add property → verify ownership → submit sitemap: `https://vaultsparkstudios.com/promogrind/sitemap.xml` (131+ URLs)

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

## Next (code — after polish + external setup)

- [ ] Test VaultSparked upgrade flow end-to-end (monthly + annual checkout → webhook → subscription → badge)
- [ ] Test LiveScanner with real Odds API key
- [ ] Test weekly-digest Edge Function with real Resend key
- [ ] Shared odds cache in Supabase (needed at 10+ concurrent VaultSparked users)
- [ ] Email drip sequence — onboarding automation via Resend (after newsletter deployed)
- [ ] Discord community + bot integration
- [ ] Social share cards from calculator results (viral loop)
- [ ] Firefox extension (port from Chrome MV3)
- [ ] More state SEO pages (20 more US states still unserved)
- [ ] More UK city pages (Leeds, Bristol, Newcastle, Cardiff, Belfast)
- [ ] Crowdsourced promo API endpoint
- [ ] Taxes calculator tool (in-app, reads from Ledger)

## Blocked

- **Stripe live mode** — requires LLC + EIN + bank account

## Later

- Capacitor mobile build: `npm run cap:sync`
- Team accounts backend: `team_members` table
- Plausible → deeper event tracking
- Props scanner cost optimization

---

## Completed ✓

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
