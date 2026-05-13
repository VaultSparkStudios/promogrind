# Current State

Last updated: 2026-05-13 (S85)

## Snapshot

- Date: 2026-05-13
- Overall status: deployed product with repo-owned auth/recovery hardening complete and local launch gate green. S85 added confirmation-email resend, forgot-password reset, recovery-link password update support, cautious account/membership copy, deterministic auth launch smoke (`npm run smoke:auth`), and proof-runner/checklist updates so friend beta must verify account recovery. Local launch gate passed end-to-end (`npm run verify:launch-local`: 396/396 tests, hook-order guard, auth smoke, launch smoke, UX route integrity, browser smoke, bundle budget, strict public-repo sanitization). Production host remains GitHub Pages (Cloudflare is DNS-only proxy).
- Current phase: public-unveil launch hardening with external blocker cleanup
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with 53 calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Public entry routing: `/` now serves the landing experience first, while the app shell is reached intentionally via `/dashboard` and explicit app/signup CTAs
- Launch validation: `npm run verify:launch-local` runs unit/component tests, hook-order guard, auth launch smoke, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization; last run on 2026-05-13 passed end-to-end with 396/396 tests
- Auth/account recovery (S85): `AuthDialog` now exposes resend confirmation email, forgot-password reset email, and recovery-link password update flows; `src/auth.js` accepts Supabase recovery/signup/magic-link hash sessions and sets explicit confirmation/reset redirects
- Static public-page credential hygiene (S85): `public/the-grind/` no longer embeds a Supabase JWT in browser HTML; the newsletter action now uses a credential-free support mailto path until a proper public-safe capture endpoint is available
- Production dashboard smoke (S82): `npm run smoke:production-dashboard` launches a Chromium-family browser via Chrome DevTools Protocol and captures runtime exceptions / console errors against `https://promogrind.bet/dashboard`
- Launch posture command (S82): `npm run launch:status` orchestrates the local launch gate, production dashboard smoke, post-deploy artifact ingestion, and manual proof guide; `--fast` can print proof-only status without expensive checks
- UX route integrity: `scripts/validate-ux-route-integrity.mjs` checks 60 app routes, 98 public HTML files, required public pages, internal links, responsible-gambling copy, and free-account launch copy
- Cross-repo public marketing sync: `vaultsparkstudios.com/projects/promogrind/` now describes PromoGrind as deployed/FORGE/public-unlaunched with 53 calculators, beta-gated paid/AI surfaces, real `https://promogrind.bet/` CTAs, and no stale creator-dashboard claims
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning with `adaptiveRankingSnapshot`, deterministic scanner/community workflow suggestion IDs, conflict-aware workflow upserts, Pages push-alert env plumbing, a machine-readable launch proof surface with evidence requirements, post-deploy launch-verification artifacts, normalized CTA link metadata and analytics, production dashboard smoke, `launch:status`, `AppChrome`/`appText`/`AppNotifications`/`useProfitNotifications` seams, restored `ParlayHedge` route coverage, and safer service-worker cache writes that avoid the consumed-response clone failure seen in production
- Test coverage: full `npm test` suite now 396/396 passing; production build, auth smoke, launch smoke, UX integrity, browser launch smoke, bundle budget, and strict public-repo sanitization all passing via `npm run verify:launch-local`.
- Operator runners: `npm run smoke:stripe` walks the Stripe smoke checklist with evidence capture; `npm run beta:check` now includes account creation/sign-in plus confirmation-email or password-reset recovery visibility before calculator/CTA/pricing/trust checks; both record to `context/LAUNCH_PROOFS.json` with `--record`
- Post-deploy ingester (S81): `npm run ingest:launch` pulls the latest GitHub `launch-verification` artifact via `gh` CLI and writes `artifacts/launch-verification/post-deploy.{md,json}` without ever modifying manual proof status
- Latest post-deploy ingest (S82): run `25181776729` shows Supabase tables, VAPID env, public signup, confirmed billing user, live checkout, and customer portal checks passing; remaining deploy-verification failures are `affiliate_coverage` and `required_launch_monetization` for `BetMGM`, `bet365`, and `BetRivers`
- Secret sync (S81): `npm run sync:secrets` (`scripts/sync-github-secrets.mjs`) pushes admin secrets from `.env.admin` to GitHub Actions; used this session to flip `SUPABASE_SERVICE_ROLE_KEY` live
- Security: strict public-repo sanitization scan 0 critical / 0 warning; scan respects public-repo protocol docs and git-tracked public files instead of false-failing on ignored local ops state
- Public trust copy: `/privacy/` and `/data-policy/` now describe the actual PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims
- Protocol FAQ cache: `docs/PROTOCOL_FAQ.md` contains 10 public-safe session-protocol Q&A entries, and `node scripts/ops.mjs ask --list` returns those cached entries without needing an AI key
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: deploy S85 auth/recovery hardening and run a real production auth email pass: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, new-password sign-in
- Active work: inspect the next GitHub Pages launch-verification artifact after this push and confirm production dashboard/auth surfaces are clean
- Active work: finishing monetization coverage for sportsbook CTAs with real approved affiliate/referral links
- Active work: completing one live Stripe smoke purchase and one friend-facing auth/calculator/pricing pass before public announcement
- Active work: continuing to decompose the remaining high-churn `src/App.jsx` seams (still ~4300 lines)

## Blockers

- Blocker: real approved affiliate/referral tracking URLs for `BetMGM`, `bet365`, and `BetRivers` are still absent from repo/local context
- Owner: operator / partner program inventory
- Unblock path: paste the real tracking URLs into `src/books.js`, update `context/LAUNCH_PROOFS.json`, deploy, then rerun `node scripts/verify-production-launch.mjs`
- Blocker: one real Stripe smoke purchase plus one friend-facing auth/recovery/calculator/pricing pass are still required before public launch
- Owner: operator / trusted tester
- Unblock path: complete the live billing and friend-beta checklist after this push/deploy cycle, then mark the matching proofs complete in `context/LAUNCH_PROOFS.json`

## Next 3 moves

1. Push S85 to `main`, let GitHub Pages deploy, then run production auth email checks and `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with the updated recovery-aware friend beta checklist and `npm run smoke:stripe -- --record` with one real checkout.
3. Finish CTA monetization truth by adding real `BetMGM`, `bet365`, and `BetRivers` tracking links, using `node scripts/update-launch-proof.mjs --list --guide` for evidence requirements.
