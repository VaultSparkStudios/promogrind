# Latest Handoff

Last updated: 2026-03-24 (session 3 closeout)

This is the authoritative active handoff file for the project.

---

## What was completed — session 3

### VaultSparked membership tier
- `src/auth.js`: `isPro()` now accepts both `vault_sparked` AND `pro` plan — no breaking change
- Studio repo `supabase/functions/create-checkout/index.ts`: supports `vault_sparked` plan via `PRICE_IDS` map + `SUCCESS_URLS` map
- Studio repo `supabase/functions/stripe-webhook/index.ts`: reads `plan` from `session.metadata.plan ?? sub.metadata.plan`, writes to subscriptions table
- VaultSparked animated badge + upgrade CTA panel built in `vault-member/index.html` (studio repo)
- VaultSparked naming scored 27/30 vs competing names — unique verb-as-identity, ties to top rank

### Supabase project — now live
- URL: `fjnpzjjyhnpmunfoycrp.supabase.co`
- Schema v1 + v2 both run ✅
- `game_sessions` RLS insert policy added ✅
- `invite_codes.notes` column added ✅
- Launch invite codes generated ✅
- `.env` in place with VITE_ prefixed vars ✅

### GitHub Pages deploy — now live
- vaultsparkstudios.com/promogrind/ is live ✅
- Fixed blank page: added `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` as GitHub Actions repo secrets
- Updated `.github/workflows/deploy-pages.yml` to pass secrets as env vars during build

### Auth flow — tested and working
- Register → confirm email → login → redirect to PromoGrind ✅
- Cross-domain session handoff working (localhost:5173 + localhost:5174 both added to VAULT_GATED_APPS)

---

## What was completed — session 2 (backend feature set)

- `src/auth.js` — Supabase auth gate, `isPro()`, `getSubscription()`, `startCheckout()`
- `src/sync.js` — cloud sync (promogrind_data table), vault events (award_vault_points RPC)
- `src/App.jsx` — LIVE tab group (arb-scanner, ev-scanner), proStatus state, daily login event, calc tracking, Pro badge in header
- `LiveScanner` component — arb detection, +EV detection, 2-min auto-refresh, VaultSparked gate with Stripe upgrade CTA
- `scripts/generate-invite-codes.js` — admin CLI
- `.env.example` — credential template
- Studio repo: `supabase-schema-v2.sql` — promogrind_data, vault_events, subscriptions, game_sessions tables + RPCs
- Studio repo: Edge Functions — `odds/`, `stripe-webhook/`, `create-checkout/`

---

## What is mid-flight / pending external

### Requires LLC formation first
- Stripe live account activation (business verification + EIN + bank account)
- Going live with real payments

### Can do now (test mode)
1. Create Stripe account + VaultSparked product ($24.99/month) in test mode
2. `supabase secrets set STRIPE_VAULT_SPARKED_PRICE_ID=price_... STRIPE_SECRET_KEY=sk_test_... STRIPE_WEBHOOK_SECRET=whsec_... APP_URL=https://vaultsparkstudios.com`
3. `supabase functions deploy create-checkout && supabase functions deploy stripe-webhook`
4. Test checkout with `4242 4242 4242 4242` — VaultSparked badge should appear in dashboard

### Other pending
- OAuth providers (Google, Discord) — Supabase dashboard → Authentication → Providers
- The Odds API key → `supabase secrets set ODDS_API_KEY=...` → `supabase functions deploy odds`
- Affiliate links in `src/books.js` — still placeholder
- VaultSparked small badge on leaderboard rows in call-of-doodie (studio-wide cosmetic)

---

## How the cross-domain auth works

1. User visits PromoGrind (vaultsparkstudios.com/promogrind/)
2. `checkAuth()` finds no session → redirects to `vaultsparkstudios.com/vault-member/?next=https://vaultsparkstudios.com/promogrind`
3. User logs in on vault-member page
4. vault-member detects `?next=` param → redirects to PromoGrind with `#access_token=...&refresh_token=...&type=vault_access` in URL hash
5. PromoGrind's `checkAuth()` detects tokens → calls `supabase.auth.setSession()` → clears hash → renders app
6. Subsequent visits: session is in localStorage, no redirect needed

---

## Key files

- `src/auth.js` — Supabase auth gate, isPro(), startCheckout()
- `src/sync.js` — cloud sync, vault events
- `src/App.jsx` — all UI, LIVE tab group, proStatus state
- `src/books.js` — sportsbook data + affiliate links (edit here)
- `.env` — Supabase credentials (live, gitignored)
- `.env.admin` — service role key (live, gitignored)
- `scripts/generate-invite-codes.js` — admin CLI

## Constraints

- Never commit `.env` or `.env.admin` — both gitignored
- `SUPABASE_SERVICE_ROLE_KEY` is for admin CLI only, never in browser code
- Calculator math in `src/math.js` must not be changed without verifying formulas
- All sportsbook links must live in `src/books.js` only
- Do not activate live Stripe until LLC + EIN obtained
- `isPro()` must continue to accept both `pro` and `vault_sparked` — legacy `pro` plan users must not be broken
