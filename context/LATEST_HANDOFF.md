# Latest Handoff

Last updated: 2026-05-12 (S84)
Session: 84
Session Intent: Implement the next seven highest-impact PromoGrind improvements in one optimal pass: commit-ready audit fixes, Vitest cleanup, launch verification split, Windows browser smoke hardening, React hook-order guard, production dashboard smoke artifact wiring, and honest launch-proof handling.
Intent Outcome: Code-controllable items achieved. External/manual launch proofs remain honest blockers: approved BetMGM/bet365/BetRivers tracking URLs, one real Stripe smoke purchase, and one friend beta pass still require operator/tester action.

## Where We Left Off (Session 84)

- Fixed calculator/API contract drift: `supabase/functions/calc-api` now accepts canonical `/arb-2way` and keeps `/arb` as a compatibility alias; public calc-api docs match.
- Fixed tool deployment script drift: `deploy:functions` now deploys real `calc-api` instead of missing `odds`.
- Corrected First Bet Safety Net result semantics: UI now separates hedge-only worst case from projected bonus-refund conversion instead of implying hedge math alone is full guaranteed promo profit.
- Fixed Vitest shutdown/tooling behavior: `vitest.config.js` uses `threads` with `fileParallelism: false`; full suite passes 392/392 in ~20s without the previous post-run shutdown timeout.
- Added `scripts/check-app-hook-order.mjs` and wired it into `verify:launch-local` to prevent future React hooks below App route early returns.
- Hardened `scripts/validate-browser-launch-smoke.mjs` by replacing Vite preview port probing with an in-process static `dist` server; direct browser smoke passes.
- Split `verify-production-launch` into blocking deploy-health failures vs advisory launch gaps. Affiliate/monetization gaps stay visible in artifacts without failing a successful deploy.
- Added `npm run smoke:production-dashboard` to the Pages workflow artifact path; it writes `production-dashboard-smoke.json` and remains a hard deploy-health signal for live runtime failures.

## Verification (Session 84)

- `npm test` — 392/392 passing.
- `node scripts/check-app-hook-order.mjs` — passing.
- `npm run smoke:launch` — passing.
- `npm run smoke:ux` — passing, 60 app routes / 98 public HTML files.
- `npm run smoke:browser` — passing outside sandbox; sandboxed Vite build cannot read config due local path restrictions.
- `node scripts/check-bundle-budget.mjs` — passing.
- `node scripts/check-public-repo-sanitization.mjs --strict --json` — passing, 0 critical / 0 warning.
- `npm run smoke:production-dashboard` now exits with JSON locally; sandboxed live navigation produced `chrome-error://chromewebdata`, so final truth should come from the next GitHub Pages workflow artifact.

## What is mid-flight

- Rerun GitHub Pages deploy after S84 lands, then ingest the new `launch-verification` artifact and confirm `production-dashboard-smoke.json` is present.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`).
- Continued `src/App.jsx` decomposition remains valuable; App.jsx still carries several large inline surfaces.

## What to do next

1. Commit and push S84 hardening.
2. Let GitHub Pages deploy run, then `npm run ingest:launch`.
3. Review `artifacts/launch-verification/summary.md` and `production-dashboard-smoke.json`.
4. Complete `npm run smoke:stripe -- --record` with a real checkout when operator is ready.
5. Complete `npm run beta:check -- --record` with a trusted tester.
6. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive.

## Constraints

- Do not fabricate sportsbook affiliate links or manual proof evidence.
- Production dashboard smoke is a real deploy-health signal, but local shell networking may not reflect GitHub Actions networking.
- Public repo remains proprietary by default under CANON-008.

---

## Where We Left Off (Session 83)

- Fixed `src/App.jsx` hook-order violation that caused React error #310 on cold deep-link loads. Hoisted four route-scoped `useEffect`s, plus the `slug`/`gi`/`ti`/`item` derivation and `goTo` callback, above the three early returns. Inline comment marks the S83 root cause to prevent regression.
- Discovered the actual deploy host is **GitHub Pages**, not Cloudflare Pages — Cloudflare is DNS-only proxy. SPA fallback already works via `scripts/postbuild-pages.mjs` copying `dist/index.html → dist/404.html`. The `dashboard:1 Failed to load resource: 404` in DevTools is the response *status*; the body still hydrates the SPA.
- Added `public/_redirects` with `/* /index.html 200`. Harmless no-op on GitHub Pages, forward-compat if the project ever moves to Cloudflare Pages.
- Verified live: prod App bundle is now `App-BJlXUHbf.js` (was `App-C8ZfyIiU.js` pre-fix). Last-modified header confirms our commit shipped.
- Updated agent memory `reference_infrastructure.md` with the GitHub Pages clarification so future sessions don't waste time re-discovering the host.

## What was completed

- **Hook-order fix (S83)**: `src/App.jsx` now mounts every `useEffect` before any conditional `return`. Specifically: hoisted the four post-return hooks (VaultSDK gates, calc-view tracking, `pg:quick-calc` event handler, `tabMemory` recorder) plus the `slug`/`gi`/`ti`/`item` derivation and `goTo` callback. Resolves React error #310 on cold deep-link loads.
- **SPA fallback hardening (S83)**: added `public/_redirects` (`/* /index.html 200`). No effect on the current GH Pages host (already handled by `postbuild-pages.mjs` via `404.html`); kept as a forward-compat artifact.
- **Infrastructure clarification (S83)**: confirmed via response headers (`x-github-request-id`, Fastly via Varnish, `public/CNAME`) that production is GitHub Pages, not Cloudflare Pages. Updated agent memory and inline notes accordingly.
- **Production verification (S83)**: `npm run build` green; `npm run smoke:ux` green (60 routes / 98 public HTML); `workflowSuggestions.test.js` 4/4. Live bundle hash flipped from `App-C8ZfyIiU.js` to `App-BJlXUHbf.js` after deploy.

## Where We Left Off (Session 82)

- Added `scripts/validate-production-dashboard-smoke.mjs` (`npm run smoke:production-dashboard`), a dependency-free Chromium/CDP production smoke that captures console errors and runtime exceptions at `https://promogrind.bet/dashboard`.
- The new production smoke captured the current live dashboard failure: `ReferenceError: syncDiagnostics is not defined` in the deployed bundle. Source fix is local: `DailyDashboard` now reads `syncDiagnostics`, `syncStatus`, and `isOnline` from `AppDataCtx`.
- Added `scripts/launch-status.mjs` (`npm run launch:status`) as the single launch posture command. Full mode runs the local launch gate, production dashboard smoke, post-deploy artifact ingest, and manual proof guide; `--fast` prints proof state without expensive checks.
- Extracted profit milestone/goal notification effects from `src/App.jsx` into `src/app/useProfitNotifications.js`, reducing app-shell responsibility while preserving behavior.
- Re-ingested latest deploy verification artifact with `npm run ingest:launch`. Run `25181776729` confirms Supabase workflow/ledger/tracker/feature/push tables, VAPID env, signup, confirmed billing user, live checkout, and customer portal checks all pass.
- Remaining deploy-verification failures are honest monetization blockers: `affiliate_coverage` and `required_launch_monetization` for `BetMGM`, `bet365`, and `BetRivers`.
- Verification this session: `npm run verify:launch-local` passed end-to-end (`392/392` tests, launch smoke, UX route integrity, browser smoke, bundle budget, strict public-repo sanitization). Vitest may still print non-fatal worker termination warnings after the passing suite.

## What was completed

- **Production dashboard smoke (S82)**: `scripts/validate-production-dashboard-smoke.mjs` uses Chrome DevTools Protocol to load the live dashboard and fail on runtime exceptions / console errors. This turns founder-reported dashboard errors into a repeatable launch gate.
- **Live dashboard runtime source fix (S82)**: `DailyDashboard` now pulls `syncDiagnostics`, `syncStatus`, and `isOnline` from `AppDataCtx`, fixing the `syncDiagnostics is not defined` crash captured in the live bundle. Needs deploy before live smoke turns green.
- **One-command launch posture (S82)**: `scripts/launch-status.mjs` (`npm run launch:status`) orchestrates launch checks and prints exact manual proof runners. Fast mode verified current proof state as `PARTIAL` with 3 blocking manual proofs still pending.
- **App.jsx decomposition (S82)**: `src/app/useProfitNotifications.js` owns profit milestone and goal notifications; `App.jsx` now calls the hook instead of carrying both effects inline.
- **Deploy artifact truth refresh (S82)**: `artifacts/launch-verification/post-deploy.json` refreshed from GitHub Actions run `25181776729`; only affiliate/required monetization checks are red.
- **Repo truth writeback (S82)**: `context/TASK_BOARD.md`, `context/PROJECT_STATUS.json`, `docs/RELEASE_PLAN.md`, `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, `context/TRUTH_AUDIT.md`, SIL, audit JSON, CDR, and memory updated for S82.

- **Vitest full-suite timeout fixed (S81)**: `vitest.config.js` now sets `testTimeout: 20000`, `hookTimeout: 20000`, `pool: "forks"`, `maxWorkers: 4`, `isolate: true`. `src/__tests__/calculators.test.jsx` hoisted six per-`beforeEach` dynamic calculator imports to top-level static imports. Suite duration ~274s with 2 failures → ~95s with 392/392 passing.
- **PostHog console hygiene (S81)**: `src/analytics.js` PostHog init now sets `advanced_disable_feature_flags`, `advanced_disable_feature_flags_on_first_load`, `advanced_disable_toolbar_metrics`, `debug: !IS_PROD`, and forces `ph.debug(false)` in production via the `loaded` callback.
- **Post-deploy launch-verification ingester (S81)**: `scripts/ingest-launch-verification.mjs` (`npm run ingest:launch`) pulls latest `launch-verification` artifact, writes `artifacts/launch-verification/post-deploy.{md,json}`, never modifies manual `LAUNCH_PROOFS.json`. Live-tested against the latest deploy run.
- **App.jsx decomposition (S81)**: extracted `parseBetSlip` to `src/app/parseBetSlip.js`; added `src/__tests__/parseBetSlip.test.js` with 10 regression cases (empty input, dollar/comma stake, american/decimal/fractional odds, known-book detection, parlay flag, vs/at description capture, combined-field round trip).
- **Scripted Stripe smoke runner (S81)**: `scripts/run-stripe-smoke.mjs`. `--print` shows the 8-step checklist; interactive run captures session/customer/subscription IDs; `--record` appends evidence and flips `LAUNCH_PROOFS.json[stripeSmoke].status` to `complete`.
- **Scripted friend beta runner (S81)**: `scripts/run-friend-beta-checklist.mjs`. 5 steps (auth, calculator, CTA, pricing, trust) with per-step friction note capture; `--record` appends evidence and flips `LAUNCH_PROOFS.json[friendBeta].status` to `complete` only if all steps pass.
- **Secret-sync helper (S81)**: `scripts/sync-github-secrets.mjs` reads `.env.admin` and pushes selected keys to GitHub Actions secrets via `gh`. Used this session to set `SUPABASE_SERVICE_ROLE_KEY` (was missing in CI; surfaced by the new ingester).
- **External blocker action (S81)**: `npm run sync:secrets` set `SUPABASE_SERVICE_ROLE_KEY`; `gh workflow run deploy-pages.yml` triggered redeploy. Pages deploy completed successfully; the post-deploy `verify launch` step still exits 1 (expected — fails on missing required-launch-monetization affiliate URLs, which are operator-side).
- **Task board / current state writeback (S81)**: `context/TASK_BOARD.md` Now/Next reorganized around the new scripted runners and the surfaced `SUPABASE_SERVICE_ROLE_KEY` finding; Shipped This Session lists all six S81 deliverables.

## What is mid-flight

- Deploy S82 fix, then rerun `npm run smoke:production-dashboard` against live to confirm the `syncDiagnostics` crash is gone.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase against deployed app — runner is ready (`npm run smoke:stripe -- --record`); pending operator completion.
- Friend-facing auth/calculator/CTA/pricing pass — runner is ready (`npm run beta:check -- --record`); pending operator + one trusted tester.
- Continued `src/App.jsx` decomposition beyond `parseBetSlip`/`AppChrome`/`appText`/`AppNotifications`/community-promos route is still worthwhile; App.jsx still ~4300 lines.

## What to do next

1. After this push/deploy, run `npm run smoke:production-dashboard`; live should stop reporting `ReferenceError: syncDiagnostics is not defined`.
2. Run `npm run ingest:launch` after deploy and confirm the automated checks remain green except known monetization blockers.
3. Run `npm run smoke:stripe -- --record` once Stripe live keys are in Supabase secrets and the operator can complete one real checkout.
4. Run `npm run beta:check -- --record` with one trusted tester after deploy.
5. Add real approved `BetMGM`, `bet365`, and `BetRivers` tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
6. Continue extracting another `src/App.jsx` seam (candidates: `EmailCapture`, `SessionModal`, `Glossary`, `PromoCalendar`).

## Constraints

- This public repo does not carry the full private Studio Ops layer; use repo-local truth files instead of assuming portfolio scripts exist.
- Do not commit `supabase/.temp/*` or anything in `.env*`.
- `docs/CREATIVE_DIRECTION_RECORD.md` is required by this repo's AGENTS guide as a closeout surface and should remain available for additive updates.
- `gh secret set` requires `gh auth login` first; the sandbox environment can't open a browser, so re-auth must happen in the founder's regular shell.
- Do not fabricate sportsbook affiliate links. If the operator has not provided a real approved URL, leave the field empty and keep the blocker honest.

## Read these first next session

1. `docs/STARTUP_BRIEF.md`
2. `context/TASK_BOARD.md`
3. `context/LAUNCH_PROOFS.json`
4. `artifacts/launch-verification/post-deploy.json` (after next ingest)

## Files to update next session if work continues

- `src/App.jsx` and `src/app/` (continued decomposition)
- `context/LAUNCH_PROOFS.json` (Stripe + friend beta evidence once captured)
- `src/books.js` (affiliate links if any partner approvals come through)
- `docs/RELEASE_PLAN.md`
