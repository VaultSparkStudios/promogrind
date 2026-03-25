# Current State

## Snapshot

- Date: 2026-03-25
- Overall status: Feature-complete (v6.0) — 22 calculators, full backend, PWA, 13 new engagement/value features, push notifications, CSV import, referral program, annual plan UI, team accounts waitlist
- Current phase: Pre-launch — external platform setup (affiliate links, Odds API, Stripe) is the remaining blocker

## What exists

- **App:** React/Vite (~2,950 lines) — 22 calculators, 4 track tools, live scanner, community promo board, leaderboard, knowledge base, 13 session-6 engagement features
- **Tabs:**
  - Convert: Bonus Bet, Profit Boost, First Bet, Deposit Match, Insurance
  - Calculate: No-Vig, 3-Way No-Vig, +EV, Kelly, 2-Way Arb, 3-Way Arb, Parlay Hedge, Middle, Odds Convert, Rollover, Teaser, Round Robin, Line Shop, Parlay Builder, SGP Estimator, Hold Calc, Bet Sizer, Income Estimator
  - Track: Sportsbooks, Bet Tracker, P/L Ledger, Leaderboard
  - Live: Arb Scanner (pro), +EV Scanner (pro)
  - Learn: Knowledge Base, Promo Finder, Promo Calendar, Promo Board, Glossary, Refer & Earn, Upgrade, Team Accounts
- **Session 6 features (all in App.jsx):**
  - AppDataCtx — shared data context, one `loadData()` call for all Track components
  - Sync status indicator — SYNCING… / ✓ SAVED in header
  - Undo delete — BetTracker + Ledger with 4s UNDO toast
  - Auth optimistic render — shows app immediately if cached token exists
  - Sub-tab scroll fade — right-edge gradient on mobile
  - SW cache fix — network-first for HTML/JS (promogrind-v2), deploys take effect immediately
  - Vite vendor chunk split — React cached separately, app chunk 104KB gzip
  - Odds validation — auto-detects odds fields by label, inline "Invalid odds" error
  - Inline Ledger edit — ✎ per row, in-place inputs, Save/Cancel
  - Portfolio EV dashboard — book-implied EV across all open BetTracker positions
  - Weekly performance card — copy formatted card to clipboard (📊 Share Week)
  - Push notifications (LiveScanner) — 🔔 ALERTS toggle, threshold input, browser Notification API
  - Promo Calendar — 16 recurring promos across 7 books, filterable
  - Conversion rate history — avg bonus bet conversion % in Ledger stats (3+ entries)
  - Book health tracker — Active/Limited/Gubbed/Pending/Closed status per book
  - Promo ratings — 1-5 star rating per sportsbook
  - Referral program UI — copy referral link, social post templates
  - Annual plan UI — Monthly ($24.99/mo) vs Annual ($199/yr) pricing page
  - CSV import — parse/preview/import from DraftKings/FanDuel CSV exports
  - Team accounts — waitlist UI with email capture
  - CLV alert — toast when closing line is beaten or moved against on Ledger entry
  - Daily digest preference — frequency selector (Daily/3×/Weekly) in EmailCapture
- **Routing:** URL-based routing — every tool has its own shareable URL + ⎘ SHARE button
- **Auth gate:** `src/auth.js` — Supabase session check on load; unauthenticated → `vault-member/?next=`
- **Cloud sync:** `src/sync.js` — `loadData()`/`saveData()` via `AppDataCtx` in App component (single load)
- **Subscription:** `isPro()` accepts `pro` and `vault_sparked` plans; VaultSparked gated tools use `proStatus.status === "active"`
- **Live scanner:** h2h + spreads + totals + optional player props; Kelly bet sizing per +EV result; scan history; push alert notifications
- **Vault points:** daily login (3 pts), calculator visit (5/1 pts), ledger entry (2 pts)
- **PWA:** `public/sw.js` (v2, network-first for JS/CSS) + `public/manifest.json` + `src/sw-register.js`
- **Supabase project:** `fjnpzjjyhnpmunfoycrp.supabase.co` — live, schema v1 + v2 run, invite codes active
- **GitHub Pages:** live at vaultsparkstudios.com/promogrind/
- **Capacitor:** `capacitor.config.ts` + `build:cap` script — ready for iOS/Android build when needed
- **Newsletter:** `supabase/functions/weekly-digest/` — Deno Edge Function using Resend, ready to deploy

## SQL migrations pending (run in Supabase SQL Editor)

- `scripts/migration-community-board.sql` — creates `promo_submissions` table for PromoBoard
- `scripts/migration-leaderboard.sql` — creates `vault_leaderboard` view for Leaderboard

## Important paths

- Entry: `src/main.jsx`
- Auth + subscription: `src/auth.js`
- Cloud sync + vault events: `src/sync.js`
- All UI: `src/App.jsx` (~2,950 lines)
- Sportsbook data: `src/books.js` ← **edit affiliate links here**
- Env template: `.env.example`
- Admin CLI: `scripts/generate-invite-codes.js` ← needs `.env.admin`
- PWA service worker: `public/sw.js` (v2)
- Newsletter function: `supabase/functions/weekly-digest/index.ts`
- SQL migrations: `scripts/migration-*.sql`

## Blockers (all external)

1. **Affiliate links** — placeholder URLs in `src/books.js` — zero revenue until wired
2. **Odds API** — register at theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`; change refresh 120s → 300s
3. **Stripe test mode** — create Monthly ($24.99/mo) AND Annual ($199/yr) products → set `STRIPE_*` secrets → deploy checkout + webhook
4. **Stripe live mode** — blocked on LLC + EIN + bank account
5. **Resend newsletter** — resend.com → verify domain → `supabase secrets set RESEND_API_KEY=...` → deploy weekly-digest
6. **Plausible analytics** — create account → uncomment one line in `index.html`
7. **OAuth** — Google + Discord in Supabase dashboard → Authentication → Providers
8. **Google Search Console** — submit sitemap
9. **Referral tracking** — referral count is hardcoded 0; needs a `referrals` table in Supabase + RPC to count

## Next 3 moves

1. Run both SQL migrations in Supabase SQL Editor
2. Wire affiliate links in `src/books.js`
3. Set up Odds API key + deploy odds Edge Function (unlocks the only paid feature)
