# Work Log

## 2026-04-17 — S64 Feature Gates + Observability + Truth Cleanup

- Continued from S63 pre-load and repeated `/go` passes, then closed out manually because the private Studio OS closeout scripts are not present in this public repo.
- Wired remaining client feature gates through `useFeatureFlag`: PromoChat, AIActionPlan, LiveScanner, and StackBuilder now keep hooks unconditional and support remote overrides; feature tier matching now normalizes legacy tier/plan labels.
- Upgraded StackBuilder client rendering for the new structured response shape: summary, ordered steps, assumptions, books used, chips for promo/calculator/hedge fields, and structured copy text with old `plan` fallback.
- Expanded launch smoke coverage for `/land/:creator` by requiring the landing route guard, route component, `landing_page_view`, and `pg_ref` attribution storage.
- Added AI usage/abuse observability: `buildAiUsageSnapshot` in `src/observability.js`, ObservabilityPanel AI Load/risk display, and focused unit coverage.
- Fixed `build:cap` for Windows by removing POSIX-only env assignment; `dist-cap` is now ignored.
- Reconciled public truth surfaces: task-board blockers, startup brief, project status, truth audit, and latest handoff now reflect S64 repo truth.
- Verified: npm.cmd test → 289/289 · npm.cmd run build → passing · bundle 329.3KB under 425KB · launch smoke passing · build:cap passing.

## 2026-04-17 — S63 Task Board Update + Two /go Sprints (20 items — new record)

- Session started with ranked analysis of 6–10 highest-impact items; founder confirmed to implement all.
- Sprint 1 (8 items): CalculatorReceipt wired to all 16 calculators, Deno CI integration, promo-advisor SSE streaming, portfolio allocation in Studio contract, AI schema validation (_shared/validate.ts), SW stale-while-revalidate + IDB queue flush, creator/referral landing pages (/land/:creator), feature flag admin surface (featureFlags.js + FeatureFlagAdmin.jsx + migration SQL).
- Sprint 2 (12 items): Receipt test coverage (+9 tests → 288/288), promo-advisor SUPABASE_URL fallback, UTM attribution in PostHog identifyUser+trackPage, assumptions[] in PromoAdvisorPanel, useFeatureFlag hook adoption (fixes hooks-above-return violation), boot-time IDB queue flush, landing page analytics event, creator referral on signup, Feature Flags link in LaunchCommandCenterPanel, validate.ts Deno tests (20 tests), stack-builder structured JSON normalization, STARTUP_BRIEF refresh.
- New files: `src/routes/LandingRoute.jsx`, `src/lib/featureFlags.js`, `src/components/FeatureFlagAdmin.jsx`, `scripts/migration-feature-flags.sql`, `supabase/functions/_shared/validate.ts`, `supabase/functions/__tests__/validate.test.ts`.
- Verified: npm.cmd test → 288/288 · npm.cmd run build → passing · bundle 329.3KB under 425KB.

## 2026-04-17 — S62 Full Audit + 16-Item Implementation Tranche

- Full project audit: surveyed architecture, AI integration, gamification, calculator depth, Studio OS contract, security surface, bundle/performance, token usage, workflow system, test coverage. Produced ranked innovation plan across 8 dimensions.
- Sprint 1 (8 items): buildSummaryDelta playbook tracking, studioExport topPlaybook tests, prompt caching on all 3 AI edge functions, per-user AI context in promo-advisor, Promo Streak Engine + DashboardHero display, quota awareness UI, auth bypass build guard, Portfolio EVS Engine.
- Sprint 2 (8 items): Portfolio EVS allocation card + confidence decay bars in WorkflowInboxPanel, promo-chat SSE streaming (edge function + PromoChat client), ai-action-plan userContext enrichment, calculator receipt export (CalculatorReceipt.jsx + BonusBet), Deno edge function tests (17 tests total), community hot-lane signal (buildHotLanes + CommunityPromoBoard), deploy script.
- New modules: `src/lib/streaks.js`, `src/lib/portfolio.js`, `src/components/CalculatorReceipt.jsx`, `scripts/deploy-edge-functions.sh`, `supabase/functions/__tests__/` (2 test files).
- Verified: npm.cmd test → 279/279 · npm.cmd run build → passing · bundle 327.5KB under 425KB.

## 2026-04-17 — S61 ProfitBoost + FirstBet Tests + Studio Contract Playbook Wire

- Added 12 component tests to calculators.test.jsx: 6 ProfitBoost (title, guaranteed profit, demo mode, exit demo, example, help) + 6 FirstBet (title, hedge amount, demo mode, exit demo, example, help).
- Wired topPlaybook into buildStudioSnapshot: imported matchPlaybooks, computed topPlaybook, passed to buildOperatingActionCandidates (enabling playbook operating decisions in Studio snapshot) and buildOperatorCommandBrief.
- buildOperatorCommandBrief now returns brief.topPlaybook as structured { id, name, fitScore, fitReasons, firstStepSlug, stepCount } + appends "Try: {name}" to followUps when applicable.
- Verified: npm.cmd test 247/247 · npm.cmd run build green · bundle 324.6KB under 425KB.

## 2026-04-17 — S60 Calculator Extraction + Cockpit Playbook Wire (/go Sprint)

- Extracted 7 remaining inline calculators from App.jsx to src/calculators/: TeaserCalc, RoundRobinCalc, ParlayBuilder, SGPEstimator, HoldCalc (bonus), BetSizingAdvisor, LineShop; all lazy-loaded.
- Main bundle recovered from 345.1KB → 324.6KB (20.5KB reduction; 100.4KB total headroom under 425KB cap).
- Added getDashboardSnapshot({ includePlaybooks: true }) call to LaunchCommandCenterPanel; passed result as dashboard to buildTargetedAlertPlan; added "Top Matched Playbook" subsection to Daily Command Brief card.
- topPlaybook architecture now complete across Today dashboard (ActivationNextAction), Daily Brief, and Launch Cockpit.
- Verified: npm.cmd test 235/235 · npm.cmd run build green · bundle 324.6KB under 425KB.

## 2026-04-17 — S59 Calculator Component Tests + Operator Briefing Playbook Wire

- Recovery session: terminal was cut off mid-S59; identified 3 modified uncommitted files and 1 untracked file from prior agent work; root-caused the vitest config error (agent edited vite.config.js instead of vitest.config.js — `vitest.config.js` always takes precedence).
- Fixed `vitest.config.js`: added `@vitejs/plugin-react` plugin and updated `include` to `*.test.{js,jsx}`; reverted `vite.config.js` dead test block.
- Activated pre-written `src/__tests__/calculators.test.jsx` (13 tests for BonusBet + KellyCriterion); fixed 2 test assertions: Help component renders `{term}:` not `{term}`, and navigator.clipboard is getter-only in happy-dom so `Object.assign` throws — replaced with `Object.defineProperty`.
- Added `topPlaybook` handling to `buildTargetedAlertPlan` in `src/operator/briefing.js`: kind="playbook" alert at priority 91 with fit-reason body and first-step CTA slug.
- Updated `DailyBriefPage.jsx` to call `getDashboardSnapshot({ includePlaybooks: true })` and render a distinct green playbook card when a playbook is applicable.
- Added `src/__tests__/briefing.test.js` with 6 tests covering the full playbook alert path.
- Verified `npm.cmd test` → 235/235 passing (+19: 13 calculator + 6 briefing).
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (345.1KB main chunk under 425KB cap).

## 2026-04-16 — S58 Playbook CTA + Calculator Extraction + /go Sprint

- Continued the public-repo fallback path from `docs/SESSION_PROTOCOL.md`; performed manual write-back because private automation scripts are not present in this repo.
- Pre-/go tranche: wired `matchPlaybooks` into `ActivationNextAction` and added a distinct playbook CTA render (icon, step count, bankroll-fit reason, "Run playbook →") when a playbook wins the operating decision; updated `getNextBestAction` to return `focus` from the operating decision.
- Pre-/go tranche: added community board state filter auto-default from `appData.userState` via `AppDataCtx`; extended `useFocusTrap` + Escape key handler to `PromoWalkthrough`.
- Pre-/go tranche: created `scripts/migration-cron-jobs.sql` for `onboarding-drip` + `weekly-digest` `pg_cron` schedules; fixed `stripeProductionPriceIds` truth-drift in `PROJECT_STATUS.json`.
- Pre-/go tranche: extracted `BonusBet`, `ProfitBoost`, `FirstBet`, `BookCTA`, `ShareCard`, `CommunityWinsWall`, `SmartPromoRecommender` from `App.jsx` into dedicated files; bundle recovered from 418.3KB to 379.8KB.
- /go sprint: extracted `NoVig`, `NoVig3Way`, `PlusEV`, `Arb2Way`, `Arb3Way`, `KellyCriterion`, `InsurancePromo` from `App.jsx` into `src/calculators/`; bundle recovered to 353.3KB (71.7KB total this session).
- /go sprint: added `topPlaybook` opt-in to `getDashboardSnapshot`; `TodayDashboardPanel` now uses snapshot-level playbook data when available; extended playbook library from 4 to 6 playbooks (SGP Insurance Loop + Reload Match Grind).
- /go sprint: added Escape key handler to `PromoWalkthrough`; corrected stale TASK_BOARD items for community intel, cron trigger, and auth tokens.
- Verified `npm.cmd test` → 216/216 passing (+2 new dashboard tests for topPlaybook operating decision).
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`353.3KB` main chunk under 425KB cap).

## 2026-04-16 — S57 Playbook Operating Decision + Community Intel + Aria + Auth Tests

- Continued the public-repo fallback path from `docs/SESSION_PROTOCOL.md`; performed manual write-back because the private `scripts/ops.mjs`, `closeout-autopilot.mjs`, and related Studio OS automation are not present in this repo.
- Pre-loaded two [SIL] items during startup (momentum runway = 2.0) before beginning feature work.
- Wired matched playbooks as first-class candidates in `src/promograph/index.js` `buildOperatingActionCandidates` and `selectOperatingDecision`; updated `src/dashboard/today.js` `getNextBestAction` to accept and pass `topPlaybook`.
- Added insertion-order ordinal tracking to `src/workflows/inbox.js` `buildWorkflowInbox` so playbook step ordering is preserved in the inbox sort.
- Extracted `PromoBoard` into `src/components/CommunityPromoBoard.jsx` (lazy-loaded), adding freshness, verified badge, flag button, state filter, and hide-expired toggle; lazy extraction recovered 4KB of main-chunk headroom.
- Applied aria audit to `src/ui.jsx`: `In` now has proper label-input association, `aria-invalid`, `aria-describedby`; `Tl` buttons have `aria-label` and `aria-pressed`.
- Expanded `src/__tests__/auth.test.js` from 18 to 32 tests using `vi.hoisted` covering session lifecycle, token hijack/expiry scenarios, and subscription tier checks.
- Verified `npm.cmd test` → 214/214 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`418.3KB` main chunk under 425KB cap).

## 2026-04-16 — S55 Sync Compatibility Mirror + Operating Graph + Full Closeout

- Continued the public-repo fallback path from `docs/SESSION_PROTOCOL.md` because the private `scripts/ops.mjs`, `closeout-autopilot.mjs`, and related Studio OS automation are not present here; performed the write-back manually instead of stopping.
- Finished the current sync-compatibility tranche in `src/sync.js` so entity-backed saves compact `promogrind_data` into a compatibility mirror, authenticated loads can compact older full blobs, and queue-backed sync diagnostics can be surfaced in-product.
- Deepened tracker-domain merge/persistence handling and expanded `src/__tests__/sync.test.js` to cover compatibility-mirror compaction plus full-fallback behavior when dedicated entity tables are unavailable.
- Added shared operating-action candidate generation and decision selection in `src/promograph/index.js`, then reused that logic from `src/dashboard/today.js` and `src/studio/export.js`.
- Added `src/observability.js` plus `src/components/dashboard/ObservabilityPanel.jsx`, wired sync diagnostics through `src/App.jsx` / `TodayDashboardPanel.jsx`, and exposed activation, return, CTA, AI, monetization, and sync-state metrics on the dashboard.
- Added `.github/workflows/ci.yml` enforcement for tests, build, and the bundle-budget gate.
- Split dashboard-only hero/action surfaces into lazy chunks (`ActivationNextAction.jsx`, `DashboardHero.jsx`) so the bundle budget stayed green after the new operator/observability surfaces landed.
- Refreshed `CURRENT_STATE`, `TASK_BOARD`, `LATEST_HANDOFF`, `DECISIONS`, `SELF_IMPROVEMENT_LOOP`, `TRUTH_AUDIT`, `PROJECT_STATUS`, `STATE_VECTOR`, `GENOME_HISTORY`, `CREATIVE_DIRECTION_RECORD`, and a new audit JSON manually because the canonical closeout scripts/autopilot are missing in this repo.
- Verified `npm.cmd test` → 187/187 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`419.4KB` main chunk under 420KB target).

## 2026-04-16 — S54 Sync Conflict-Merge Tranche

- Updated `src/sync.js` so remote/local reconciliation now merges ledger rows, workflow inbox rows, result-feedback rows, and workflow-history rows per record instead of replacing entire arrays based on entity-level last-write-wins behavior.
- Expanded `src/__tests__/sync.test.js` to cover concurrent append/update cases across local and remote sync state, including ledger unions, workflow unions, and workflow-history unions.
- Extracted `PromoWalkthrough` into `src/components/PromoWalkthrough.jsx` and lazy-loaded it from `src/App.jsx`, pulling walkthrough copy/UI off the startup path so the bundle budget recovered cleanly.
- Revalidated with `npm.cmd test` → 178/178 passing, `npm.cmd run build` → passing, and `node scripts/check-bundle-budget.mjs` → passing (`~415.9KB` main chunk under the `420KB` cap).

## 2026-04-16 — S53 Operator Guidance + Full Manual Closeout

- Continued the missing-script public-repo fallback path from `docs/SESSION_PROTOCOL.md` and completed manual `/go` + `/closeout` write-back because the private `scripts/ops.mjs`, startup renderer, and closeout automation are not present in this repo.
- Deepened workflow provenance across `src/sync.js`, `src/track/insights.js`, `src/components/TrackInsights.jsx`, and `src/workflows/inbox.js` so durable workflow-history transitions now persist, surface in Track, and influence workflow scoring.
- Added local Studio contract publish/history in `src/studio/export.js` and `src/components/dashboard/LaunchCommandCenterPanel.jsx`, including persisted snapshots plus delta summaries instead of clipboard-only exports.
- Added a shared Daily Command Brief and targeted alert plan through `src/operator/briefing.js`, `src/components/dashboard/DailyBriefPage.jsx`, and `src/components/dashboard/LaunchCommandCenterPanel.jsx`.
- Added a filterable workflow-history surface plus Micro-NPS capture after three settled workflows in `src/components/TrackInsights.jsx`.
- Added state/book-aware personalization in `src/books.js`, `src/dashboard/today.js`, `src/workflows/inbox.js`, `src/components/Tracker.jsx`, and `src/App.jsx` so CTAs and workflow ranking prefer legal, open, non-degraded books for the current user.
- Refreshed `CURRENT_STATE`, `TASK_BOARD`, `LATEST_HANDOFF`, `DECISIONS`, `SELF_IMPROVEMENT_LOOP`, `TRUTH_AUDIT`, `PROJECT_STATUS`, `STATE_VECTOR`, `CREATIVE_DIRECTION_RECORD`, and a new audit JSON manually because the canonical closeout scripts/autopilot are missing in this repo.
- Verified `npm.cmd test` → 175/175 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`418.9KB` main chunk under 420KB target).

## 2026-04-16 — S52 Operator Contract + Manual Closeout

- Reconstructed the `/go` worklist from live repo truth because the canonical `scripts/ops.mjs`/IGNIS wrapper is missing in this repo, then synced the resulting roadmap into `context/TASK_BOARD.md` and Codex project memory.
- Expanded `src/track/insights.js` so Track now emits ranked drift alerts from promo-type and book settlement deltas.
- Upgraded `src/studio/export.js` into a versioned Studio contract with summary, priorities, anomalies, drift alerts, and declared downstream Studio consumer surfaces.
- Updated `src/components/dashboard/LaunchCommandCenterPanel.jsx` so the launch cockpit now shows machine priorities plus anomaly/drift feeds, not only static readiness counters.
- Hardened `supabase/functions/calc-api/index.ts` onto the shared CORS/JSON helper and corrected public attribution to `promogrind.bet`.
- Added `src/__tests__/studioExport.test.js` and expanded `src/__tests__/trackInsights.test.js`; validation now sits at 170/170 passing.
- Refreshed `CURRENT_STATE`, `TASK_BOARD`, `LATEST_HANDOFF`, `DECISIONS`, `SELF_IMPROVEMENT_LOOP`, `TRUTH_AUDIT`, `PROJECT_STATUS`, `STATE_VECTOR`, `CREATIVE_DIRECTION_RECORD`, and `audits/2026-04-16-2.json` manually because the canonical closeout scripts/autopilot are missing in this repo.
- Verified `npm.cmd test` → 170/170 passing.
- Verified `npm.cmd run build` → passing.
- Verified `node scripts/check-bundle-budget.mjs` → passing (`419.1KB` main chunk under 420KB target).

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
