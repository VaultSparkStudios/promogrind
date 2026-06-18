<!-- manual-refresh: render-action-queue unavailable in Windows sandbox -->
<!-- generated-at: 2026-06-18 -->

# Action Queue

> Execution-first queue for this repo. Read this after the startup brief when you need the next concrete move.

## Execute Now (5)

- Provide Supabase CLI auth, run `npm run deploy:function:checkout`, and rerun/inspect Deploy Pages until the `scout_monthly` checkout gate clears.
- Inspect the GitHub Pages launch-verification artifact after the S95 security/tooling pushes; dashboard-smoke parsing is fixed, but checkout remains blocked until the function redeploy lands.
- Run production auth email smoke: confirmation delivery/resend, forgot-password email, recovery link, and new-password sign-in.
- Record one live Stripe smoke purchase with `npm run smoke:stripe -- --record`.
- Record one friend-facing auth/recovery/calculator/pricing pass with `npm run beta:check -- --record`.

## Approved Automation (0)

- No founder-approved automation items ready to run.

## Try Before Escalating (1)

- Attempt `npm run deploy:function:checkout` after `supabase login` or `SUPABASE_ACCESS_TOKEN`; current agent attempt failed only because Supabase access token was missing.

## Advisory Drift (2)

- Refresh stale revenue derived intelligence.
- Refresh stale IGNIS derived intelligence.
