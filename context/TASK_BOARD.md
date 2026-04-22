# Task Board

## Now

- apply Supabase workflow/entity sync + feature-flag migrations live so the unified workflow loop persists beyond local storage
- finish launch proof with real affiliate links, Stripe smoke, production VAPID, and friend beta so launch blockers leave `manual`
- extract startup/closeout truth parsing into one tested helper across the remaining renderers/closeout surfaces so public-safe repos stop drifting between status, contracts, and briefs [SIL]

## Next

- auto-route scanner/community findings into the shared workflow graph with remote reconciliation once the live migrations are in place
- harden launch-state/project-status derivation so public launch readiness reads from one canonical source instead of mixed manual notes

## Shipped This Session

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

- no local architecture blocker remains; external launch proof still needs live Supabase migrations, real affiliate links, Stripe smoke, VAPID production setup, and friend beta verification

## Later

- squad/community credibility system with verification score, lane mastery, and challenge loops
- bankroll orchestration layer with reserve policy, exposure caps, and lane diversification
- bootstrap item: render contracts and runtime pack
