# Current State

## Snapshot

- Date: 2026-03-26
- Overall status: v7.0 — audit complete, 14 items implemented (5 bug fixes + 9 new features), external revenue setup remains the primary blocker
- Current phase: Pre-launch — affiliate links, Odds API, Stripe are all that stand between this app and first revenue

## What exists

- **App:** React/Vite (~3,400+ lines) — 22 calculators, 4 track tools, live scanner, community promo board, leaderboard, knowledge base, daily dashboard, all session 6+7 features
- **Tab groups:**
  - Home: Dashboard (new default landing — today's promos, P/L, open bets, quick actions)
  - Convert: Bonus Bet, Profit Boost, First Bet, Deposit Match, Insurance
  - Calculate: No-Vig, 3-Way No-Vig, +EV, Kelly, 2-Way Arb, 3-Way Arb, Parlay Hedge, Middle, Odds Convert, Rollover, Teaser, Round Robin, Line Shop, Parlay Builder, SGP Estimator, Hold Calc, Bet Sizer, Income Estimator
  - Track: Sportsbooks, Bet Tracker, P/L Ledger, Leaderboard
  - Live: Arb Scanner (pro), +EV Scanner (pro)
  - Learn: Knowledge Base, Promo Finder, Promo Calendar, Promo Board, Glossary, Refer & Earn, Upgrade, Team Accounts, vs Competitors (new)

- **Session 7 features (all in App.jsx):**
  - Bug fix: Push notification body corrected (was referencing undefined fields)
  - Bug fix: LiveScanner gate price "$29/month" → "$24.99/mo"
  - Bug fix: Newsletter freq preference now persisted to Supabase
  - Bug fix: Team accounts email now saves to Supabase user metadata
  - Bug fix: startCheckout(planId) — plan parameter now wired through to Edge Function
  - Input-encoded shareable links — useCalcMemory reads URL params; Tl encodes inputs; BonusBet/ProfitBoost/FirstBet support encoded sharing
  - BookCTA — affiliate link CTAs at profitable calc results (BonusBet, ProfitBoost, FirstBet)
  - Promo grading — A/B/C grades on all 16 PromoCalendar entries with badge + filter
  - State personalization — state selector in onboarding, US_BOOK_STATES map, availability note in Tracker
  - Personal referral tracker — per-book ref code input in Tracker, links summary panel
  - Competitor comparison page — PromoGrind vs OddsJam vs ProfitDuel feature table in Learn
  - All-Time Report Card — in Ledger stats; shows best month, total profit, copy-to-clipboard card
  - Show Example buttons — BonusBet, ProfitBoost, FirstBet with pre-filled realistic scenarios
  - Daily Dashboard — new "Home" tab group, default landing page with full daily briefing

- **auth.js:** `startCheckout(planId='monthly')` — passes `planId` to `create-checkout` Edge Function body

## Important paths

- Entry: `src/main.jsx`
- Auth + subscription: `src/auth.js`
- Cloud sync + vault events: `src/sync.js`
- All UI: `src/App.jsx` (~3,400+ lines)
- Sportsbook data: `src/books.js` ← **edit affiliate links here**
- Env template: `.env.example`
- Admin CLI: `scripts/generate-invite-codes.js` ← needs `.env.admin`
- PWA service worker: `public/sw.js` (v2)
- Newsletter function: `supabase/functions/weekly-digest/index.ts`
- SQL migrations: `scripts/migration-*.sql`

## Blockers (all external)

1. **Affiliate links** — placeholder URLs in `src/books.js` — zero revenue until wired
2. **Odds API** — register at theoddsapi.com → `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`; change refresh 120s → 300s
3. **Stripe test mode** — create Monthly ($24.99/mo) AND Annual ($199/yr) products → set `STRIPE_*` secrets → deploy checkout + webhook; **update `create-checkout` to read `body.planId`**
4. **Stripe live mode** — blocked on LLC + EIN + bank account
5. **Resend newsletter** — resend.com → verify domain → `supabase secrets set RESEND_API_KEY=...` → deploy weekly-digest
6. **Plausible analytics** — create account → uncomment one line in `index.html`
7. **OAuth** — Google + Discord in Supabase dashboard → Authentication → Providers
8. **Google Search Console** — submit sitemap

## Next 3 moves

1. Wire affiliate links in `src/books.js` (instant revenue, zero risk)
2. Set up Odds API key + deploy odds Edge Function (unlocks the only paid feature)
3. Create Stripe test mode products → test full checkout flow end-to-end
