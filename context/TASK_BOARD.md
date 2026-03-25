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
- [ ] Set up Resend newsletter: resend.com → verify vaultsparkstudios.com → `supabase secrets set RESEND_API_KEY=...` → deploy weekly-digest
- [ ] Enable Google OAuth: console.cloud.google.com → OAuth 2.0 Client ID → Supabase Auth Providers
- [ ] Enable Discord OAuth: discord.com/developers → New App → Supabase Auth Providers
- [ ] Submit sitemap to Google Search Console
- [ ] Uncomment Plausible script in `index.html` (after creating plausible.io account)

## Next (code — after external setup)

- [ ] Referral tracking: add `referrals` table to Supabase + RPC to count per user_id; wire into ReferralHub component (currently hardcoded 0)
- [ ] Test VaultSparked upgrade flow end-to-end (monthly + annual checkout → webhook → subscription → badge)
- [ ] Test LiveScanner with real Odds API key
- [ ] Test weekly-digest Edge Function with real Resend key
- [ ] Add shared odds cache in Supabase (serve all concurrent VaultSparked users from one cached API response — needed when 10+ paying users)
- [ ] Wire annual Stripe price ID into PricingPage → startCheckout()

## Blocked

- **Stripe live mode** — requires LLC + EIN + bank account

## Later

- Capacitor mobile build: `npm run cap:sync` (needs Xcode for iOS, Android Studio for Android)
- Team accounts backend: `team_members` table + shared data context (UI + waitlist already live)
- Plausible → deeper event tracking (which calculators are most used)
- Props scanner cost optimization (cache prop results, fetch less frequently)

## Completed ✓

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
