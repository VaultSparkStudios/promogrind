# Current State

Last updated: 2026-04-23 (S74)

## Snapshot

- Date: 2026-04-23
- Overall status: deployed product with deeper launch-truth automation, cleaner CTA monetization logic, lighter app-shell seams, and only external release-proof blockers still open
- Current phase: launch-hardening with external blocker cleanup
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning, shared workflow suggestion builders, Pages push-alert env plumbing, a machine-readable launch proof surface, post-deploy launch-verification artifacts, normalized CTA link metadata, `AppChrome`/`appText` seams, and more repo-facing truth surfaces consolidated onto the shared context parser
- Test coverage: 375 tests passing
- Security: sanitization scan 0 critical / 0 warning (3 private ops files untracked + gitignored, absolute paths sanitized); pre-push hook fixed to skip deleted files (--diff-filter=ACMRT)
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: finishing monetization coverage for sportsbook CTAs with real approved affiliate/referral links
- Active work: continuing to decompose the remaining high-churn `src/App.jsx` seams from the new `src/app/AppChrome.jsx` and `src/app/appText.js` boundary

## Blockers

- Blocker: real approved affiliate/referral tracking URLs for `BetMGM`, `bet365`, and `BetRivers` are still absent from repo/local context
- Owner: operator / partner program inventory
- Unblock path: paste the real tracking URLs into `src/books.js`, update `context/LAUNCH_PROOFS.json`, deploy, then rerun `node scripts/verify-production-launch.mjs`
- Blocker: one real Stripe smoke purchase plus one friend-facing auth/calculator/pricing pass are still required before public launch
- Owner: operator / trusted tester
- Unblock path: complete the live billing and friend-beta checklist after this push/deploy cycle, then mark the matching proofs complete in `context/LAUNCH_PROOFS.json`

## Next 3 moves

1. Push this session to `main` so the Pages workflow can emit the new `launch-verification` artifact after deploy.
2. Finish CTA monetization truth by adding real `BetMGM`, `bet365`, and `BetRivers` tracking links.
3. Run the real Stripe smoke + friend-beta pass, then continue shrinking `src/App.jsx` from the new app-shell seam.
