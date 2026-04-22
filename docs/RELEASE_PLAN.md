# Release Plan

## Current State

- Runtime: `https://promogrind.bet/`
- Repo status: build passing, `372/372` tests green, launch smoke passing, browser smoke passing
- Product posture: deployable and public-facing, but still blocked on final launch-proof tasks outside this repo

## Current Manual Blockers

- Shared edge deploy/auth compatibility appears cleared in production; keep this out of the blocker list unless a fresh production regression proves otherwise.
- Set `VITE_VAPID_PUBLIC_KEY` in the live frontend before exposing browser push publicly
- Run the real Stripe smoke path end-to-end and verify `subscriptions` plus customer-portal lifecycle (see `docs/STRIPE_SMOKE_TEST.md`)
- Finish monetization coverage for `BetMGM`, `bet365`, and `BetRivers`
- Complete one friend-facing pass through auth, calculator, CTA, and pricing flows
- Apply Supabase SQL migrations: `migration-workflow-history.sql`, `migration-entity-sync.sql`, `migration-feature-flags.sql`, and confirm whether `migration-cron-jobs.sql` is still needed in production

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
