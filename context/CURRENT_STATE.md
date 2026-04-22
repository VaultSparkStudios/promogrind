# Current State

Last updated: 2026-04-22

## Snapshot

- Date: 2026-04-22
- Overall status: deployed product with strong feature depth, green code health, and yellow Studio truth continuity
- Current phase: launch-hardening plus operator-surface refinement

## What exists

- Live product: `https://promogrind.bet` with calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, and launch/admin tooling
- Systems: Supabase-backed auth/data flows, Stripe billing paths, AI edge functions, push/onboarding/community surfaces, Studio export/contract generation, and broad automated test coverage
- Important paths: `src/App.jsx`, `src/components/`, `src/workflows/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: restoring repo-local truth after ops repair drift, then shifting into architecture/product work that unifies calculators, AI, scanner, and community outcomes into one operator loop
- Active work: reducing token waste by pushing more deterministic AI routing and shared budget/caching patterns

## Blockers

- Blocker: live Supabase migrations for workflow/entity sync and feature flags are not fully applied
- Owner: project repo plus production Supabase environment
- Unblock path: apply the queued SQL migrations, verify live tables/flags, then rerun smoke coverage

## Next 3 moves

1. Regenerate contracts, runtime pack, doctor state, genome snapshot, and startup brief from restored truth files.
2. Confirm the repaired surfaces agree on IGNIS, SIL, truth status, tests, lifecycle, and live URL.
3. Start extracting the `src/App.jsx` orchestration seams into a coherent product shell and action-graph core.
