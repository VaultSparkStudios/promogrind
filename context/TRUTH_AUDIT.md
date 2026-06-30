<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-06-18 (S96)
Overall status: green
Next action: inspect the green GitHub Pages launch-verification artifact from run `27791869430`, run production auth email smoke, then complete the two remaining external manual proofs (Stripe smoke and friend beta). Refresh stale revenue and IGNIS derived intelligence after the proof pass.
Production deploy host: **GitHub Pages** (verified S83 via `x-github-request-id` header + Fastly via Varnish + `public/CNAME`). Cloudflare is DNS-only proxy. SPA fallback handled via `scripts/postbuild-pages.mjs` copying `dist/index.html → dist/404.html`. `_redirects` and `wrangler.toml` are NOT used by the live deploy chain.

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Generated contracts, runtime pack, startup brief, and other derived status surfaces

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 5 | `CURRENT_STATE.md`, `LATEST_HANDOFF.md`, `TASK_BOARD.md`, `LAUNCH_PROOFS.json`, `PROJECT_STATUS.json`, generated launch-proof mirror, and AI usage ledger agree that S87 repo-owned work advanced while remaining launch blockers are external proof tasks. |
| Prompt/template alignment | 4 | Canonical templates are aligned; the public/private repo shim tension is documented instead of treated as product truth drift. |
| Derived-view freshness | 5 | Startup brief, task board, launch proof mirror, AI usage ledger, handoff, current state, SIL, and closeout surfaces describe the same S87 posture after closeout generation. |
| Handoff continuity | 5 | Session 87 handoff reflects shipped repo-local work, verification status, and the remaining external blockers. |
| Contradiction density | 5 | No current product-truth contradiction is known; the main gaps are explicit external evidence gates. |
| **Total** | **24 / 25** | Green: canonical truth surfaces are coherent; remaining yellow posture is due to external launch proofs and public/private ops shim tension, not contradictory product claims. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Auth/recovery launch truth | `src/auth.js` + `src/components/AuthDialog.jsx` + `scripts/validate-auth-launch-smoke.mjs` | `verify:launch-local`, launch smoke, browser smoke, friend-beta proof guide | green | 2026-05-13 | S85 adds confirmation resend, forgot-password reset, recovery-link update-password, and release-gate smoke coverage; production email delivery still needs live manual proof after deploy. |
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | green | 2026-06-18 | PromoGrind status reflects `FORGE`, public-unlaunched, S96 deploy verification green, S95 dependency/security verification, and unchanged external proof blockers. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-06-18 | S96 write-back aligns state, handoff, task board, work log, project status, SIL, and CDR around the same Supabase deploy-green continuation. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-23 | Manifest remains the source of capability truth; contract generation now reads status via the shared helper. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-23 | Derived IGNIS surfaces still agree on `47857 FORGE` pending the next refresh cycle. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | green | 2026-04-24 | Launch gate and UX smoke now give next-session startup a clearer readiness baseline. |
| Launch-proof truth | `context/LAUNCH_PROOFS.json` + `scripts/update-launch-proof.mjs` + `scripts/verify-production-launch.mjs` + live Supabase/GitHub config | `docs/LAUNCH_CHECKLIST.md`, `context/TASK_BOARD.md`, handoff docs, deploy artifacts, `launch:status` | yellow | 2026-06-18 | Proof updates remain evidence-gated; S89 decoupled partner-blocked sportsbook tracking URLs from launch readiness, but real Stripe smoke and friend beta with account-recovery visibility remain incomplete. |
| In-app launch proof mirror | `context/LAUNCH_PROOFS.json` + `scripts/generate-launch-proof-mirror.mjs` | `src/data/launchProofs.generated.js`, Launch Command Center | green | 2026-05-14 | S87 generated a browser-safe proof mirror so command-center UI matches canonical evidence requirements without exposing private ops fields. |
| Operator intelligence | `src/dashboard/today.js` + workflow store + feedback ledger | Dashboard hero, Smart Promo Recommender, Today dashboard | green | 2026-05-14 | S87 adds Operator Autopilot, discipline scoring, and outcome-memory recommendation explanations from settled samples/repeat behavior. |
| AI usage/cost truth | `supabase/functions/promo-advisor/index.ts` + `scripts/render-ai-usage-ledger.mjs` | `docs/AI_USAGE_LEDGER.md`, `npm run ai:usage` | green | 2026-05-14 | S87 records rule-engine wins and token estimates; live query depends on Supabase admin env, offline render is deterministic. |
| Production dashboard/runtime | `npm run smoke:production-dashboard` + `src/App.jsx` + deploy artifacts | task board, handoff, launch status | yellow | 2026-05-13 | Local S85 launch gate is green; next deploy artifact should be ingested to confirm production runtime/auth behavior after push. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-06-18 | S95 all-tree and staged secret scans report 0 findings; `package-lock.json` SRI hashes are allowlisted as non-secret integrity metadata. |
| Dependency and package trust | `package-lock.json` + `scripts/package-trust.mjs` + `scripts/scan-npm-supply-chain.mjs` | `npm audit`, Dependabot alerts, task board, handoff | green | 2026-06-18 | `npm audit` reports 0 vulnerabilities, GitHub Dependabot open alerts are 0, and lockfile supply-chain scan has 0 blocking findings. |
| VaultSpark website listing | `context/PROJECT_STATUS.json` + `context/STUDIO_MANIFEST.json` | `vaultsparkstudios.com/projects/promogrind/` | green | 2026-04-24 | Website copy now says deployed/FORGE/public-unlaunched, 53 calculators, beta-gated paid/AI surfaces, and points CTA traffic to `https://promogrind.bet/`. |
| Public trust copy | `src/analytics.js` + public pages | `/privacy/`, `/data-policy/` | green | 2026-04-28 | Privacy/data-policy pages now describe the PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims. |
| Protocol FAQ cache | `docs/SESSION_PROTOCOL.md` + `AGENTS.md` | `docs/PROTOCOL_FAQ.md`, `ops.mjs ask --list` | green | 2026-04-28 | Cached public-safe protocol Q&A exists and `node scripts/ops.mjs ask --list` returns populated entries. |

---

## Current Contradictions

- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.
- Production auth email delivery is unproven until the latest deploy is checked with a real confirmation/reset email pass.
- Genius List cache can become stale after closeout because status/context files are updated; refresh it at the next `/start` or `/go`.

## Resolved This Session (S96)

- Verified the Studio Supabase secrets path and avoided the wrong shared project: PromoGrind deploys to `fjnpzjjyhnpmunfoycrp`, not `ckwtolofoqzrqouqkmvs`.
- Redeployed production `create-checkout`; `node scripts\verify-production-launch.mjs` now reports `create-checkout` 200 for `scout_monthly` and 0 blocking failures.
- Manual Deploy Pages run `27791869430` passed, so the prior deploy-health blocker is cleared.

## Resolved This Session (S95)

- Cleared npm dependency vulnerability truth: `npm audit --json` reports 0 total vulnerabilities after the lockfile update.
- Restored full local verification truth: `npm run verify:launch-local` passed end to end with 500/500 tests.
- Restored all-tree secret-scan truth: stale ignored `dist-cap` JWT-like artifacts were regenerated and `node scripts/scan-secrets.mjs --all` reports 0 findings.
- Added package trust truth: `scripts/package-trust.mjs` is the repo-local public-safe fallback for npm package/download review before future installs.
- Added lockfile supply-chain truth: `scripts/scan-npm-supply-chain.mjs` reports 0 blocking findings on the current lockfile and surfaces only review-level lifecycle-script packages.
- Dependabot truth: GitHub reports 0 open Dependabot alerts.
- S94 caveat resolved: dependencies are no longer absent and package-trust automation is no longer missing from this public repo.

## Resolved This Session (S88)

- Created `docs/AUDIT_2026-05-17.md` with a compact ranked plan across gamification/UX, security/trust, release hardening, feedback loops, and token/API cost.
- Added a 14-day Operator Season rail above daily missions, scored from closed loops, repeat feedback, bankroll context, and open-bet cleanup rather than bet volume.
- Added Profile local data export and clear-local controls, with helper coverage for tracked browser storage inventory.
- Added `scripts/check-public-dist-exposure.mjs` and wired it into `verify:launch-local`; the gate caught legacy `dist/vault-sdk.js` exposure, so the public `vault-sdk.js` asset and `index.html` reference were removed.
- Extended friend-beta recorded evidence into `docs/BETA_FEEDBACK.md` with friction tags.
- Added AI usage ledger rendering to `verify:launch-local` and replaced the lingering Supabase client process with direct PostgREST fetch.
- Verified `npm run verify:launch-local` green end to end with 409/409 tests, AI ledger render, hook-order guard, auth/launch/UX/browser smokes, public dist exposure, bundle budget, and strict public-repo sanitization.

## Resolved This Session (S87)

- Created `docs/AUDIT_2026-05-14.md` with one ranked improvement list across product depth, UI/UX, gamification, AI, security, speed/organization, and API/token consumption.
- Generated a browser-safe launch-proof mirror from `context/LAUNCH_PROOFS.json` and wired Launch Command Center to proof statuses, evidence requirements, and next steps.
- Added Operator Autopilot to the dashboard, preferring the top workflow and falling back to next-best dashboard action routing.
- Added local trust receipts for sensitive auth, billing, AI, push, and sync events, with recent receipts visible in Profile.
- Added discipline scoring to the dashboard hero so closed loops and lower unresolved exposure matter more than raw activity.
- Added outcome-memory recommendation signals from hot lanes, cold drift, settled samples, repeat intent, and execution behavior.
- Added `npm run ai:usage`, generated `docs/AI_USAGE_LEDGER.md`, and recorded promo-advisor rule-engine/token metadata for AI cost visibility.
- Verified focused outcome-memory tests and AI ledger offline rendering; full closeout verification reruns before push.

## Resolved This Session (S86)

- PromoGrind create-account/sign-up copy is now explicitly separate from Studio membership across auth modal, member welcome, footer access, profile/account help, Terms, Privacy, Data Policy, and generated static public trust copy.
- Removed the user-facing Vault member portal link from account/profile surfaces and deleted the now-unused `VAULT_ACCOUNT_PORTAL_URL` export.
- Removed a staged secret-scan finding by replacing the static Creator Program's browser-embedded Supabase JWT submission path with a credential-free mailto application path.
- Updated `src/auth.js` comments/log prefixes to describe PromoGrind account auth instead of shared Vault identity auth.
- Expanded `npm run smoke:auth` so Vault account/membership, cross-Studio sync, and connected-VaultSpark-tool claims cannot return on account-facing surfaces.
- Verified `npm run smoke:auth`, `npm run smoke:launch`, `npm run build`, and `npm test` (396/396) after the account-copy split.

## Resolved This Session (S85)

- Added resend-confirmation, forgot-password, and update-password recovery flows to the PromoGrind auth modal.
- Broadened Supabase hash-session handling so recovery/signup/magic-link flows can establish sessions.
- Added auth regression tests for confirmation/reset redirect behavior and recovery-token session handling.
- Added `npm run smoke:auth` and wired it into `verify:launch-local`.
- Extended launch/browser smoke checks for auth recovery UI markers.
- Updated friend-beta proof requirements to include account creation/sign-in plus confirmation-email or password-reset recovery visibility.
- Softened over-prominent cross-Studio membership claims until live cross-project behavior is proven.
- Verified `npm run verify:launch-local` green end-to-end with 396/396 tests.

## Resolved This Session (S82)

- Added `npm run smoke:production-dashboard` to capture live dashboard console/runtime errors through Chrome DevTools Protocol.
- Used the new smoke to capture the founder-reported live dashboard crash (`syncDiagnostics is not defined`) and fixed the source path in `DailyDashboard`.
- Added `npm run launch:status` so local launch gate, production dashboard smoke, artifact ingest, and manual proof guide can be run from one command.
- Extracted profit milestone/goal notifications from `src/App.jsx` into `src/app/useProfitNotifications.js`.
- Re-ingested deploy artifact run `25181776729`; Supabase/VAPID/signup/billing/checkout/customer-portal checks pass, with only affiliate/required monetization checks red.
- Verified `npm run verify:launch-local` green end-to-end (`392/392`, launch smoke, UX route integrity, browser smoke, bundle budget, strict public-repo sanitization).

## Resolved This Session (S91)

- S90 operator-intelligence primitives are now wired into product UI: Today Operator Briefing, share briefing card, Smart Promo terms/deadline signals, Tracker conflict guard, and Profile Kelly Sandbox.
- `docs/AUDIT_2026-05-18.md` and `docs/IMPLEMENT_PLAN.md` now record the S91 audit/implementation contract and execution evidence.

## Resolved This Session (S94)

- Startup brief truth changed: SIL forecast no longer predicts `0/1000`; `scripts/lib/sil-forecaster.mjs` now parses the actual category-table format and regenerated `docs/STARTUP_BRIEF.md` shows a stable/rising forecast.
- Closeout board truth changed: `scripts/render-closeout-board.mjs` now includes `PROJECT_STATUS.liveUrl`, so the closeout board exposes `https://promogrind.bet` instead of hiding the live project URL.
- Audit truth changed: `docs/AUDIT_2026-06-18.{json,md}` is the current S94 audit artifact; `docs/IMPLEMENT_PLAN.md` records the S94 wave plan and verification bundle.
- Doctor truth: live doctor remains 10/12; remaining non-green signals are stale revenue and stale IGNIS derived surfaces, not local implementation blockers.
- Verification caveat: full app tests were not run in S94 because `node_modules` is absent and the repo-local package-trust script is missing; installing dependencies was intentionally skipped.

## Resolved This Session (S92)

- Verified the active `/start` -> `/audit` -> `/implement` -> `/closeout` objective against concrete repo artifacts instead of re-running completed implementation work.
- Confirmed `docs/AUDIT_2026-05-18.md` execution log marks all 6 S91 items shipped.
- Confirmed `docs/IMPLEMENT_PLAN.md` records the S91 optimal order and completion evidence.
- No product-code truth changed in S92; the remaining truth gap is still external/manual proof evidence after deploy.
- Verification truth: `npm run verify:launch-local` passed end to end with 450/450 tests, AI usage ledger, hook guard, auth/launch/UX/browser smokes, public dist exposure, replay proofs, bundle budget, and strict public-repo sanitization.
- Remaining launch truth is unchanged and external/manual: real production auth email proof, Stripe smoke purchase, and friend-beta evidence still need recording before public announcement.

## Resolved This Session (S80)

- Added `docs/PROTOCOL_FAQ.md` with 10 public-safe session-protocol Q&A entries.
- Restored `node scripts/ops.mjs ask --list` to a populated protocol FAQ output.
- Updated public `/privacy/` and `/data-policy/` copy to match the actual PostHog/Sentry analytics and diagnostics stack.
- Produced the S80 project audit plan covering UI/UX, engagement, AI, security, performance, organization, and API/token efficiency.
- Verified UX route integrity, strict public-repo sanitization, protocol FAQ listing, and Studio doctor.

## Resolved This Session (S79)

- Added `nextStep` and `evidenceRequired` launch-proof metadata for affiliate links, Stripe smoke, and friend beta.
- Added `node scripts/update-launch-proof.mjs --list --guide` so manual proof requirements can be printed without editing JSON.
- Made scanner/community workflow suggestions deterministic with stable IDs/source IDs.
- Hardened workflow upserts so duplicate queued suggestions do not downgrade progressed workflow state.
- Added activation-funnel and required launch-link observability to the dashboard operator readout.
- Routed `Community Promos` to the extracted board component instead of the stale inline `src/App.jsx` implementation.
- Verified targeted tests, isolated calculator tests, production build, launch smoke, UX integrity, bundle budget, and strict public-repo sanitization.

## Resolved This Session (S78)

- Normalized calculator, tracker, and shadow-book sportsbook CTA analytics onto `getBookLinkMeta` / `getBookLinkAnalyticsProps`.
- Added `adaptiveRankingSnapshot` so dashboard ranking decisions expose top promo, reason counts, hot/cold signals, queue pressure, and feedback coverage.
- Extracted checkout-unavailable notification handling into `src/app/AppNotifications.jsx`, reducing `src/App.jsx` shell responsibility.
- Hardened `scripts/update-launch-proof.mjs` with `--list`, status validation, and evidence-required proof completion.
- Verified `npm run verify:launch-local` green with `381/381` tests, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization.

## Resolved This Session (S77)

- Added `npm run verify:launch-local` as the canonical local readiness gate.
- Added UX route integrity validation for app route slugs, public HTML links, required public pages, responsible-gambling copy, and free-account copy.
- Fixed browser smoke port allocation so stale local preview processes do not create false failures.
- Fixed Stripe readiness fallback and public-repo sanitization behavior for standalone public repo mode.
- Refreshed Missouri legal/SEO copy and release docs to match current facts and `380/380` test truth.
- Synced VaultSpark website PromoGrind project copy/status/CTAs to current deployed/FORGE/public-unlaunched truth and cleared website project-info P1 drift.

## Resolved This Session (S74)

- Added `context/LAUNCH_PROOFS.json` as the canonical machine-readable surface for manual launch blockers.
- Taught `scripts/check-launch-ready.mjs` to treat pending launch proofs as partial readiness instead of reporting PromoGrind as launch-ready while manual blockers remain.
- Tightened `scripts/verify-production-launch.mjs` and `src/books.js` so launch monetization truth now fails on the exact missing books (`BetMGM`, `bet365`, `BetRivers`) and rejects generic partner/signup URLs as fake tracked links.
- Added a deploy-time `launch-verification` artifact path in `.github/workflows/deploy-pages.yml` so post-push verification produces a retained summary instead of local console output only.
- Extracted `AppChrome`/`appText` from `src/App.jsx` and fixed several public-facing mojibake/copy issues without changing the external blocker truth.

## Resolved This Session (S73)

- Patched the GitHub Pages deploy workflow so push rollout now reads both `VITE_VAPID_PUBLIC_KEY` and `VITE_PG_FEATURE_PUSH_ALERTS` from Actions secrets.
- Tuned adaptive mission-control ranking so expiring value outranks non-urgent backlog while hot/cold lane signals and backlog pressure are surfaced explicitly.
- Moved more repo-facing scripts (`render-fast-start`, `render-action-queue`, `render-founder-control`, `generate-project-contracts`, `closeout-autopilot`) onto the shared context parser.
- Refreshed Session 73 repo truth after a green verification pass (`375/375` tests and production build passing).

## Resolved in S72

- Added adaptive dashboard intelligence, richer feedback telemetry, and shared AI response caching while keeping tests/build green.
- Reconciled live Supabase migration history, pushed a live schema-repair migration, and verified PostgREST access to the workflow/entity/feature-flag tables.
- Redeployed browser-invoked billing and beta edge functions with compatible JWT gateway settings; live `create-checkout` now succeeds.
- Wired VAPID truth across local env, GitHub Actions secrets, and Supabase secrets; patched the Pages workflow to consume `VITE_VAPID_PUBLIC_KEY`.
- Refreshed task/release/handoff surfaces so the sole remaining blocker is honest affiliate-link inventory rather than stale production failures.

## Resolved in S69

- Added gamification source modules (`src/lib/mastery.js`, `src/lib/achievements.js`, `src/lib/missions.js`) — new canonical sources for engagement data.
- Added `flagVisit` helper and wired all 4 previously un-completable mission check flags.
- Untracked `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, `scripts/soul-interview.mjs` from git; added to `.gitignore`. Public-repo sanitization scan now clean.
- Refreshed handoff, work log, decisions, SIL, and state surfaces to describe S69.
## 2026-04-23 (S75) — runtime + routing truth refresh

- Root-path truth changed: `/` is now the marketing landing surface, not the immediate app shell. App-entry truth for public CTAs is `/dashboard`.
- Runtime truth changed: the missing `ParlayHedge` route was a real boot blocker and is now restored with a concrete calculator module.
- Service-worker truth changed: `public/sw.js` now guards cache writes against consumed/opaque responses, matching the production console failure that previously occurred.
- Remaining noise is honestly classified as non-blocking: browser-extension messages and PostHog remote-config/feature-flag failures are still visible in production but were not the cause of the app failing to boot.

## Session 97 Truth Update - 2026-06-29

- Auth/recovery launch truth is stronger but still honest: `authEmailSmoke` is now a canonical launch proof with an executable redacted runner; status remains pending until real production email delivery is recorded.
- Launch Command Center truth now prioritizes the proof sequence from canonical launch proofs instead of stale hardcoded blocker keys.
- Supabase deploy capability mapping is not complete in this repo; Ark cargo `01JSAF1R02AEA5B6F3FE74C3B4` asks Studio Ops to add the capability in the correct control plane.
- Verification truth: `npm test` passed 501/501 and `npm run verify:launch-local` passed end to end on 2026-06-29.

## Session 98 Truth Update - 2026-06-29

- Launch Command Center blocker truth now derives from canonical `context/LAUNCH_PROOFS.json` through `getLaunchProofCommandItems`; legacy `LAUNCH_BLOCKERS` no longer overrides proof status in the dashboard panel.
- Affiliate coverage truth is advisory when `blocking: false`; the command center no longer presents partner-blocked nonblocking coverage as a manual launch blocker.
- AI cost/calibration truth improved: Advisor/Chat cache hit/miss paths now update prompt-cache stats, and saved Advisor workflows create calibration predictions instead of leaving the calibration module decorative.
- Operator risk truth improved: Today Dashboard now renders real bankroll stress/pre-mortem/twin-battle signals from source data rather than leaving those engines library-only.
- Verification truth: `npm test` passed 502/502 and `npm run verify:launch-local` passed end to end on 2026-06-29.

## Session 99 Truth Update - 2026-06-29

- Public reachability truth improved: `/contact/` is exposed from the app footer and `public/sitemap.xml`.
- Dual-audience truth improved: `public/agents.json` and `public/.well-known/llms.txt` now exist and are required by `scripts/validate-ux-route-integrity.mjs`.
- Canon adoption truth improved: `context/CANON_ADOPTION.md` now exists after the startup adoption check reported it missing.
- Email delivery truth remains yellow: `contact@promogrind.bet` is visible in public surfaces, but Brevo forwarding/copy is not proven locally. Ark cargo `01JSAJMBF321A097D8CE8E12B9` requests Studio Ops verification.
- Verification truth: `npm run verify:launch-local` passed end to end with 502/502 tests, and doctor passed 12/12 with `blockingFailing: 0` on 2026-06-29.

## Session 100 Truth Update - 2026-06-30

- App composition truth improved: `src/App.jsx` no longer owns navigation/search, CSV import, dashboard widget, or state-legal alert component definitions; `appComposition.test.js` enforces those boundaries and the <3500-line ceiling.
- State-legal truth improved: Missouri is treated as launched on `2025-12-01`, matching the Missouri public page, not as a coming-soon state.
- Runtime truth improved: `App.jsx` now explicitly imports `US_BOOK_STATES` from `src/books.js` before using it in Deposit Optimizer and Promo Guarantee filters.
- Verification truth: `npm test` passed 508/508 and `npm run verify:launch-local` passed end to end on 2026-06-30.
- External proof truth remains yellow: auth email, Stripe smoke, friend beta, and Brevo forwarding still require real evidence.

## Session 101 Truth Update - 2026-06-30

- App composition truth improved: `src/App.jsx` no longer owns the glossary route component or term list; `src/components/Glossary.jsx` is the source for that surface.
- Regression truth improved: `appComposition.test.js` now blocks `Glossary` and `GLOSSARY_TERMS` from returning to the App monolith.
- Verification truth: `npm test` passed 508/508 and `npm run verify:launch-local` passed end to end on 2026-06-30.
- External proof truth remains yellow: auth email, Stripe smoke, friend beta, and Brevo forwarding still require real evidence.

## Session 101 Deploy-Fix Truth Update - 2026-06-30

- Production dashboard smoke truth changed from red to fixed locally: GitHub Pages run 28415945042 exposed `ReferenceError: useRef is not defined` on `/dashboard`.
- Source truth: `src/App.jsx` uses `useRef` in App-owned surfaces and now imports it from React.
- Verification truth: `npm run verify:launch-local` passed end to end after the import fix on 2026-06-30.

## Session 102 Truth Update - 2026-06-30

- App composition truth improved: `src/App.jsx` no longer owns Knowledge Base/FAQ, Profit Certificate, Vault Points Leaderboard, or Daily Streak implementation logic; each surface now has a dedicated `src/components/` module.
- Regression truth improved: `appComposition.test.js` now blocks those surfaces from returning to the App monolith and enforces a <3100-line ceiling. Current App.jsx line count is 2807.
- Verification truth: `npm test` passed 508/508 and `npm run verify:launch-local` passed end to end on 2026-06-30.
- External proof truth remains yellow: auth email, Stripe smoke, friend beta, Brevo forwarding, and Studio Ops Supabase capability proof still require real evidence/action.
