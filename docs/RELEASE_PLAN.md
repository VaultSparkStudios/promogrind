# Release Plan

## Current State

- Runtime: `https://promogrind.bet/`
- Repo status: full local launch gate passing (`npm run verify:launch-local` on 2026-05-01: `392/392` tests, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization). Vitest still reports worker-termination timeout warnings after the passing suite, so keep watching worker cleanup health.
- Product posture: deployable and public-facing, but still blocked on final launch-proof tasks outside this repo
- Canonical manual blocker surface: `context/LAUNCH_PROOFS.json`

## Current Manual Blockers

- Shared edge deploy/auth compatibility is cleared in production as of 2026-04-22; `create-checkout` now returns `200` for a confirmed user and `customer-portal` returns the expected `404` for a fresh user with no billing record.
- Live PostgREST can now query `workflow_state`, `workflow_history`, `ledger_state`, `tracker_state`, `feature_flags`, and `push_subscriptions` in production after the reconciliation migration.
- `VITE_VAPID_PUBLIC_KEY` is configured and the latest ingested deploy artifact confirms VAPID, Supabase table reachability, signup, confirmed billing user, checkout, and customer portal checks are passing.
- Deploy the S82 dashboard runtime fix before public announcement; `npm run smoke:production-dashboard` captured the current live bundle failing with `ReferenceError: syncDiagnostics is not defined`, and the source fix is implemented locally.
- Finish monetization coverage for `BetMGM`, `bet365`, and `BetRivers` with real approved tracking URLs. This is the only blocker still failing `scripts/verify-production-launch.mjs`.
- Run the real Stripe smoke path end-to-end with an actual completed purchase and verify `subscriptions` plus customer-portal lifecycle (see `docs/STRIPE_SMOKE_TEST.md`).
- Complete one friend-facing pass through auth, calculator, CTA, and pricing flows.
- Use `node scripts/update-launch-proof.mjs --list --guide` to print exact next steps and required evidence before marking any proof complete.

## Local Launch Gate

Run the complete local gate before any public announcement:

```bash
npm run verify:launch-local
```

This executes unit/component tests, production build, launch smoke, UX route integrity, browser smoke, bundle budget, and public-repo sanitization.

## Highest-Leverage Build Sequence

1. Workflow inbox
   Save AI, calculator, and Track outputs into one canonical queue with provenance and status transitions.
2. Personalized action ranking
   Rank workflows by bankroll fit, opportunity score, friction history, book coverage, and urgency.
3. Studio export layer
   Emit structured launch, growth, workflow, and intelligence summaries for Studio OS / Ops / Hub consumers.
4. Self-calibration loop
   Surface projected vs actual drift, calculator trust, and recurring skip/friction reasons.
5. Sync hardening
   Replace whole-blob sync with entity-aware persistence and an offline write queue.

## Follow-On Refinements

- Continue extracting domains out of `src/App.jsx`
- Add state-aware + book-aware CTA personalization
- Replace stale hardcoded promo intelligence in premium AI surfaces with a normalized promo registry
- Add production dashboard console smoke to the default post-deploy launch-verification workflow
- Stabilize full-suite Vitest worker/runtime behavior so `npm test` is a clean launch signal again
- Harden auth/session handling and server-side AI response validation
