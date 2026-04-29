# Current State

Last updated: 2026-04-28 (S80)

## Snapshot

- Date: 2026-04-28
- Overall status: deployed product with public trust copy aligned to the actual analytics stack, Protocol Oracle FAQ cache restored for public-safe session help, public-repo sanitization passing, and only external release-proof blockers still open
- Current phase: public-unveil launch hardening with external blocker cleanup
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with 53 calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Public entry routing: `/` now serves the landing experience first, while the app shell is reached intentionally via `/dashboard` and explicit app/signup CTAs
- Launch validation: `npm run verify:launch-local` now runs unit/component tests, launch smoke, UX route integrity, browser smoke, bundle budget, and strict public-repo sanitization
- UX route integrity: `scripts/validate-ux-route-integrity.mjs` checks 60 app routes, 98 public HTML files, required public pages, internal links, responsible-gambling copy, and free-account launch copy
- Cross-repo public marketing sync: `vaultsparkstudios.com/projects/promogrind/` now describes PromoGrind as deployed/FORGE/public-unlaunched with 53 calculators, beta-gated paid/AI surfaces, real `https://promogrind.bet/` CTAs, and no stale creator-dashboard claims
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning with `adaptiveRankingSnapshot`, deterministic scanner/community workflow suggestion IDs, conflict-aware workflow upserts, Pages push-alert env plumbing, a machine-readable launch proof surface with evidence requirements, post-deploy launch-verification artifacts, normalized CTA link metadata and analytics, `AppChrome`/`appText`/`AppNotifications` seams, restored `ParlayHedge` route coverage, and safer service-worker cache writes that avoid the consumed-response clone failure seen in production
- Test coverage: targeted regression run 66/66 passing; isolated calculator suite 34/34 passing; production build, launch smoke, UX integrity, bundle budget, and strict public-repo sanitization passing. Full `npm test` hit a Vitest worker/import timeout in `calculators.test.jsx` during the parallel full-suite run, while that same file passed in isolation.
- Security: strict public-repo sanitization scan 0 critical / 0 warning; scan respects public-repo protocol docs and git-tracked public files instead of false-failing on ignored local ops state
- Public trust copy: `/privacy/` and `/data-policy/` now describe the actual PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims
- Protocol FAQ cache: `docs/PROTOCOL_FAQ.md` contains 10 public-safe session-protocol Q&A entries, and `node scripts/ops.mjs ask --list` returns those cached entries without needing an AI key
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: finishing monetization coverage for sportsbook CTAs with real approved affiliate/referral links
- Active work: completing one live Stripe smoke purchase and one friend-facing auth/calculator/pricing pass before public announcement
- Active work: continuing to decompose the remaining high-churn `src/App.jsx` seams after routing the `Community Promos` tab to the extracted board component
- Active work: inspect the next deploy artifact after this push and keep public/legal/trust pages synced with implementation truth

## Blockers

- Blocker: real approved affiliate/referral tracking URLs for `BetMGM`, `bet365`, and `BetRivers` are still absent from repo/local context
- Owner: operator / partner program inventory
- Unblock path: paste the real tracking URLs into `src/books.js`, update `context/LAUNCH_PROOFS.json`, deploy, then rerun `node scripts/verify-production-launch.mjs`
- Blocker: one real Stripe smoke purchase plus one friend-facing auth/calculator/pricing pass are still required before public launch
- Owner: operator / trusted tester
- Unblock path: complete the live billing and friend-beta checklist after this push/deploy cycle, then mark the matching proofs complete in `context/LAUNCH_PROOFS.json`

## Next 3 moves

1. Push this session to `main`, then verify the deploy artifact and live public trust surfaces after CI/Pages completes.
2. Finish CTA monetization truth by adding real `BetMGM`, `bet365`, and `BetRivers` tracking links, using `node scripts/update-launch-proof.mjs --list --guide` for evidence requirements.
3. Run the real Stripe smoke purchase plus friend-beta pass, then continue shrinking `src/App.jsx` and add the post-deploy launch-verification artifact ingester.
