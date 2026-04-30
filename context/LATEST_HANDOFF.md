# Latest Handoff

Last updated: 2026-04-30 (S81)
Session: 81
Session Intent: Implement the 7-item next-highest-impact list (Stripe smoke runner, friend beta runner, Vitest full-suite timeout fix, post-deploy launch-verification ingester, App.jsx decomposition, PostHog console hygiene, affiliate-link gate honesty), then fix external launch blockers we could reach from the repo, close out, write back all canonical surfaces, commit, and push.
Intent Outcome: Achieved for repo-controllable work. All 7 items shipped at quality bar, full test suite went from 380/382 (with timeouts) to 392/392 in ~95s, `SUPABASE_SERVICE_ROLE_KEY` synced to GitHub Actions secrets and redeploy triggered, scripted runners are ready for the operator-side Stripe smoke + friend beta passes.

## Where We Left Off (Session 81)

- Vitest config and `src/__tests__/calculators.test.jsx` hardened so `npm test` runs the full suite green (392/392) without parallel-worker import timeouts; calculator dynamic imports hoisted to static module-top imports.
- `src/analytics.js` PostHog init now disables remote feature-flag polling, decide endpoint, and toolbar metrics, and forces `debug(false)` in production via the `loaded` callback so launch consoles stay signal-rich.
- New post-deploy launch-verification ingester (`scripts/ingest-launch-verification.mjs`, `npm run ingest:launch`) pulls the latest GitHub artifact via `gh` CLI and writes `artifacts/launch-verification/post-deploy.{md,json}` without ever overwriting `context/LAUNCH_PROOFS.json` manual truth. First live run surfaced the missing `SUPABASE_SERVICE_ROLE_KEY` GitHub secret as a real launch-blocking signal.
- `parseBetSlip` extracted from `src/App.jsx` to `src/app/parseBetSlip.js` with full regression coverage in `src/__tests__/parseBetSlip.test.js` (10 cases). App.jsx import added; inline definition replaced with a one-line pointer comment.
- New scripted operator runners landed: `scripts/run-stripe-smoke.mjs` (`npm run smoke:stripe`, walks the 8-step Stripe smoke checklist and records to `LAUNCH_PROOFS.json[stripeSmoke]` with `--record`) and `scripts/run-friend-beta-checklist.mjs` (`npm run beta:check`, walks tester through auth/calculator/CTA/pricing/trust with friction capture, records to `LAUNCH_PROOFS.json[friendBeta]` with `--record`).
- New secret-sync helper (`scripts/sync-github-secrets.mjs`, `npm run sync:secrets`) pushes admin keys from local `.env.admin` to GitHub Actions secrets via `gh secret set`; used this session to set `SUPABASE_SERVICE_ROLE_KEY` and trigger a deploy redeploy via `gh workflow run deploy-pages.yml`.
- Verification this session: `npm test` (392/392), `npm run build` (clean ✓ built in ~17–37s), `npm run smoke:browser` (passed), `npm run smoke:ux` (60 routes / 98 public HTML files passed), `node scripts/check-public-repo-sanitization.mjs --strict` (0 critical / 0 warning), `node scripts/ingest-launch-verification.mjs --dry-run` (live-tested against deploy run 25092934446 and surfaced env gap).
- Operator confirmed in-session: applied for everything affiliate-side that's possible. Remaining required-launch-monetization gap for `BetMGM`, `bet365`, `BetRivers` is partner-approval, not a repo task.

## What was completed

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

- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase against deployed app — runner is ready (`npm run smoke:stripe`); pending operator + Stripe live key configuration in Supabase secrets.
- Friend-facing auth/calculator/CTA/pricing pass — runner is ready (`npm run beta:check`); pending operator + one trusted tester.
- Founder reported "errors on the dashboard" at the end of S81 — not yet diagnosed; my S81 changes are uncommitted at the time of that report so the live errors predate this session and need explicit error-text capture (DevTools console) or a headless scan to fix.
- Continued `src/App.jsx` decomposition beyond `parseBetSlip`/`AppChrome`/`appText`/`AppNotifications`/community-promos route is still worthwhile; App.jsx still ~4300 lines.

## What to do next

1. Capture the founder-reported dashboard error text (DevTools console at `https://promogrind.bet/dashboard`) or wire a headless puppeteer/playwright scan, then root-cause + fix.
2. After the next deploy lands, run `npm run ingest:launch` and confirm `post-deploy.json` shows `ok: true`.
3. Run `npm run smoke:stripe -- --record` once Stripe live keys are in Supabase secrets and the operator can complete one real checkout.
4. Run `npm run beta:check -- --record` with one trusted tester after deploy.
5. Continue extracting another `src/App.jsx` seam (candidates: `EmailCapture`, `SessionModal`, `Glossary`, `PromoCalendar`).
6. Monitor PostHog console in production after the redeploy lands to confirm noise reduction.

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
