# Task Board

## Now

- finish monetization coverage with real approved affiliate/referral links for `BetMGM`, `bet365`, and `BetRivers`; there are still no operator-provided tracking URLs in repo/local context to wire in honestly
- push the Pages workflow update so GitHub Pages consumes `VITE_VAPID_PUBLIC_KEY` from Actions secrets on the next live deploy
- validate the new adaptive mission-control loop with real user flows and tune ranking weights for hot/cold lanes, backlog pressure, and expiring-value urgency
- extract startup/closeout truth parsing into one tested helper across the remaining renderers/closeout surfaces so public-safe repos stop drifting between status, contracts, and briefs [SIL]

## Next

- auto-route scanner/community findings into the shared workflow graph with remote reconciliation once the live migrations are in place
- harden launch-state/project-status derivation so public launch readiness reads from one canonical source instead of mixed manual notes
- continue decomposing the remaining high-churn `src/App.jsx` seams now that analytics bootstrap is deferred and the initial entry is lighter

## Shipped This Session

- repair live Supabase workflow/entity schema exposure, fix billing auth in production, and wire VAPID secret plumbing — **DONE S72**: repaired remote migration history, added a reconciliation migration that actually creates the missing sync tables + reloads PostgREST schema, pushed it live, redeployed `create-checkout` / `customer-portal` / `redeem-beta-code` / `gift-trial` with `--no-verify-jwt`, verified live Checkout now returns `200`, set a fresh VAPID keypair into Supabase secrets and GitHub Actions secrets, patched the Pages workflow to read `VITE_VAPID_PUBLIC_KEY`, and reran `scripts/verify-production-launch.mjs` until only the affiliate-link blocker remained.
- harden rerunnable Supabase migrations + persist new workflow telemetry + defer heavy startup dependencies — **DONE S72**: made the workflow/entity-sync/feature-flag SQL scripts idempotent for repeated apply; added durable schema/sync support for `execution_minutes` and `would_repeat`; moved service worker registration and analytics init off the first paint; lazy-loaded `App` from `main.jsx`; split PostHog and Sentry into deferred chunks. Tests still 374/374 and production build passes.
- ship adaptive mission-control intelligence + deeper feedback telemetry + AI response caching — **DONE S72**: `TodayDashboardPanel` and `SmartPromoRecommender` now consume adaptive dashboard intelligence from shared helpers; result feedback now captures execution minutes + repeat intent; track insights now aggregate execution/repeat calibration; Promo Advisor and Promo Chat reuse cached identical responses to cut repeated AI calls; dashboard tests expanded and suite now passes at 374/374.
- restore missing `DepositMatch` calculator and boot path — **DONE S71**: fixed `Uncaught ReferenceError: DepositMatch is not defined` by adding the calculator module and wiring it back into `src/App.jsx`; app loads again and browser smoke passes.
- extend workflow queue actions into scanner/community/launch surfaces — **DONE S71**: added `src/workflows/suggestions.js` and wired queue actions into `LiveScanner`, `CommunityPromoBoard`, and `LaunchCommandCenterPanel` so those surfaces feed the shared workflow inbox instead of stopping at isolated UI actions.
- consolidate more doctor/closeout renderers onto shared context parsing — **DONE S71**: `run-doctor`, `render-ops-cockpit`, `score-tasks`, and `closeout-summary` now consume the shared helper instead of duplicated parsing logic.
- refresh release truth for current launch blockers — **DONE S71**: `docs/RELEASE_PLAN.md` now reflects the real blocker set, test count, and removes the stale S62 edge-deploy item.
- streaming cancellation + exponential-backoff retry in AI gateway — **DONE S69**: `streamProjectFunction` now accepts AbortController signal; PromoAdvisorPanel and PromoChat abort on unmount/re-submission; 2-attempt retry (1s/3s) for transient 5xx/network failures.
- calculator input persistence for ParlayBuilder, RoundRobinCalc, SGPEstimator — **DONE S69**: stake and combo-size preferences now persist via `useCalcMemory`.
- fix 4 un-completable missions — **DONE S69**: added `flagVisit` helper; wired on-mount flags in PromoAdvisorPanel, TrackInsights, DailyBriefPage; on-toggle flag in Tracker.
- PromoChat HTML input sanitization + mission auto-complete + focus-refresh — **DONE S69**: PromoChat strips HTML before sending; DailyMissionsPanel auto-completes eligible missions and refreshes on window focus.
- fix pre-push hook false positive on gitignored-but-local files — **DONE S70**: added `--diff-filter=ACMRT` so deleted/untracked files are excluded from secret scanning; Render key in `rotate-render-key.mjs` no longer blocks push.
- sanitization: untrack private ops files, sanitize absolute paths — **DONE S69**: `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, `scripts/soul-interview.mjs` untracked and gitignored; `check-repo-lock.sh` example paths generalized. Scan now 0 critical/0 warning.
- add settlement mastery ladder + 30-badge achievement system + daily missions + micro-animations [SIL] — **DONE S68**: shipped `src/lib/mastery.js`, `src/lib/achievements.js`, `src/lib/missions.js`, `DailyMissionsPanel`, overhauled `DashboardHero` (rank badge, lane mastery bars, count-up animation), extended `ProfilePanel` (mastery section + achievement grid), wired achievement toast evaluation into `DailyDashboard`. 296/296 tests green.
- refresh REVENUE_SIGNALS.md — **DONE S68**: regenerated via `ops.mjs revenue-signals`; PromoGrind scored 7/10 revenue-ready, 1 deployed public-unlaunched product.
- decompose the highest-leverage `src/App.jsx` orchestration seams into dedicated product-shell and operator-loop modules [SIL] — **DONE S67**: extracted `usePromoAppShell`, centralized quick-calc fallback routing, and moved shared shell state out of the monolith
- unify calculator, AI, scanner, and community outcomes into one workflow/action graph [SIL] — **DONE S67**: added shared workflow store/action-graph modules and rewired dashboard + feedback surfaces onto them
- route all AI feature calls through one shared budgeted/cached gateway pattern — **DONE S67**: added shared AI gateway helpers and moved Promo Advisor, Promo Chat, AI Action Plan, and Stack Builder onto them
- deepen the post-settlement feedback loop so drift, trust, hot lanes, and micro-NPS improve recommendations automatically — **DONE S67**: surfaced hot-lane and micro-NPS pressure into Studio export, observability, launch cockpit, and targeted operator routing

## Deferred to Project Agents

- cross-repo IGNIS consumption and founder-queue presentation improvements owned by Studio Ops / IGNIS repos

## Blocked

- no local architecture blocker remains; the only unresolved launch-proof blocker still verified from this workspace is missing real approved affiliate tracking links for sportsbook CTAs, especially `BetMGM`, `bet365`, and `BetRivers`

## Later

- squad/community credibility system with verification score, lane mastery, and challenge loops
- bankroll orchestration layer with reserve policy, exposure caps, and lane diversification
- bootstrap item: render contracts and runtime pack
