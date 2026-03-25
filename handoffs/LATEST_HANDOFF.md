# Latest Handoff — PromoGrind

Last updated: 2026-03-24

## What was completed this session

All 7 database-powered features are now implemented at the code level.

### Feature 1 — Password Reset (vault-member/index.html)
- "Forgot password?" link added to login form
- `panel-forgot`: email input → `supabase.auth.resetPasswordForEmail()` with `redirectTo` pointing back to vault-member page + `#reset`
- `panel-reset`: new password + confirm → `supabase.auth.updateUser({ password })`
- Init detects `#type=recovery` in URL hash → calls `setSession()` → shows reset panel
- `switchTab('forgot')` and `switchTab('reset')` supported (no tab button needed)

### Feature 2 — Cross-Device Sync (src/sync.js)
- `loadData()` / `saveData()` replace inline localStorage helpers in App.jsx
- Syncs `ledger` + `tracker` to `promogrind_data` table (timestamp conflict resolution)
- Local-first: synchronous localStorage read for instant render, async cloud sync in useEffect

### Feature 3 — Google/Discord OAuth (vault-member/index.html)
- Google + Discord buttons on both register and login panels
- `oauthSignIn(provider)` calls `supabase.auth.signInWithOAuth()` with redirect back to vault-member page
- Post-OAuth init: if session exists but no `vault_members` row → `panel-oauth-complete` shown
- OAuth complete-profile form: username + invite code + subscribe → `register_with_invite` RPC
- Username pre-filled from `user_metadata.full_name` if available

### Feature 4 — Vault Points + Achievements (src/sync.js)
- `fireVaultEvent()` calls `award_vault_points` RPC; dedupes within page session
- `onCalculation(slug)` — 5 pts first calc, 1 pt subsequent
- `onLedgerEntry()` — 2 pts per ledger save
- `onDailyLogin()` — 3 pts once per calendar day
- All wired in App.jsx: daily login on auth, calc events on tab navigation, ledger event on add

### Feature 5 — Paid Tier / Stripe (src/auth.js + Edge Functions)
- `isPro()`, `getSubscription()`, `startCheckout()` in auth.js
- `supabase/functions/create-checkout/index.ts` — creates Stripe Checkout session
- `supabase/functions/stripe-webhook/index.ts` — handles checkout.session.completed, subscription events
- App shows PRO badge in header when subscription is active

### Feature 6 — Live Odds Scanner (src/App.jsx)
- `LiveScanner` component: arb detection + +EV detection across all books
- Routes: `/arb-scanner`, `/ev-scanner` (LIVE tab group)
- Calls `supabase/functions/v1/odds` Edge Function (proxies The Odds API, Pro-gated server-side)
- Auto-refresh every 2 minutes
- Non-Pro users see upgrade screen with Stripe CTA

### Feature 7 — Real Game Stats (vault-member/index.html)
- `showDashboard` now calls `get_member_stats` RPC asynchronously
- Shows PromoGrind calc count + ledger entry count in Vault Stats panel
- Graceful fallback (shows "—") if RPC not yet deployed

## What to do next (all external — no code changes needed)

1. **Create Supabase project** at supabase.com
2. **Run SQL** in Supabase SQL Editor:
   - `VaultSparkStudios.github.io/supabase-schema.sql` (users, invite codes, vault_members)
   - `VaultSparkStudios.github.io/supabase-schema-v2.sql` (promogrind_data, vault_events, subscriptions)
3. **Fill credentials**:
   - `VaultSparkStudios.github.io/assets/supabase-client.js` (two placeholders at top)
   - `promogrind/.env` (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY)
4. **Deploy Edge Functions**:
   ```
   supabase functions deploy odds
   supabase functions deploy stripe-webhook
   supabase functions deploy create-checkout
   ```
5. **Set Edge Function secrets** in Supabase dashboard:
   - `ODDS_API_KEY` (from theoddsapi.com)
   - `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` (from Stripe)
   - `APP_URL` (e.g. `https://vaultsparkstudios.com/promogrind`)
6. **Configure OAuth** in Supabase dashboard → Authentication → Providers → Google + Discord
7. **Generate invite codes**: `node scripts/generate-invite-codes.js 10 "launch batch"`
8. **Set Stripe webhook** endpoint to: `https://<project>.supabase.co/functions/v1/stripe-webhook`

## Files changed this session

### promogrind/
- `src/App.jsx` — LiveScanner component, LIVE tab group, proStatus state, Pro badge, calc/ledger/daily events
- `src/sync.js` — cloud sync + vault events (new file)
- `src/auth.js` — added isPro(), getSubscription(), startCheckout()
- `context/CURRENT_STATE.md` — updated
- `context/TASK_BOARD.md` — updated
- `handoffs/LATEST_HANDOFF.md` — created

### VaultSparkStudios.github.io/
- `vault-member/index.html` — password reset (forgot + set-new panels), OAuth (Google + Discord buttons + complete-profile panel), stats from get_member_stats RPC
- `supabase-schema-v2.sql` — promogrind_data, vault_events, subscriptions tables + RPCs (new)
- `supabase/functions/odds/index.ts` — odds proxy Edge Function (new)
- `supabase/functions/stripe-webhook/index.ts` — Stripe webhook handler (new)
- `supabase/functions/create-checkout/index.ts` — Stripe Checkout creator (new)

## Important constraints

- Never commit real Supabase credentials — use `.env` (git-ignored)
- Service role key only in `promogrind/.env.admin` (git-ignored)
- `VSGate` origin validation must not be weakened (open redirect prevention)
- OAuth new users are directed to `panel-oauth-complete` — they still need an invite code
