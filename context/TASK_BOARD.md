# Task Board

## Now (external — no code needed)

### Must run in Supabase SQL Editor first:
- [ ] Run `scripts/migration-community-board.sql` — PromoBoard table
  - ⚠️ Run migration-leaderboard.sql ONLY after confirming `vault_events` table exists with a `points` column
- [ ] Run `scripts/migration-leaderboard.sql` — Leaderboard view (depends on vault_events)

### Affiliate links (revenue blocker):
- [ ] Apply to DraftKings Partners: draftkings.com/partners (CPA: $75+/user)
- [ ] Apply to FanDuel Partners: partners.fanduel.com (CPA: $25-35 or 35% RevShare)
- [ ] Apply to BetMGM Partners: betmgmpartners.com (CPA: $50+/user)
- [ ] Apply to remaining books (Caesars, bet365, ESPN BET, Fanatics, BetRivers)
- [ ] OR: apply via Income Access / Gambling.com Group (single network, multiple books)
- [ ] Once tracking URLs received: wire into `src/books.js` (one field per book)

### External platforms:
- [ ] Set up Odds API: theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`
  - Also change `120_000` → `300_000` ms refresh in LiveScanner
- [ ] Set up Stripe test mode: create **two** products — Monthly ($24.99/mo) + Annual ($199/yr) → set `STRIPE_*` secrets → deploy checkout + webhook
  - Note: `startCheckout(planId)` now passes `planId` to Edge Function — update `create-checkout` Edge Function to receive `body.planId` and select the correct Stripe price ID
- [ ] Set up Resend newsletter: resend.com → verify vaultsparkstudios.com → `supabase secrets set RESEND_API_KEY=...` → deploy weekly-digest
- [ ] Enable Google OAuth: console.cloud.google.com → OAuth 2.0 Client ID → Supabase Auth Providers
- [ ] Enable Discord OAuth: discord.com/developers → New App → Supabase Auth Providers
- [ ] Submit sitemap to Google Search Console
- [ ] Uncomment Plausible script in `index.html` (after creating plausible.io account)

## Next (code — after external setup)

- [ ] Test VaultSparked upgrade flow end-to-end (monthly + annual checkout → webhook → subscription → badge)
- [ ] Test LiveScanner with real Odds API key
- [ ] Test weekly-digest Edge Function with real Resend key
- [ ] Add shared odds cache in Supabase (serve all concurrent VaultSparked users from one cached API response — needed when 10+ paying users)
- [ ] Wire annual Stripe price ID into create-checkout Edge Function (frontend already passes `planId`)
- [ ] SSG/pre-rendering: evaluate Vite SSG plugin or Astro migration for SEO on calculator + KB pages
- [ ] Browser extension: separate project — detects sportsbook pages, overlays relevant calculator
- [ ] Email drip sequence: onboarding automation via Resend (after newsletter deployed)
- [ ] Discord community + bot integration
- [ ] Claude API bet slip parser (paste bet slip → auto-fill calculator/tracker)
- [ ] Scheduled push notifications — skeleton ready at `supabase/functions/send-daily-brief/index.ts` + `scripts/migration-push-subscriptions.sql`. Needs: VAPID keys, web-push Deno module, service worker push event handler, Supabase cron schedule at 9am UTC.
- [ ] 7-day VaultSparked free trial (after Stripe live)
- [ ] UK market module (UK books + GBP support) — major TAM expansion
- [ ] Crowdsourced promo API endpoint (data moat play)

## Blocked

- **Stripe live mode** — requires LLC + EIN + bank account

## Later

- Capacitor mobile build: `npm run cap:sync` (needs Xcode for iOS, Android Studio for Android)
- Team accounts backend: `team_members` table + shared data context (UI + waitlist live, email now saves to Supabase)
- Plausible → deeper event tracking (which calculators are most used)
- Props scanner cost optimization (cache prop results, fetch less frequently)

## Completed ✓

### Simplify session — Code review + cleanup (v9.1)
- Fixed 4 React Rules of Hooks violations (useState inside render IIFEs): extracted `ShareWeekBtn`, `ReportCard`, `SessionModal`, `PromoAlertPrefs` as proper components
- Added `downloadFile` + `calcROI` module utilities; replaced 5 duplicate download patterns and 2 duplicate ROI calculations
- Moved `parseNL` to module scope (was redefined on every BonusBet render)
- Added `useMemo` to `filtered` (PromoCalendar) and `myAvgClv` (Leaderboard)
- Fixed health score hot path: hoisted `cutoff30` + `bets` array outside BOOKS.map() loop
- Removed all feature-tracking comments (10+ locations)
- Removed redundant `oppLog.slice(0,20)` on read

### Session 9 — Third audit + 20-feature brainstorm implementation (v9.0)

**Header stat fix:**
- `"22"` → `"26"` in Calculators stat (was stale since session 8 added 4 calculators)

**20 features built:**
- Copy My Setup Share Link (Dashboard), Promo Stacking Calculator (Calculate), Daily Grind Routine Generator (Dashboard), Profit Goal Milestone Tracker (Dashboard), Promo Trade Journal (Track), Odds Comparison Table (Track), Calculator Sub-Categories filter pills (Calculate group), Push Notification Daily Briefing (Dashboard, VaultSparked-gated), Promo Value History Tracker (PromoCalendar), Kelly Fractional Risk Optimizer slider (Kelly), Tax Bracket Timing Advisor (Ledger), Bet Slip Text Parser (BetTracker), Multi-Book Pending Exposure (Dashboard), CLV Leaderboard Column + My Stats (Leaderboard), New State Legalized Alert (Dashboard), Promo Arb Finder (Learn), Leaderboard Privacy Control opt-in (Leaderboard), Multi-Currency Mode USD/CAD/GBP (App header), Sportsbook Account Health Score (Tracker), Calculator Usage Analytics + Top Tools (Dashboard)

**New contexts:**
- `CurrencyCtx` — display-only FX multiplier (USD/CAD/GBP)

**Non-App.jsx fixes:**
- `public/sitemap.xml`: Added promo-stacking, trade-journal, odds-compare, team-accounts, promo-arb-finder (40+ → 47 URLs)
- `public/manifest.json`: Updated description (27+ calcs), added Promo Arb Finder shortcut
- `index.html`: Updated meta description + keywords, expanded JSON-LD featureList to 16 items

### Session 8 — Second audit + 20-feature brainstorm implementation (v8.0)

**Bug fixed:**
- PricingPage checkout: `handleUpgrade(plan.id)` passed string, `startCheckout(plan.id)` returned undefined. Fixed: pass full `plan` object.

**20 features built:**
- Tax Export CSV (Ledger), Embed Mode + iframe button (Tl), Deposit Optimizer (Calculate), Hedge Validator (Calculate), Weekly P&L Share Card (Ledger), Promo Complexity tags + filter (PromoCalendar), Multi-Account Ledger By-Book view, Free Bet Arb Tracker (Track), Calendar Export .ics (PromoCalendar), Promo Guarantee Calculator (Calculate), Book ROI% column (Tracker), Streak + Consistency score (Dashboard), Promo Alert Subscription UI (PromoCalendar), Natural Language Input parser (BonusBet), EV Opportunity Log (LiveScanner), Welcome Promo Progress Bars (Tracker), Gut Check validator (Calculate), Scanner Watchlist (LiveScanner), Session Summary modal (App header), Offline Mode indicator + sync queue (App)

**Non-App.jsx fixes:**
- `src/sync.js`: Critical fix — was silently dropping all appData except ledger. Now all fields synced via tracker JSONB.
- `public/sitemap.xml`: Rebuilt 14 → 40+ URLs
- `public/manifest.json`: PWA shortcuts added
- `index.html`: JSON-LD schema, Apple PWA metas
- `supabase/functions/weekly-digest/index.ts`: freq filtering, batching, improved email

### Session 7 — Full audit + implementation (v7.0)

**Bugs fixed:**
- Push notification body referenced wrong fields (`best.t1`/`best.t2` → `best.game`, `best.b1`/`best.b2`)
- LiveScanner upgrade gate showed "$29/month" → fixed to "$24.99/mo"
- `freq` newsletter preference now persisted to Supabase user metadata on subscribe
- Team accounts waitlist email now also saved to Supabase user metadata (was localStorage only)
- `startCheckout()` in auth.js now accepts and forwards `planId` parameter to Edge Function

**Features added:**
- Input-encoded shareable links: `useCalcMemory` reads URL params; `Tl` component encodes current inputs; BonusBet/ProfitBoost/FirstBet pass `getParams` to Tl
- Affiliate deep-link CTAs (`BookCTA` component) shown at profitable BonusBet/ProfitBoost/FirstBet results
- Promo grading (A/B/C) added to all 16 PromoCalendar entries with badge display + grade filter
- State-based personalization: state selector in OnboardingWizard (Step 3), `US_BOOK_STATES` map, availability note in Tracker
- Personal book referral tracker: per-book "Ref Code" input in Tracker table + referral links summary panel
- Competitor comparison page (`CompetitorComparison`) added to Learn tab — PromoGrind vs OddsJam vs ProfitDuel feature table
- All-Time Report Card in Ledger stats — total profit, best month, entries, avg per entry, copy-to-clipboard
- Show Example buttons on BonusBet, ProfitBoost, FirstBet with pre-filled realistic scenarios
- Daily Dashboard (`DailyDashboard`) — new "Home" tab group, default landing; today's promos, open bets, stats, quick actions
- `startCheckout` in auth.js now passes `planId` to `create-checkout` Edge Function

### Session 6 — Engagement + value features (13 features)
- AppDataCtx: shared data context, one Supabase call for all Track components
- Sync status indicator (SYNCING… / ✓ SAVED)
- Undo delete with 4s toast action in BetTracker + Ledger
- Auth optimistic render (instant load from cached token)
- Sub-tab scroll fade (mobile)
- SW cache fix: network-first for JS/CSS, promogrind-v2
- Vite vendor chunk split (React 49KB cached, app 104KB gzip)
- Odds validation: auto-detects odds labels, inline "Invalid odds" error
- Inline Ledger edit: ✎ per row, in-place inputs
- Portfolio EV dashboard in BetTracker stats
- Weekly performance card (📊 Share Week copy)
- Push notifications in LiveScanner (🔔 threshold alerts)
- Promo Calendar (16 recurring promos, 7 books, filterable)
- Conversion rate history in Ledger stats
- Book health tracker (Active/Limited/Gubbed/Pending/Closed)
- Promo star ratings (1-5 per book)
- Referral program UI (link copy + social templates)
- Annual plan pricing page ($24.99/mo vs $199/yr)
- CSV import modal (parse/preview/confirm DK/FanDuel format)
- Team accounts waitlist UI
- CLV alert toast on Ledger entry
- Daily digest frequency preference in EmailCapture

### Session 5 — Feature backlog
- useCalcMemory applied to all calculators
- Copy result as text button
- Log to Ledger shortcut
- Parlay leg EV breakdown
- Odds sweet spot guide on Bonus Bet
- BetTracker win rate stat
- Session P/L (Today) in Ledger
- Profit goal tracker
- Tab memory restore
- Keyboard quick-jump (?)
- Compact mode
- Swipe navigation
- Empty state illustrations
- Promo Finder wizard
- Promo expiry tracker
- Quick calc panel (mobile)
- Social share formatted results
- KB: book-specific guides, FAQ, video slots

### Session 4 — Major expansion (761 → 2,100+ lines)
- 22 calculators, BetTracker, Leaderboard, PromoBoard
- Scanner upgrades, toast system, useCalcMemory, onboarding wizard
- Tax estimator, CLV tracking, Ledger filters, SVG P/L chart
- Monthly breakdown, Vault Points, Glossary, KB expansion
- Dark/light mode, mobile nav, ErrorBoundary, PWA, Capacitor

### Session 3 — VaultSparked + deploy
- isPro() vault_sparked plan, Stripe checkout/webhook
- GitHub Pages live, Supabase live

### Sessions 1-2 — Foundation
- Full React/Vite app, auth gate, cloud sync, 17 calculators
