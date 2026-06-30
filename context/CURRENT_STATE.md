# Current State

Last updated: 2026-06-18 (S96)

## Snapshot

- Date: 2026-06-18
- Overall status: deployed product with S96 closeout complete and production deploy verification green. S95 cleared the S94 verification caveat by restoring dependencies, running `npm audit fix --package-lock-only`, confirming `npm audit` reports 0 vulnerabilities, regenerating the ignored `dist-cap` build after stale ignored JWT artifacts triggered the all-tree secret scan, and running `npm run verify:launch-local` end to end with 500/500 tests. Repo-local supply-chain tooling now exists: `scripts/package-trust.mjs` gates future package/download additions with npm metadata checks, and `scripts/scan-npm-supply-chain.mjs` scans the lockfile for non-registry tarballs, missing integrity, and lifecycle-script review items. Dependabot open alerts were checked through GitHub and are 0. S96 follow-up used the Studio Supabase PAT from `vaultspark-studio-ops/secrets`, explicitly targeted PromoGrind project `fjnpzjjyhnpmunfoycrp` rather than the other shared Studio Supabase project, redeployed `create-checkout`, verified production `scout_monthly` checkout returns 200, and manually reran Deploy Pages as green run `27791869430`. Prior S94/S95 truth-surface fixes remain: SIL forecast parser reads the actual category-table format, closeout board surfaces `https://promogrind.bet`, dashboard-smoke artifacts parse cleanly, and startup/brief/doctor surfaces are verified.
- Prior status (S93): deployed product with S93 audit/implement/closeout sprint complete. Audit produced a 10-item plan (Combined Priority 319.9); all 10 items shipped as new pure libs + minimal UI surfaces: recommender ExplainerDrawer, calculator→Tracker workflow handoff, prompt-cache layer with hit-rate telemetry, mistake-memory loop with no-shame chip, AI calibration tracker (Brier per source), 3-way counterfactual twin battle, deterministic bankroll stress test (Mulberry32 Monte Carlo), live edge-decay heatmap, hash-linked promo provenance receipts (HMAC + PII strip), and bankroll-threshold pre-mortem. Test suite was 500/500 (up from 450 — 50 net-new tests). `npm run verify:launch-local` passed end to end with one pre-existing hygiene-band path warning on `.mcp.json`.
- Prior status (S90): deployed product with S90 audit/implement/closeout sprint complete — shipped 7 of 12 core modules layering on S89 infrastructure: counterfactual P&L ribbon, decision journal autogen, terms-drift detector, edge half-life scheduler, promo conflict detector, Kelly-fraction sandbox, and zero-PII share card. Suite is now 450/450 (up from 430). UI wiring deferred to S91 thin-integration pass. Below preserves S89 narrative.
- Overall status (S89): deployed product with S89 audit/implement/closeout sprint complete — shipped 9 of 10 audit items focused on temporal intelligence, counterfactual learning, and anti-tilt safety: tilt circuit breaker, ablation-based promo explainer ("why ranked #N"), EV decay radar, operator twin drift forecast, 14-day adversarial receipt replay, HMAC-signed public operator passport, launch-proof resilience replay, calculator pre-warm, and weekly AI budget self-binding. Suite is now 430/430 (up from 409). S88 audit/implement/closeout sprint complete: added an Operator Season rail over daily missions, Profile local data export/clear controls, a public `dist/` exposure gate wired into `verify:launch-local`, friend-beta feedback summary generation, and a cleaner AI usage ledger renderer. The new dist gate caught and drove removal of the legacy public `vault-sdk.js` cross-project membership SDK/reference, preserving the S86 PromoGrind-only account boundary. S87 launch proof mirror, Operator Autopilot, trust receipts, discipline scoring, outcome-memory recommendations, and AI usage ledger remain intact. Closeout verification in S88 passed `npm run verify:launch-local` end to end with 409/409 tests. Production host remains GitHub Pages (Cloudflare is DNS-only proxy).
- Current phase: public-unveil launch hardening with S90/S91 operator-intelligence now user-visible; external proof cleanup remains.
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with 53 calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Public entry routing: `/` now serves the landing experience first, while the app shell is reached intentionally via `/dashboard` and explicit app/signup CTAs
- Launch validation: `npm run verify:launch-local` runs unit/component tests, AI usage ledger rendering, hook-order guard, auth launch smoke, launch smoke, UX route integrity, browser smoke, public dist exposure scan, bundle budget, and strict public-repo sanitization; S88 verification passed end to end with 409/409 tests
- Auth/account recovery (S85/S86): `AuthDialog` now exposes resend confirmation email, forgot-password reset email, and recovery-link password update flows; `src/auth.js` accepts Supabase recovery/signup/magic-link hash sessions and sets explicit confirmation/reset redirects; S86 copy now states that creating a PromoGrind account does not create or require Studio membership
- Account/membership separation (S86): PromoGrind account surfaces, profile/account help links, terms/privacy/data-policy pages, and generated public trust strips now use PromoGrind account language instead of Vault account/membership or cross-Studio sync promises
- Static public-page credential hygiene (S85/S86): `public/the-grind/` and `public/creator-program/` no longer embed Supabase JWTs in browser HTML; both use credential-free mailto paths until proper public-safe capture endpoints are available
- Production dashboard smoke (S82/S95): `npm run smoke:production-dashboard` launches a Chromium-family browser via Chrome DevTools Protocol and captures runtime exceptions / console errors against `https://promogrind.bet/dashboard`; the Deploy Pages workflow now runs it with `npm run --silent` so the JSON artifact remains parseable, and the validator ignores only the exact generic GitHub Pages SPA fallback 404 console line.
- Launch posture command (S82): `npm run launch:status` orchestrates the local launch gate, production dashboard smoke, post-deploy artifact ingestion, and manual proof guide; `--fast` can print proof-only status without expensive checks
- UX route integrity: `scripts/validate-ux-route-integrity.mjs` checks 60 app routes, 98 public HTML files, required public pages, internal links, responsible-gambling copy, and free-account launch copy
- Cross-repo public marketing sync: `vaultsparkstudios.com/projects/promogrind/` now describes PromoGrind as deployed/FORGE/public-unlaunched with 53 calculators, beta-gated paid/AI surfaces, real `https://promogrind.bet/` CTAs, and no stale creator-dashboard claims
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking, plus S87 discipline scoring that rewards settled outcomes, repeatable lanes, and lower unresolved exposure
- Operator season loop (S88): `src/lib/seasons.js` builds a 14-day discipline season from closed-loop settlements/skips, repeat feedback, bankroll context, and open-bet cleanup; `DailyMissionsPanel` now shows season score/progress above daily missions without rewarding raw bet volume
- Operator loop (S87): `TodayDashboardPanel` now surfaces an Operator Autopilot card that routes the user to the best immediate action, while `SmartPromoRecommender` explains outcome-memory signals from hot lanes, cold drift, settled samples, and repeat/execution behavior
- Operator intelligence UI (S91): `TodayDashboardPanel` now includes an Operator Briefing ribbon that combines the S90 counterfactual P&L engine and decision journal, plus a zero-PII "Share briefing" canvas-card action.
- Promo safety UI (S91): `SmartPromoRecommender` now surfaces local `TERMS CHANGED` drift pills and edge-floor execution deadlines next to existing EV-decay sparklines and why-ranked explanations.
- Tracker safety UI (S91): `Tracker` now derives active promo candidates from open bets/workflows and renders promo-conflict guardrails for rollover, qualifier, and max-payout collisions.
- Profile learning UI (S91): `ProfilePanel` now includes a Kelly Sandbox section that replays settled history against quarter/half/full Kelly sizing.
- Trust loop (S87): local trust receipts record sensitive account, billing, AI analysis, push subscription, and cloud-sync moments; Profile surfaces the latest receipts so users can see what the app did on their behalf
- Data controls (S88): Profile includes local export and clear-local-data controls powered by `src/lib/dataControls.js`, giving users an immediate control path for browser-stored PromoGrind data while keeping preferences by default
- Launch command center (S87): the browser reads `src/data/launchProofs.generated.js`, generated from `context/LAUNCH_PROOFS.json`, so proof statuses/evidence requirements/next steps stay aligned with repo truth without exposing private ops state
- AI cost/usage (S87/S88): `npm run ai:usage` renders `docs/AI_USAGE_LEDGER.md`; S88 switched the renderer to direct PostgREST fetch so the command exits cleanly and added it to `verify:launch-local`
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning with `adaptiveRankingSnapshot`, deterministic scanner/community workflow suggestion IDs, conflict-aware workflow upserts, Pages push-alert env plumbing, a machine-readable launch proof surface with evidence requirements, post-deploy launch-verification artifacts, normalized CTA link metadata and analytics, production dashboard smoke, `launch:status`, `AppChrome`/`appText`/`AppNotifications`/`useProfitNotifications` seams, restored `ParlayHedge` route coverage, and safer service-worker cache writes that avoid the consumed-response clone failure seen in production
- Test coverage: full S91 launch gate passed: `npm run verify:launch-local` completed 450/450 tests, AI usage ledger, hook-order guard, auth/launch/UX/browser smokes, public dist exposure, replay proofs, bundle budget, and strict public-repo sanitization.
- Operator runners: `npm run smoke:stripe` walks the Stripe smoke checklist with evidence capture; `npm run beta:check` now includes account creation/sign-in plus confirmation-email or password-reset recovery visibility before calculator/CTA/pricing/trust checks; both record to `context/LAUNCH_PROOFS.json` with `--record`
- Post-deploy ingester (S81): `npm run ingest:launch` pulls the latest GitHub `launch-verification` artifact via `gh` CLI and writes `artifacts/launch-verification/post-deploy.{md,json}` without ever modifying manual proof status
- Latest post-deploy ingest (S82): run `25181776729` shows Supabase tables, VAPID env, public signup, confirmed billing user, live checkout, and customer portal checks passing; remaining deploy-verification failures are `affiliate_coverage` and `required_launch_monetization` for `BetMGM`, `bet365`, and `BetRivers`
- Secret sync (S81): `npm run sync:secrets` (`scripts/sync-github-secrets.mjs`) pushes admin secrets from `.env.admin` to GitHub Actions; used this session to flip `SUPABASE_SERVICE_ROLE_KEY` live
- Security: strict public-repo sanitization scan 0 critical / 0 warning; scan respects public-repo protocol docs and git-tracked public files instead of false-failing on ignored local ops state
- Public trust copy: `/privacy/` and `/data-policy/` now describe the actual PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims
- Protocol FAQ cache: `docs/PROTOCOL_FAQ.md` contains 10 public-safe session-protocol Q&A entries, and `node scripts/ops.mjs ask --list` returns those cached entries without needing an AI key
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: complete one live Stripe smoke purchase and record evidence with `npm run smoke:stripe -- --record`.
- Active work: complete one friend-facing auth/recovery/calculator/pricing pass and record evidence with `npm run beta:check -- --record`.
- Active work: run production auth email smoke after the latest deploy: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Active work: refresh stale revenue and IGNIS derived intelligence now that dependency/security verification is green again.
- Active work: continue decomposing the remaining high-churn `src/App.jsx` seams.
- Active work: continue external launch proofs now that the production checkout deploy gate is green.

## Blockers

- Blocker: real approved affiliate/referral tracking URLs for `BetMGM`, `bet365`, and `BetRivers` are still absent from repo/local context
- Owner: operator / partner program inventory
- Unblock path: paste the real tracking URLs into `src/books.js`, update `context/LAUNCH_PROOFS.json`, deploy, then rerun `node scripts/verify-production-launch.mjs`
- Blocker: one real Stripe smoke purchase plus one friend-facing auth/recovery/calculator/pricing pass are still required before public launch
- Owner: operator / trusted tester
- Unblock path: complete the live billing and friend-beta checklist after this push/deploy cycle, then mark the matching proofs complete in `context/LAUNCH_PROOFS.json`

## Next 3 moves

1. Run production auth email checks now that Deploy Pages is green.
2. Complete `npm run beta:check -- --record` and `npm run smoke:stripe -- --record` with real tester/payment evidence.
3. Refresh revenue/IGNIS derived intelligence, then schedule the dedicated `app-jsx-decomposition-finale` session.

### Session 97 closeout update - 2026-06-29

- Shipped a production auth email smoke runner: `npm run smoke:auth-email` now captures real deployed-account confirmation, resend, forgot-password, recovery-link, and new-password sign-in evidence with masking and token/password guards.
- Canonical launch proofs now include `authEmailSmoke`; `src/data/launchProofs.generated.js` mirrors it into the app, so the Launch Command Center shows the auth-email proof gate alongside Stripe and friend-beta.
- Launch Command Center now prioritizes auth-email proof before Stripe and friend-beta manual blockers, matching the current launch sequence.
- Supabase deploy capability mapping remains Studio Ops-owned; Ark cargo `01JSAF1R02AEA5B6F3FE74C3B4` requests `promogrind.supabase.deploy` for project ref `fjnpzjjyhnpmunfoycrp` rather than editing the sibling repo.
- Verification: `npm test` passed 501/501 and `npm run verify:launch-local` passed end to end.

### Session 98 closeout update - 2026-06-29

- Ran the requested continuous `/arc` mission through `/start`, `/audit`, `/implement`, and `/closeout` without stopping on the empty generated genius cache.
- Fresh audit replaced the prior Session 97 execution note with `docs/AUDIT_2026-06-29.{json,md}` and `docs/IMPLEMENT_PLAN.md`; the audit records 3 shipped repo-owned items and 1 honest external-proof deferral.
- Shipped Risk Radar in Today Dashboard: dormant bankroll stress, pre-mortem, and twin-battle engines now feed a live operator-facing card through `buildRiskRadarSummary`.
- Wired AI telemetry: Promo Advisor and Promo Chat cache paths now update prompt-cache hit/miss stats, and saved Advisor recommendations record calibration predictions keyed to workflow id.
- Fixed launch observability truth: Launch Command Center now uses canonical `context/LAUNCH_PROOFS.json` blockers via `getLaunchProofCommandItems`; nonblocking partial affiliate coverage is advisory instead of a manual blocker.
- Verification: `npm test` passed 502/502, and `npm run verify:launch-local` passed end to end with 0 public-sanitization findings.
- Honest pending proof gates remain unchanged: real production auth email smoke, real Stripe smoke purchase, and trusted friend beta pass still require real evidence and were not faked.

### Session 99 closeout update - 2026-06-29

- Ran the requested continuous `/goal` + `/arc` mission through `/start`, `/audit`, `/implement`, and `/closeout`; the generated genius list was empty, so the protocol fallback audit used live public-surface and launch-canon checks.
- Added dual-audience public files: `public/agents.json` and `public/.well-known/llms.txt` now publish PromoGrind's product boundaries, policy links, rights posture, and agent-use constraints.
- Strengthened public reachability: app footer and `public/sitemap.xml` now expose `/contact/`; the sitemap also lists `/agents.json` and `/.well-known/llms.txt`.
- Hardened regression coverage: `scripts/validate-ux-route-integrity.mjs` now fails if `/contact/`, `/agents.json`, or `/.well-known/llms.txt` disappear.
- Canon adoption posture now exists at `context/CANON_ADOPTION.md` after the startup canon-adoption check found it missing.
- Honest external follow-up: Brevo delivery for `contact@promogrind.bet` is not proven locally; Ark cargo `01JSAJMBF321A097D8CE8E12B9` asks Studio Ops to configure/verify forwarding/copy to `founder@vaultsparkstudios.com`.
- Verification: `npm run verify:launch-local` passed end to end with 502/502 tests; `node scripts/ops.mjs doctor --update-json` passed 12/12 with `blockingFailing: 0`.

### Session 100 closeout update - 2026-06-30

- Ran the requested continuous `/goal` + `/arc` mission through `/start`, `/audit`, `/implement`, and `/closeout`; the generated genius list was empty and `ops.mjs innovation-pack` is unavailable in this public repo, so the expansion pass used live App.jsx decomposition, state-legal truth, and launch-proof evidence checks.
- Shipped `docs/AUDIT_2026-06-30.{md,json}` and `docs/IMPLEMENT_PLAN.md` with four repo-owned items implemented and one honest external-proof deferral.
- Continued `app-jsx-decomposition-finale`: extracted navigation/search shell widgets to `src/app/AppNavigation.jsx`, CSV import/parsing to `src/app/CSVImportModal.jsx`, dashboard widgets to `src/app/DashboardWidgets.jsx`, and state-legal alert truth to `src/lib/stateLegal.jsx`.
- Fixed launch-truth drift: Missouri now appears as recently launched on `2025-12-01` instead of a coming-soon state, and `App.jsx` now explicitly imports `US_BOOK_STATES` for availability filters.
- Added focused regression coverage: CSV parser tests, state-legal truth tests, and an App composition guard that keeps extracted component definitions out of `src/App.jsx` and enforces the 3500-line ceiling.
- Verification: focused Vitest passed 8/8; `npm test` passed 508/508 across 59 files; `npm run verify:launch-local` passed end to end.
- Honest pending proof gates remain unchanged: real production auth email smoke, Stripe smoke purchase, friend-beta pass, and Brevo forwarding evidence still require real external proof and were not faked.

### Session 101 closeout update - 2026-06-30

- Shipped another App.jsx decomposition slice: `Glossary` and `GLOSSARY_TERMS` now live in `src/components/Glossary.jsx`, and `src/App.jsx` imports the component instead of owning glossary reference content inline.
- App composition truth improved: `appComposition.test.js` now prevents the glossary component and term list from drifting back into the monolith; `src/App.jsx` is down from 3404 to 3363 lines and remains below the 3500-line ceiling.
- Verification: focused composition Vitest passed 2/2, `npm test` passed 508/508, and `npm run verify:launch-local` passed end to end with 508/508 tests, hook-order guard, auth/launch/UX/browser smokes, dist exposure, proof replay, bundle budget, and strict public sanitization.
- External proof truth remains yellow: auth email, Stripe smoke, friend beta, and Brevo forwarding still require real evidence.

### Session 102 closeout update - 2026-06-30

- Ran the requested continuous `/goal` + `/arc` mission through `/start`, `/audit`, `/implement`, and `/closeout`; the live genius list was empty and local `ops.mjs innovation-pack` is unavailable, so the expansion pass used verified App.jsx route-ownership evidence.
- Shipped `docs/AUDIT_2026-06-30-S102.{md,json}` and `docs/IMPLEMENT_PLAN.md` with four repo-owned route/component ownership items plus one honest external-proof deferral.
- Extracted Knowledge Base/FAQ, Profit Certificate, Vault Points Leaderboard, and Daily Streak into dedicated components under `src/components/`.
- App composition truth improved: `src/App.jsx` dropped from 3363 lines after S101 to 2807 lines, and `appComposition.test.js` now enforces the extracted surfaces plus a <3100-line ceiling.
- Verification: focused composition test passed 2/2, `npm test` passed 508/508, and `npm run verify:launch-local` passed end to end.
- External proof truth remains yellow: auth email, Stripe smoke, friend beta, Brevo forwarding, and the Studio Ops Supabase capability follow-up still require real evidence/control-plane action.
