# Work Log

## 2026-04-15 — S50 Entity Sync + Full Closeout

- Extended `src/sync.js` beyond the earlier queue/entity-stamp layer so it now appends canonical workflow-history events and hydrates/persists `workflow_state`, `workflow_history`, `ledger_state`, and `tracker_state` alongside the legacy `promogrind_data` compatibility row.
- Added `scripts/migration-workflow-history.sql` and `scripts/migration-entity-sync.sql` so Supabase can own workflow history plus separate ledger/tracker entity state with RLS.
- Expanded `src/__tests__/sync.test.js` to cover workflow-history appends, dedicated workflow table hydration, and dedicated ledger/tracker table hydration/writes.
- Refreshed `CURRENT_STATE`, `TASK_BOARD`, `PROJECT_STATUS`, `LATEST_HANDOFF`, `SELF_IMPROVEMENT_LOOP`, `TRUTH_AUDIT`, `STATE_VECTOR`, `GENOME_HISTORY`, `STARTUP_BRIEF`, and audit JSON for a truthful final Session 50 closeout.
- Verified `npm test` → 168/168 passing.
- Verified `npm run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`413.9KB` main chunk under 420KB target).

## 2026-04-15 — S50 Workflow Intelligence + Sync Hardening

- Extended `src/promograph/index.js` so canonical workflow entries can carry title/summary/confidence/opportunity metadata and support inbox upserts.
- Added `src/workflows/inbox.js` plus `src/components/dashboard/WorkflowInboxPanel.jsx`; calculators, Promo Advisor, and AI Action Plan can now save canonical workflow entries into one scored inbox surfaced on the Today dashboard.
- Added `src/studio/export.js` and wired `src/components/dashboard/LaunchCommandCenterPanel.jsx` to copy a structured Studio snapshot covering launch, growth, workflows, and intelligence signals.
- Upgraded `supabase/functions/ai-action-plan/index.ts` and `src/components/AIActionPlan.jsx` so AI actions return/store a richer machine-usable workflow contract instead of only lightweight display text.
- Expanded `src/track/insights.js` and `src/components/TrackInsights.jsx` with workflow provenance, recent workflow timeline, and self-calibration / expected-vs-actual drift surfaces.
- Deepened dashboard ranking in `src/dashboard/today.js` and `src/App.jsx` so next-best-action can prioritize the highest-scored workflow, not only raw workflow counts.
- Hardened `src/sync.js` with per-entity timestamps, entity-aware merge behavior, and an offline `pg_sync_queue` for failed writes; expanded `src/__tests__/sync.test.js` accordingly.
- Fixed remaining active truth drift in `src/launchState.js`, `supabase/functions/gift-trial/index.ts`, `supabase/functions/promo-expiry-digest/index.ts`, and `docs/RELEASE_PLAN.md`.
- Refreshed public memory/context/task files for S50 closeout and prepared the repo for commit + push.
- Verified `npm test` → 164/164 passing.
- Verified `npm run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`410.2KB` main chunk under 420KB target).

## 2026-04-15 — S49 PromoGraph Foundation + Full Closeout

- Added `src/promograph/index.js` as the shared domain layer for canonical promo-type aliases, workflow-status normalization, calculator slug cleanup, recommendation normalization, and workflow summarization.
- Rebased `src/track/insights.js` on the shared PromoGraph workflow model while preserving the existing `formatPromoTypeLabel` export contract for callers/tests.
- Updated `src/dashboard/today.js` so dashboard snapshots include open/waiting workflow counts from `resultFeedback`, and next-best-action can prioritize advancing queued workflows before adding more action.
- Updated `src/components/ResultFeedbackCard.jsx` and `src/components/PromoAdvisorPanel.jsx` to emit canonical promo/recommendation values instead of forwarding raw per-surface variants.
- Added `src/__tests__/promograph.test.js` and expanded `src/__tests__/dashboard.test.js` to cover the shared domain rules and workflow-aware ranking behavior.
- Added `prompts/initiate.md` so `prompts/start.md` no longer references a missing bootstrap/foundation prompt.
- Added and refreshed `docs/STARTUP_BRIEF.md` so the repo has a cached canonical startup brief from current public-safe context.
- Verified targeted PromoGraph tests after the refactor, then reran the full suite successfully.
- Verified `npm.cmd test` → 158/158 passing.
- Verified `npm.cmd run build` → passing.
- Verified `npm.cmd run smoke:launch` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`401.4KB` main chunk under 420KB target).

## 2026-04-15 — S48 Launch Unblock + Full Closeout

- Added `supabase/config.toml` so browser-invoked Edge Functions deploy with `verify_jwt = false` and remain compatible with the project's `sb_publishable_...` auth flow.
- Redeployed `create-checkout`, `customer-portal`, `redeem-beta-code`, `gift-trial`, `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder`, `parse-bet-slip`, and `stripe-webhook` to production.
- Redeployed `supabase/functions/send-daily-brief/index.ts` so the push-notification backend now matches the repo state.
- Verified live Supabase schema prerequisites: both `push_subscriptions` and `subscriptions` exist in production.
- Verified live Stripe preflight: `create-checkout` returns a hosted `checkout.stripe.com` URL and `customer-portal` returns the expected `404` for users without a billing record yet.
- Updated `src/books.js` with real personal referral links for ESPN BET / TheScore BET and Fanatics Sportsbook.
- Removed fake/generic referral placeholders for BetMGM, bet365, and BetRivers so those books now truthfully fall back to signup/homepage links until real monetization paths exist.
- Refreshed launch-state, Stripe smoke documentation, and public memory/context files to S48 closeout state.
- Ran studio-ops closeout tooling: IGNIS rescore, doctor, state-vector, entropy, genome snapshot, and genome-history refresh.
- Verified `npm.cmd test` → 153/153 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`401.4KB` main chunk under 420KB target).
- Verified `npm.cmd run smoke:launch` → passing.

## 2026-04-15 — S46 Launch-Readiness Closeout

- Extracted Home launch surfaces into `src/routes/HomeRoutes.jsx` and added shared onboarding state in `src/onboarding.js` so `App.jsx` no longer owns those pages directly.
- Added a visible onboarding progress card to `src/components/dashboard/TodayDashboardPanel.jsx` and a matching progress strip inside the Home `Get Started` route.
- Upgraded `src/components/dashboard/DailyBriefPage.jsx` from localStorage-only notification intent to real browser push-subscription attempts through `src/sw-register.js`.
- Added `enableDailyBriefPush()`, `disableDailyBriefPush()`, and `isDailyBriefEnabled()` in `src/sw-register.js`; persisted subscriptions to the `push_subscriptions` table when auth + VAPID config are present.
- Updated `supabase/functions/send-daily-brief/index.ts` to point at the live `promogrind.bet/#/daily-brief` target instead of the deprecated Vault route.
- Refined monetization truthfulness in `src/books.js`, `src/dashboard/today.js`, and `src/launchState.js` so referral links count as monetized inventory and launch blockers match current reality.
- Added `src/__tests__/onboarding.test.js` and expanded `src/__tests__/books.test.js`; validation now sits at 153/153 passing.
- Refreshed public memory/context files to S46 closeout state in preparation for commit + push.
- Verified `npm.cmd test` → 153/153 passing.
- Verified `npm.cmd run build` → passing.
- Verified `npm.cmd run check:bundle` → passing (`415.4KB` main chunk under 420KB target).
- Verified `npm.cmd run smoke:launch` → passing.
- Verified `npm.cmd run smoke:browser` → passing.

## 2026-04-15 — S45 Refinement Recovery + Closeout

- Recovered an interrupted S45 refinement tranche and stabilized the repo back to a clean closeout state.
- Added `src/intake/parse.js`, `src/components/PromoIntakePanel.jsx`, and `src/routes/PromoIntakeRoute.jsx` to turn pasted promo text into deterministic promo-card parsing plus calculator recommendation.
- Added `src/lib/shadow.js` and `src/components/ShadowBookPanel.jsx` to quantify first-month value from un-owned books.
- Added `src/components/CalculatorTrustBadge.jsx`, sensitivity helpers in `src/lib/shared.js`, and `src/components/SensitivityChip.jsx` to surface trust and odds-drift confidence on key calculator results.
- Added `src/ui.jsx` state primitives (`LoadingState`, `EmptyState`, `ErrorState`), upgraded several loading surfaces, and improved auth dialog semantics / keyboard support.
- Added `public/_headers`, `scripts/optimize-images.mjs`, `scripts/check-bundle-budget.mjs`, and generated `public/og-image.avif` + `public/og-image.webp`.
- Added durable `vault_events`-backed rate limiting in `supabase/functions/_shared/http.ts` and wired it into `promo-chat`, `promo-advisor`, `ai-action-plan`, and `stack-builder`.
- Added keyboard navigation + ARIA tab semantics to the primary and secondary tab bars in `src/App.jsx`.
- Refreshed public memory/context files to S45 closeout state and wrote a new audit JSON.
- Verified `npm.cmd test` → 150/150 passing.
- Verified `npm.cmd run build` → passing.
- Verified `npm.cmd run check:bundle` → passing (`~413KB` main chunk).
- Verified `npm.cmd run smoke:launch` → passing.
- Verified `npm.cmd run smoke:browser` → passing in elevated execution.

## 2026-04-14 — S44 Track Analytics + Launch Closeout

- Added `src/track/insights.js` to normalize result-feedback entries and aggregate realized P/L, hit rate by promo type, calculator accuracy, and best-book performance.
- Added `src/components/TrackInsights.jsx` and wired a new `Track -> Edge` tab into `src/App.jsx`.
- Added `src/components/ResultFeedbackCard.jsx` and wired post-result capture into Bonus Bet, Profit Boost, and First Bet Safety Net flows.
- Expanded `scripts/validate-browser-launch-smoke.mjs` so it checks launch routes plus built-client markers for auth, pricing, CTA, billing, and mobile hooks.
- Configured personal referral URLs in `src/books.js` for DraftKings, FanDuel, and Caesars.
- Refreshed public memory files and validation metadata to S44 state.
- Verified `npm.cmd test` → 134/134 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts\\validate-browser-launch-smoke.mjs` → passing.

## 2026-04-14 — Post-S43 Project-Local Auth Rollout

- Added `src/components/AuthDialog.jsx` so PromoGrind owns sign-in/sign-up inside the app.
- Updated `src/auth.js` to support direct PromoGrind sign-up/sign-in against the shared Supabase auth project and to persist shared display name / username metadata.
- Rewired active React auth CTAs away from the Vault member URL and onto PromoGrind-local auth query links.
- Added `src/__tests__/launchState.test.js` for auth URL helper coverage.
- Verified `npm.cmd test`, `npm.cmd run build`, and `npm.cmd run smoke:launch` all pass after the auth UX change.

## 2026-04-14 — S43 Dashboard Extraction + Closeout

- Extracted dashboard derivation logic into `src/dashboard/today.js`.
- Added `src/components/dashboard/TodayDashboardPanel.jsx` and moved `DailyBriefPage` into `src/components/dashboard/DailyBriefPage.jsx`.
- Updated `src/App.jsx` to consume the extracted dashboard model/components and keep next-best-action logic shared.
- Added `src/__tests__/dashboard.test.js`; suite now at 133/133 passing.
- Synced PromoGrind-native account wording across launch smoke-covered public pages and trust-strip template.
- Updated launch smoke validators to current copy expectations; `npm.cmd run smoke:launch` now passes.
- Attempted browser smoke; script is updated but local execution still fails on preview subprocess `spawn EPERM`.
- Attempted Supabase function deploy; blocked because local Supabase auth/access token is not configured.

## 2026-04-14 — S42 Audit Follow-Through

- Added public-safe execution roadmap in `docs/REFINEMENT_ROADMAP.md`.
- Expanded `context/TASK_BOARD.md` with the audit-derived implementation queue: modularization, activation, feedback loop, personalization, observability, and performance controls.
- Added `supabase/functions/_shared/http.ts` and removed wildcard CORS from key edge functions.
- Tightened analytics replay privacy defaults in `src/analytics.js`.
- Updated extension distribution URLs to `promogrind.bet`.
- Replaced generated extension UI string injection with DOM-based rendering in popup + content scripts.
- Refreshed public memory files to S42 state.
- Verified `npm.cmd test` → 127/127 passing.
- Verified `npm.cmd run build` → passing.

## 2026-04-14 — S41 Sprint 1 Closeout

- Completed server-side AI access/quota hardening through shared `supabase/functions/_shared/ai-access.ts`.
- Wired quota/tier enforcement into PromoChat, PromoAdvisor, AI Action Plan, and Stack Builder.
- Added sportsbook CTA click tracking from calculator result CTAs.
- Added Dashboard "Next Best Action" activation card.
- Lazy-loaded PromoChat and PromoAdvisor; split analytics into a separate Vite chunk.
- Updated Wins Wall SQL migration and client publish path to support server upserts.
- Added Stripe smoke checklist.
- Updated public context/task board/decision/truth audit state.
- Verified `npm.cmd test` → 127/127 passing.
- Verified `npm.cmd run build` → passing; main app chunk reduced to ~392 kB.

This public repo no longer carries the detailed internal work log. Internal session-by-session execution detail is maintained privately.

## 2026-04-16 — Post-S50 workflow-operations refinement

- Deepened workflow ranking in `src/workflows/inbox.js` so open workflows score against bankroll load, actionability, promo/book history, friction, skip reasons, urgency, and freshness with explainable score summaries.
- Updated `src/dashboard/today.js` and `src/components/dashboard/WorkflowInboxPanel.jsx` so the dashboard and inbox both expose the new ranking reasons and support explicit queued → ready → placed → waiting progression.
- Synced workflow lifecycle edits back into matching result-feedback rows when possible, and synced Track settlement actions back into the workflow inbox so status surfaces stop drifting.
- Added a per-promo self-calibration drift chart in `src/components/TrackInsights.jsx` backed by new `selfCalibrationRows` output from `src/track/insights.js`.
- Expanded tests in `src/__tests__/workflowInbox.test.js`, `src/__tests__/dashboard.test.js`, and `src/__tests__/trackInsights.test.js`; validated with `npm.cmd test`, `npm.cmd run build`, and `node scripts/check-bundle-budget.mjs`.
