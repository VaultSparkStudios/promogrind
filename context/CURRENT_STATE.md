# Current State — PromoGrind

Last updated: 2026-07-23 (Session 116)

PromoGrind remains deployed/public-unlaunched in FORGE launch-hardening. S116 completed another saturated `/arc`: four verified audit items and two second-order compound refinements shipped after the project-scoped Unified Genius List regenerated to zero.

The startup SIL forecast now parses both legacy and current v3 ledgers, chooses sessions by true recency, refuses incomplete category sets, and renders a source-backed 1000/1000 instead of the false 0/1000. External launch truth is typed end to end: all six PROJECT_STATUS blockers map to canonical proof objects, and the ledger fails closed on any unmirrored blocker. Vite now emits a manifest and the launch gate budgets the transitive static graph plus largest async chunk instead of a tiny filename heuristic.

Promo Advisor now returns an inspectable counterfactual decision receipt—assumptions, missing inputs, sensitivity triggers, evidence grade, and contract version—from both rule and model paths. Receipts survive into saved workflows; a versioned cache key prevents stale payloads from bypassing the contract. Boot exceptions are buffered in memory until idle-loaded Sentry is ready instead of being silently dropped.

Repo-owned readiness is green: exact-lockfile `npm test` passes 72 files / 568 tests, Promo Advisor passes 10/10 Deno tests and Deno type-check, and `npm run verify:launch-local` passes end to end with direct exit 0. The manifest gate reports 179.1KB raw / 60.0KB gzip initial JavaScript and truthfully identifies Sentry as the largest async chunk at 482.1KB raw / 159.2KB gzip. S115 remains the latest claimed production deployment until the S116 commit reaches GitHub and its workflow evidence is observed.

Remaining evidence gates: deploy the S115 Supabase migration/functions once the mapped capability exists; production auth email; Stripe smoke purchase; friend beta pass; Brevo forwarding; production capture public-key proof.
