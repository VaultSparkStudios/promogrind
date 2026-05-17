# Latest Handoff

Last updated: 2026-05-17 (S88)
Session: 88
Session Intent: Run `/start`, `/audit`, `/implement`, and `/closeout` for the next highest-leverage repo-controllable PromoGrind improvements.
Intent Outcome: Achieved for repo-controllable work. S88 shipped a ranked audit plan, Operator Season rail, Profile local data controls, public `dist/` exposure gate, friend-beta feedback summary generation, and a reliable AI usage launch-gate step. The new dist gate caught and removed the legacy public `vault-sdk.js` cross-project membership SDK/reference. External/manual launch proofs remain honest blockers: approved BetMGM/bet365/BetRivers tracking URLs, one real Stripe smoke purchase, one friend beta pass with account-recovery visibility, and a production auth email pass after deploy.

## Where We Left Off (Session 88)

- Created `docs/AUDIT_2026-05-17.md`, a compact ranked plan across gamification/UX, security/trust, release hardening, feedback loops, and token/API cost.
- Added `src/lib/seasons.js` and surfaced a 14-day Operator Season rail above Daily Missions; season progress rewards closed loops, repeat feedback, bankroll context, and open-bet cleanup rather than raw bet volume.
- Added `src/lib/dataControls.js` and Profile export/clear-local controls for browser-stored PromoGrind data.
- Added `scripts/check-public-dist-exposure.mjs`, wired it into `verify:launch-local`, and verified rebuilt `dist` passes 0 critical / 0 warning.
- Removed the legacy public `vault-sdk.js` asset and `index.html` script reference after the exposure gate flagged it; this also preserves the S86 PromoGrind-only account boundary.
- Extended `scripts/run-friend-beta-checklist.mjs --record` so friend-beta evidence writes `docs/BETA_FEEDBACK.md` with friction tags.
- Wired `npm run ai:usage` into `verify:launch-local` and replaced the lingering Supabase client query with direct PostgREST fetch.

## Verification (Session 88)

- `npm run verify:launch-local` — passed end to end.
- Full suite inside the gate: 409/409 tests passing across 33 files.
- `npm run ai:usage` — passed and wrote `docs/AI_USAGE_LEDGER.md`.
- `node scripts/check-app-hook-order.mjs` — passed.
- `npm run smoke:auth` — passed.
- `npm run smoke:launch` — passed.
- `npm run smoke:ux` — passed, 60 app routes and 98 public HTML files.
- `npm run smoke:browser` — passed after rebuilding production `dist`.
- `node scripts/check-public-dist-exposure.mjs` — passed, 0 critical / 0 warning.
- `node scripts/check-bundle-budget.mjs` — passed.
- `node scripts/check-public-repo-sanitization.mjs --strict --json` — passed, 0 critical / 0 warning.

## What is mid-flight

- Deploy S88 to production, then run a real auth email smoke: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/recovery/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`); the runner now writes `docs/BETA_FEEDBACK.md`.
- Continue the remaining product roadmap from prior audits: promo-passport onboarding, rule-first AI routing depth, and route/app-shell decomposition.

## What to do next

1. Push/deploy S88, then run production auth email checks and `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with a trusted tester and review `docs/BETA_FEEDBACK.md`.
3. Complete `npm run smoke:stripe -- --record` with one real checkout when operator is ready.
4. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
5. Continue the next roadmap tranche with promo-passport onboarding or rule-first AI routing.

## Constraints

- Do not fabricate sportsbook affiliate links, Stripe evidence, friend-beta evidence, or production email-delivery evidence.
- PromoGrind account creation is intentionally separate from Studio membership until the Studio membership layer is fully integrated across projects.
- Public repo remains proprietary by default under CANON-008.

---

## Where We Left Off (Session 87)

- Created `docs/AUDIT_2026-05-14.md`, a combined ranked plan across feature depth, UI/UX, gamification, AI, security, speed/organization, and token/API consumption.
- Mirrored `context/LAUNCH_PROOFS.json` into a browser-safe generated module and made `LaunchCommandCenterPanel` show each proof's evidence requirements, status, and next step.
- Added an Operator Autopilot card to `TodayDashboardPanel` that chooses the most actionable workflow or next-best dashboard action and routes the user to execution/outcome capture.
- Added local trust receipts for auth, billing, Promo Advisor, push subscription, and cloud-sync events, surfaced in Profile.
- Added a discipline score to `DashboardHero`, rewarding settled feedback loops, repeatable lanes, and lower unresolved exposure instead of raw bet volume.
- Added outcome-memory signals to recommendations so users see when promos are elevated by hot lanes/repeat intent or cooled by drift.
- Added `npm run ai:usage` and `docs/AI_USAGE_LEDGER.md`; promo-advisor now records rule-engine model-call avoidance and token estimates.

## Verification (Session 87)

- `npx vitest run --reporter=dot` — 30 files / 402 tests passing during closeout. Initial `npm test` returned non-zero without failure details in captured output; the compact Vitest rerun passed cleanly.
- `npm run build` — passing during closeout.
- `npm run smoke:launch` — passing during closeout.
- `npm run check:bundle` — passing during closeout.
- `node scripts/check-public-repo-sanitization.mjs --strict --json` — passing, 0 critical / 0 warning.
- `npx vitest run src/__tests__/dashboard.test.js src/__tests__/observability.test.js` — passing after outcome-memory changes.
- `node scripts/render-ai-usage-ledger.mjs --offline --json` / `--offline` — passing; `docs/AI_USAGE_LEDGER.md` generated.

## What is mid-flight

- Deploy S87 to production, then run a real auth email smoke: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/recovery/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`).
- Continue the audit roadmap from `docs/AUDIT_2026-05-14.md`: promo passport onboarding, richer proof telemetry, rule-first AI routing, and public bundle exposure gates.

## What to do next

1. Let GitHub Pages deploy S87, then run the production auth email smoke and ingest the deploy artifact with `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with a trusted tester.
3. Complete `npm run smoke:stripe -- --record` with one real checkout when operator is ready.
4. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
5. Continue from `docs/AUDIT_2026-05-14.md`, prioritizing promo-passport onboarding and `dist/` exposure gates.

## Constraints

- Do not fabricate sportsbook affiliate links, Stripe evidence, friend-beta evidence, or production email-delivery evidence.
- PromoGrind account creation is intentionally separate from Studio membership until the Studio membership layer is fully integrated across projects.
- Public repo remains proprietary by default under CANON-008.

---

## Where We Left Off (Session 86)

- Separated PromoGrind account creation from Studio membership in the auth modal, member welcome copy, footer access copy, Terms, Privacy, Data Policy, and generated public HTML trust/footer copy.
- Removed the user-facing Vault account portal path from profile/account surfaces; logged-in account help now routes to PromoGrind support instead of implying a shared Studio membership portal.
- Removed the unused `VAULT_ACCOUNT_PORTAL_URL` export after decoupling the account UI from the Vault member portal.
- Updated `src/auth.js` comments/log prefixes from shared Vault identity language to PromoGrind account auth language.
- Expanded `scripts/validate-auth-launch-smoke.mjs` so auth/account surfaces fail if Vault account/membership, cross-Studio sync, or connected-VaultSpark-tool claims return.
- Verification passed: `npm run smoke:auth`, `npm run smoke:launch`, `npm run build`, and `npm test` (396/396).

## Verification (Session 86)

- `npm run smoke:auth` — passing.
- `npm run smoke:launch` — passing.
- `npm run build` — passing.
- `npm test` — 396/396 passing.

## What is mid-flight

- Deploy S86 to production, then run a real auth email smoke: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/recovery/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`).
- Continued `src/App.jsx` decomposition remains valuable; App.jsx still carries several large inline surfaces.

## What to do next

1. Let GitHub Pages deploy S86, then run the production auth email smoke and ingest the deploy artifact with `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with a trusted tester after deploy.
3. Complete `npm run smoke:stripe -- --record` with one real checkout when operator is ready.
4. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
5. Continue extracting another `src/App.jsx` seam once launch proof is no longer the active bottleneck.

## Constraints

- Do not fabricate sportsbook affiliate links, Stripe evidence, friend-beta evidence, or production email-delivery evidence.
- PromoGrind account creation is intentionally separate from Studio membership until the Studio membership layer is fully integrated across projects.
- Public repo remains proprietary by default under CANON-008.

---

## Where We Left Off (Session 85)

- Fixed the account modal: users can now resend confirmation email, request forgot-password reset, open recovery links into `?auth=update-password`, and set a new password.
- Hardened Supabase auth redirect handling: confirmation links get an explicit sign-in redirect; reset links get an explicit update-password redirect; `tryAuth`/`checkAuth` now accept Supabase recovery/signup/magic-link/invite/email-change hash sessions instead of only custom `vault_access`.
- Added regression coverage for account email actions and recovery-token session handling in `src/__tests__/auth.test.js`.
- Softened over-prominent “single VaultSpark membership / all Studio tools” claims in the auth modal, app shell, README, and landing copy. Current copy promises PromoGrind account sync/access and says connected VaultSpark access appears only where it is enabled.
- Added `scripts/validate-auth-launch-smoke.mjs` (`npm run smoke:auth`) and wired it into `npm run verify:launch-local`.
- Extended launch/browser smoke markers so confirmation resend, forgot password, and update-password UI cannot regress silently.
- Updated `run-friend-beta-checklist.mjs`, `context/LAUNCH_PROOFS.json`, and `docs/LAUNCH_CHECKLIST.md` so the trusted tester pass now includes confirmation-email or password-reset recovery visibility.
- `npm run verify:launch-local` passed end-to-end on 2026-05-13: 396/396 tests, hook-order guard, auth smoke, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization.

## Verification (Session 85)

- `npx vitest run src/__tests__/auth.test.js` — 38/38 passing.
- `npm run build` — passing.
- `npm test` — 396/396 passing.
- `npm run smoke:auth` — passing.
- `npm run smoke:launch` — passing.
- `npm run beta:check -- --print` — prints recovery-aware friend beta checklist.
- `npm run verify:launch-local` — passing end-to-end.
- `npm run launch:status -- --fast` — PARTIAL, with only 3 manual proof blockers pending.

## What is mid-flight

- Deploy S85 to production, then run a real auth email smoke: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/recovery/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`).
- Continued `src/App.jsx` decomposition remains valuable; App.jsx still carries several large inline surfaces.

## What to do next

1. Let GitHub Pages deploy S85, then run the production auth email smoke and ingest the deploy artifact with `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with a trusted tester after deploy.
3. Complete `npm run smoke:stripe -- --record` with one real checkout when operator is ready.
4. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
5. Continue extracting another `src/App.jsx` seam once launch proof is no longer the active bottleneck.

## Constraints

- Do not fabricate sportsbook affiliate links, Stripe evidence, friend-beta evidence, or production email-delivery evidence.
- Local tests prove the Supabase client calls and UI routing; production email delivery still requires live Supabase/SMTP behavior after deploy.
- Public repo remains proprietary by default under CANON-008.

---

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
