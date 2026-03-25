# Latest Handoff

Last updated: 2026-03-24

This is the authoritative active handoff file for the project.

## What was completed this session

- **Vault Member auth gate** — PromoGrind is now restricted to Vault Members only
  - `src/auth.js` (new): Supabase client + `checkAuth()` + `signOut()` + cross-domain token handler
  - `src/App.jsx`: auth gate at component startup; shows loading screen until session confirmed; all hooks called before conditional return (React rules compliant)
  - `scripts/generate-invite-codes.js` (new): admin CLI — `node scripts/generate-invite-codes.js 5 "for friends"` — requires `.env.admin`
  - `.env.example` (new): credential template
  - `.env.admin` added to `.gitignore`
  - `@supabase/supabase-js` installed as npm dependency
  - `docs/RELEASE_PLAN.md` updated with Supabase setup steps in launch checklist
  - `context/DECISIONS.md` updated with auth architecture decision

- **Studio site (VaultSparkStudios.github.io) changes** — see that repo's LATEST_HANDOFF.md
  - `assets/supabase-client.js` (new): shared Supabase client + `VSGate` redirect helper + `VAULT_GATED_APPS` registry
  - `vault-member/index.html`: localStorage auth replaced with Supabase; invite code field added to register form; cross-domain redirect handling added
  - `supabase-schema.sql` (new): run once in Supabase SQL Editor

## What is mid-flight

- Nothing — all code is written; awaiting Supabase project creation by Studio owner

## What to do next

1. **Create Supabase project** at supabase.com (free tier)
2. **Run the schema** — SQL Editor → paste contents of `VaultSparkStudios.github.io/supabase-schema.sql` → Run
3. **Fill in credentials** — find in Supabase: Settings → API
   - `VaultSparkStudios.github.io/assets/supabase-client.js` — replace `YOUR_SUPABASE_URL` and `YOUR_SUPABASE_ANON_KEY`
   - `promogrind/.env` (copy from `.env.example`) — same two values as `VITE_` prefixed vars
4. **Create `.env.admin`** in PromoGrind root with `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (service role key is in Supabase Settings → API — never expose in browser)
5. **Generate invite codes**: `node scripts/generate-invite-codes.js 10 "launch batch"`
6. **Test the full flow**: go to deployed PromoGrind → redirects to vault-member → register with invite code → confirm email → sign in → redirected back to PromoGrind

## How the cross-domain auth works

1. User visits PromoGrind (promogrind.com)
2. `checkAuth()` finds no session → redirects to `vaultsparkstudios.com/vault-member/?next=https://promogrind.com`
3. User logs in on vault-member page
4. vault-member detects `?next=` param → redirects to `https://promogrind.com/#access_token=...&refresh_token=...&type=vault_access`
5. PromoGrind's `checkAuth()` detects tokens in URL hash → calls `supabase.auth.setSession()` → clears hash → renders app
6. Subsequent visits: session is in localStorage, no redirect needed

## How to add a new gated tool

1. Add entry to `VAULT_GATED_APPS` in `VaultSparkStudios.github.io/assets/supabase-client.js`
2. Copy `promogrind/src/auth.js` into the new tool's `src/`
3. Add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` to the new tool's `.env`
4. Call `checkAuth()` at app startup

## Constraints

- All sportsbook links must live in `src/books.js` only — never hardcoded in App.jsx
- Calculator math in `src/math.js` must not be changed without verifying formulas
- Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code — admin CLI only
- `SUPABASE_ANON_KEY` is safe to expose in browser (it's a read-only public key)
- The `register_with_invite` Postgres RPC handles invite code validation + vault_members insert atomically — do not replicate this logic client-side

## Files to update next session if work continues

- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `context/LATEST_HANDOFF.md`
