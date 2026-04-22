# Current State

Last updated: 2026-04-22

## Snapshot

- Date: 2026-04-22
- Overall status: deployed product with strong feature depth, green code health, and yellow Studio truth continuity, now with shared app-shell, workflow, and AI execution seams
- Current phase: launch-hardening plus operator-surface consolidation

## What exists

- Live product: `https://promogrind.bet` with calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, and launch/admin tooling
- Systems: Supabase-backed auth/data flows, Stripe billing paths, AI edge functions, push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, and broad automated test coverage
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/`, `src/workflows/`, `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: extending the newly shared shell/workflow/AI contract into the remaining scanner/community execution surfaces so all recommendations and persistence paths use one mutation model
- Active work: moving the remaining startup/doctor/closeout truth surfaces onto the shared parsing helper so the repo stops carrying yellow-genome drift from duplicated logic

## Blockers

- Blocker: live Supabase migrations for workflow/entity sync and feature flags are not fully applied
- Owner: project repo plus production Supabase environment
- Unblock path: apply the queued SQL migrations, verify live tables/flags, then rerun smoke coverage; launch proof still also needs real affiliate links, Stripe smoke, and production VAPID

## Next 3 moves

1. Extend the shared AI/workflow contract into the remaining scanner/community execution paths so every recommendation persists and routes through one governed mutation path.
2. Apply live Supabase workflow/entity sync and feature-flag migrations, then verify the unified workflow loop persists beyond local storage.
3. Finish launch proof with real affiliate links, Stripe smoke, production VAPID, and a friend beta pass now that the core local architecture tranche is in place.
