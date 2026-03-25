# Current State

## Snapshot

- Date: 2026-03-24
- Overall status: Feature-complete (v3.1) — all 7 database-powered features implemented; awaiting Supabase project creation + Stripe + Odds API setup
- Current phase: Backend activation — all code ready, credentials needed

## What exists

- Systems: Full React/Vite app (v3.1) — 11 calculators, sportsbook tracker, P/L ledger, knowledge base, live odds scanner (Pro)
- Routing: URL-based routing via react-router-dom — each tool has its own shareable URL
- Auth gate: `src/auth.js` — checks Supabase session on load; redirects unauthenticated users to `vaultsparkstudios.com/vault-member/?next=<origin>`
- Cloud sync: `src/sync.js` — `loadData()`/`saveData()` replaces inline storage helpers; syncs to `promogrind_data` table; vault events via `award_vault_points` RPC
- Subscription: `isPro()`, `getSubscription()`, `startCheckout()` in `src/auth.js`
- Live scanner: `LiveScanner` component in App.jsx — arb detection + +EV detection; routes `arb-scanner` and `ev-scanner`; Pro-gated with Stripe upgrade CTA
- Pro badge: shown in header when subscription status is active
- Daily login event: fires once per calendar day (3 pts)
- Calc tracking: fires vault event on every calculator tab visit (5 pts first, 1 pt subsequent)
- Ledger tracking: fires vault event on every ledger entry (2 pts)

- Important paths:
  - Entry: `src/main.jsx`
  - Auth + subscription: `src/auth.js`
  - Cloud sync + vault events: `src/sync.js`
  - All UI: `src/App.jsx`
  - Sportsbook data: `src/books.js` ← **edit affiliate links here**
  - Env template: `.env.example`
  - Admin CLI: `scripts/generate-invite-codes.js` ← needs `.env.admin`

## Blockers (all external — no code changes needed)

1. **Supabase project** — create at supabase.com; run `supabase-schema.sql` + `supabase-schema-v2.sql`; fill in `.env`
2. **Stripe** — create account + product + price; set `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` as Supabase Edge Function secrets
3. **The Odds API** — register at theoddsapi.com; set `ODDS_API_KEY` as Supabase Edge Function secret
4. **Edge Functions** — deploy: `supabase functions deploy odds`, `stripe-webhook`, `create-checkout`
5. **Affiliate links** — still placeholder in `src/books.js`
6. **GitHub Pages source** — set to "GitHub Actions" in repo Settings → Pages

## Next 3 moves

1. Create Supabase project → run both schema SQL files → fill in `.env`
2. Deploy Edge Functions + set secrets
3. Generate initial invite codes: `node scripts/generate-invite-codes.js 10 "launch batch"`
