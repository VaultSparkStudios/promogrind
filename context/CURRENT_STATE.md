# Current State

## Snapshot

- Date: 2026-03-24
- Overall status: Feature-complete (v3.1) — all backend features live; Supabase project active; VaultSparked membership tier built end-to-end
- Current phase: Live (auth + sync working) — Stripe activation pending LLC formation

## What exists

- Systems: Full React/Vite app (v3.1) — 11 calculators, sportsbook tracker, P/L ledger, knowledge base, live odds scanner (VaultSparked-gated)
- Routing: URL-based routing via react-router-dom — each tool has its own shareable URL
- Auth gate: `src/auth.js` — checks Supabase session on load; redirects unauthenticated users to `vaultsparkstudios.com/vault-member/?next=<origin>`
- Cloud sync: `src/sync.js` — `loadData()`/`saveData()` replaces inline storage helpers; syncs to `promogrind_data` table; vault events via `award_vault_points` RPC
- Subscription: `isPro()`, `getSubscription()`, `startCheckout()` in `src/auth.js`
  - `isPro()` accepts both `pro` and `vault_sparked` plans
- Live scanner: `LiveScanner` component in App.jsx — arb detection + +EV detection; routes `arb-scanner` and `ev-scanner`; VaultSparked-gated
- Pro/VaultSparked badge: shown in header when subscription status is active
- Daily login event: fires once per calendar day (3 pts)
- Calc tracking: fires vault event on every calculator tab visit (5 pts first, 1 pt subsequent)
- Ledger tracking: fires vault event on every ledger entry (2 pts)
- Supabase project: `fjnpzjjyhnpmunfoycrp.supabase.co` — live, schema v1 + v2 both run
- `.env`: created with VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (live, do not overwrite)
- GitHub Pages deploy: live at vaultsparkstudios.com/promogrind/
- Invite codes: generated (launch batch active)

## Important paths

- Entry: `src/main.jsx`
- Auth + subscription: `src/auth.js`
- Cloud sync + vault events: `src/sync.js`
- All UI: `src/App.jsx`
- Sportsbook data: `src/books.js` ← **edit affiliate links here**
- Env template: `.env.example`
- Admin CLI: `scripts/generate-invite-codes.js` ← needs `.env.admin`

## Blockers (all external — no code changes needed)

1. **Stripe** — LLC must be formed first before live activation
   - Test mode: safe to set up now (`STRIPE_SECRET_KEY`, `STRIPE_VAULT_SPARKED_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` as Supabase secrets)
   - Live mode: requires LLC + EIN + bank account
2. **The Odds API** — register at theoddsapi.com; set `ODDS_API_KEY` as Supabase Edge Function secret
3. **Edge Functions** — deploy: `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook && supabase functions deploy odds`
4. **Affiliate links** — still placeholder in `src/books.js`
5. **OAuth providers** — Google + Discord in Supabase dashboard → Authentication → Providers

## Next 3 moves

1. (Test mode) Create Stripe test account → VaultSparked product ($24.99/month) → set secrets → deploy Edge Functions → test checkout
2. Wire real affiliate links in `src/books.js`
3. Enable OAuth providers (Google, Discord) in Supabase dashboard
