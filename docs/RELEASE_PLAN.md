# Release Plan

## Current State

- Runtime: `https://promogrind.bet/`
- Repo status: build passing, `375/375` tests green, launch smoke passing, browser smoke passing
- Product posture: deployable and public-facing, but still blocked on final launch-proof tasks outside this repo

## Current Manual Blockers

- Shared edge deploy/auth compatibility is cleared in production as of 2026-04-22; `create-checkout` now returns `200` for a confirmed user and `customer-portal` returns the expected `404` for a fresh user with no billing record.
- Live PostgREST can now query `workflow_state`, `workflow_history`, `ledger_state`, `tracker_state`, `feature_flags`, and `push_subscriptions` in production after the reconciliation migration.
- `VITE_VAPID_PUBLIC_KEY` is now configured in local env, GitHub Actions secrets, and Supabase secrets, and the Pages workflow now also reads `VITE_PG_FEATURE_PUSH_ALERTS`; the remaining step is the normal repo deploy path so the live bundle includes the workflow/env update.
- Finish monetization coverage for `BetMGM`, `bet365`, and `BetRivers` with real approved tracking URLs. This is the only blocker still failing `scripts/verify-production-launch.mjs`.
- Run the real Stripe smoke path end-to-end with an actual completed purchase and verify `subscriptions` plus customer-portal lifecycle (see `docs/STRIPE_SMOKE_TEST.md`).
- Complete one friend-facing pass through auth, calculator, CTA, and pricing flows.

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
- Add observability dashboards for activation, monetization, and AI usage
- Harden auth/session handling and server-side AI response validation
