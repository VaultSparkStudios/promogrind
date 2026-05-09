# Current State

Last updated: 2026-05-08 (S83)

## Snapshot

- Date: 2026-05-08
- Overall status: deployed product with cold-load deep-link crash fixed (S83 hoisted four route-scoped `useEffect`s above `src/App.jsx` early returns to resolve React error #310). Live bundle is now `App-BJlXUHbf.js`. Local launch gate green (`npm run verify:launch-local`: 392/392 tests, launch smoke, UX route integrity, browser smoke, bundle budget, strict public-repo sanitization). Post-deploy launch-verification ingester confirming Supabase/VAPID/signup/billing/checkout/customer-portal health. Production host clarified as GitHub Pages (Cloudflare is DNS-only proxy).
- Current phase: public-unveil launch hardening with external blocker cleanup
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with 53 calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Public entry routing: `/` now serves the landing experience first, while the app shell is reached intentionally via `/dashboard` and explicit app/signup CTAs
- Launch validation: `npm run verify:launch-local` runs unit/component tests, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization; last run on 2026-05-01 passed end-to-end
- Production dashboard smoke (S82): `npm run smoke:production-dashboard` launches a Chromium-family browser via Chrome DevTools Protocol and captures runtime exceptions / console errors against `https://promogrind.bet/dashboard`
- Launch posture command (S82): `npm run launch:status` orchestrates the local launch gate, production dashboard smoke, post-deploy artifact ingestion, and manual proof guide; `--fast` can print proof-only status without expensive checks
- UX route integrity: `scripts/validate-ux-route-integrity.mjs` checks 60 app routes, 98 public HTML files, required public pages, internal links, responsible-gambling copy, and free-account launch copy
- Cross-repo public marketing sync: `vaultsparkstudios.com/projects/promogrind/` now describes PromoGrind as deployed/FORGE/public-unlaunched with 53 calculators, beta-gated paid/AI surfaces, real `https://promogrind.bet/` CTAs, and no stale creator-dashboard claims
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning with `adaptiveRankingSnapshot`, deterministic scanner/community workflow suggestion IDs, conflict-aware workflow upserts, Pages push-alert env plumbing, a machine-readable launch proof surface with evidence requirements, post-deploy launch-verification artifacts, normalized CTA link metadata and analytics, production dashboard smoke, `launch:status`, `AppChrome`/`appText`/`AppNotifications`/`useProfitNotifications` seams, restored `ParlayHedge` route coverage, and safer service-worker cache writes that avoid the consumed-response clone failure seen in production
- Test coverage: full `npm test` suite now 392/392 passing; production build, launch smoke, UX integrity, browser launch smoke, bundle budget, and strict public-repo sanitization all passing via `npm run verify:launch-local`. Vitest can still emit non-fatal worker termination warnings after a passing suite, so worker cleanup remains watchlisted.
- Operator runners (S81): `npm run smoke:stripe` walks the 8-step Stripe smoke checklist with evidence capture; `npm run beta:check` walks the 5-step friend beta pass with friction notes; both record to `context/LAUNCH_PROOFS.json` with `--record`
- Post-deploy ingester (S81): `npm run ingest:launch` pulls the latest GitHub `launch-verification` artifact via `gh` CLI and writes `artifacts/launch-verification/post-deploy.{md,json}` without ever modifying manual proof status
- Latest post-deploy ingest (S82): run `25181776729` shows Supabase tables, VAPID env, public signup, confirmed billing user, live checkout, and customer portal checks passing; remaining deploy-verification failures are `affiliate_coverage` and `required_launch_monetization` for `BetMGM`, `bet365`, and `BetRivers`
- Secret sync (S81): `npm run sync:secrets` (`scripts/sync-github-secrets.mjs`) pushes admin secrets from `.env.admin` to GitHub Actions; used this session to flip `SUPABASE_SERVICE_ROLE_KEY` live
- Security: strict public-repo sanitization scan 0 critical / 0 warning; scan respects public-repo protocol docs and git-tracked public files instead of false-failing on ignored local ops state
- Public trust copy: `/privacy/` and `/data-policy/` now describe the actual PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims
- Protocol FAQ cache: `docs/PROTOCOL_FAQ.md` contains 10 public-safe session-protocol Q&A entries, and `node scripts/ops.mjs ask --list` returns those cached entries without needing an AI key
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: founder verification of the S83 cold-load fix in incognito (open `/` and `/dashboard` deep link, confirm no React #310 and no first-hit refresh requirement)
- Active work: chronic Deploy Pages workflow red — actual deploy succeeds, but the `Verify production launch` step fails on `workflow_state` and `workflow_history` checks against the live API; needs either fixing those endpoints or relaxing the gate to advisory
- Active work: finishing monetization coverage for sportsbook CTAs with real approved affiliate/referral links
- Active work: completing one live Stripe smoke purchase and one friend-facing auth/calculator/pricing pass before public announcement
- Active work: continuing to decompose the remaining high-churn `src/App.jsx` seams (still ~4300 lines)

## Blockers

- Blocker: real approved affiliate/referral tracking URLs for `BetMGM`, `bet365`, and `BetRivers` are still absent from repo/local context
- Owner: operator / partner program inventory
- Unblock path: paste the real tracking URLs into `src/books.js`, update `context/LAUNCH_PROOFS.json`, deploy, then rerun `node scripts/verify-production-launch.mjs`
- Blocker: one real Stripe smoke purchase plus one friend-facing auth/calculator/pricing pass are still required before public launch
- Owner: operator / trusted tester
- Unblock path: complete the live billing and friend-beta checklist after this push/deploy cycle, then mark the matching proofs complete in `context/LAUNCH_PROOFS.json`

## Next 3 moves

1. Push this session to `main`, let the deploy ship, then rerun `npm run smoke:production-dashboard` and `npm run ingest:launch`.
2. Finish CTA monetization truth by adding real `BetMGM`, `bet365`, and `BetRivers` tracking links, using `node scripts/update-launch-proof.mjs --list --guide` for evidence requirements.
3. Run the real Stripe smoke purchase plus friend-beta pass, then continue shrinking `src/App.jsx` beyond the new `useProfitNotifications` seam.
