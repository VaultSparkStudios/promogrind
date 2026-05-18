# Current State

Last updated: 2026-05-17 (S90)

## Snapshot

- Date: 2026-05-17
- Overall status: deployed product with S90 audit/implement/closeout sprint complete — shipped 7 of 12 core modules layering on S89 infrastructure: counterfactual P&L ribbon, decision journal autogen, terms-drift detector, edge half-life scheduler, promo conflict detector, Kelly-fraction sandbox, and zero-PII share card. Suite is now 450/450 (up from 430). UI wiring deferred to S91 thin-integration pass. Below preserves S89 narrative.
- Overall status (S89): deployed product with S89 audit/implement/closeout sprint complete — shipped 9 of 10 audit items focused on temporal intelligence, counterfactual learning, and anti-tilt safety: tilt circuit breaker, ablation-based promo explainer ("why ranked #N"), EV decay radar, operator twin drift forecast, 14-day adversarial receipt replay, HMAC-signed public operator passport, launch-proof resilience replay, calculator pre-warm, and weekly AI budget self-binding. Suite is now 430/430 (up from 409). S88 audit/implement/closeout sprint complete: added an Operator Season rail over daily missions, Profile local data export/clear controls, a public `dist/` exposure gate wired into `verify:launch-local`, friend-beta feedback summary generation, and a cleaner AI usage ledger renderer. The new dist gate caught and drove removal of the legacy public `vault-sdk.js` cross-project membership SDK/reference, preserving the S86 PromoGrind-only account boundary. S87 launch proof mirror, Operator Autopilot, trust receipts, discipline scoring, outcome-memory recommendations, and AI usage ledger remain intact. Closeout verification in S88 passed `npm run verify:launch-local` end to end with 409/409 tests. Production host remains GitHub Pages (Cloudflare is DNS-only proxy).
- Current phase: public-unveil launch hardening with external blocker cleanup
- Canonical launch proof surface: `context/LAUNCH_PROOFS.json`

## What exists

- Live product: `https://promogrind.bet` with 53 calculators, tracker, workflow surfaces, community board, daily brief, AI advisor/chat/action plan, subscriptions, launch/admin tooling, and production-queryable workflow/entity sync tables
- Public entry routing: `/` now serves the landing experience first, while the app shell is reached intentionally via `/dashboard` and explicit app/signup CTAs
- Launch validation: `npm run verify:launch-local` runs unit/component tests, AI usage ledger rendering, hook-order guard, auth launch smoke, launch smoke, UX route integrity, browser smoke, public dist exposure scan, bundle budget, and strict public-repo sanitization; S88 verification passed end to end with 409/409 tests
- Auth/account recovery (S85/S86): `AuthDialog` now exposes resend confirmation email, forgot-password reset email, and recovery-link password update flows; `src/auth.js` accepts Supabase recovery/signup/magic-link hash sessions and sets explicit confirmation/reset redirects; S86 copy now states that creating a PromoGrind account does not create or require Studio membership
- Account/membership separation (S86): PromoGrind account surfaces, profile/account help links, terms/privacy/data-policy pages, and generated public trust strips now use PromoGrind account language instead of Vault account/membership or cross-Studio sync promises
- Static public-page credential hygiene (S85/S86): `public/the-grind/` and `public/creator-program/` no longer embed Supabase JWTs in browser HTML; both use credential-free mailto paths until proper public-safe capture endpoints are available
- Production dashboard smoke (S82): `npm run smoke:production-dashboard` launches a Chromium-family browser via Chrome DevTools Protocol and captures runtime exceptions / console errors against `https://promogrind.bet/dashboard`
- Launch posture command (S82): `npm run launch:status` orchestrates the local launch gate, production dashboard smoke, post-deploy artifact ingestion, and manual proof guide; `--fast` can print proof-only status without expensive checks
- UX route integrity: `scripts/validate-ux-route-integrity.mjs` checks 60 app routes, 98 public HTML files, required public pages, internal links, responsible-gambling copy, and free-account launch copy
- Cross-repo public marketing sync: `vaultsparkstudios.com/projects/promogrind/` now describes PromoGrind as deployed/FORGE/public-unlaunched with 53 calculators, beta-gated paid/AI surfaces, real `https://promogrind.bet/` CTAs, and no stale creator-dashboard claims
- Gamification: settlement mastery ladder (8 promo types × 4 levels), 30-badge achievement system, daily missions (15-pool, LCG-seeded) with auto-completion and XP tracking, plus S87 discipline scoring that rewards settled outcomes, repeatable lanes, and lower unresolved exposure
- Operator season loop (S88): `src/lib/seasons.js` builds a 14-day discipline season from closed-loop settlements/skips, repeat feedback, bankroll context, and open-bet cleanup; `DailyMissionsPanel` now shows season score/progress above daily missions without rewarding raw bet volume
- Operator loop (S87): `TodayDashboardPanel` now surfaces an Operator Autopilot card that routes the user to the best immediate action, while `SmartPromoRecommender` explains outcome-memory signals from hot lanes, cold drift, settled samples, and repeat/execution behavior
- Trust loop (S87): local trust receipts record sensitive account, billing, AI analysis, push subscription, and cloud-sync moments; Profile surfaces the latest receipts so users can see what the app did on their behalf
- Data controls (S88): Profile includes local export and clear-local-data controls powered by `src/lib/dataControls.js`, giving users an immediate control path for browser-stored PromoGrind data while keeping preferences by default
- Launch command center (S87): the browser reads `src/data/launchProofs.generated.js`, generated from `context/LAUNCH_PROOFS.json`, so proof statuses/evidence requirements/next steps stay aligned with repo truth without exposing private ops state
- AI cost/usage (S87/S88): `npm run ai:usage` renders `docs/AI_USAGE_LEDGER.md`; S88 switched the renderer to direct PostgREST fetch so the command exits cleanly and added it to `verify:launch-local`
- Systems: Supabase-backed auth/data flows, repaired Stripe checkout/customer-portal paths, AI edge functions (with AbortController + exponential-backoff retry), push/onboarding/community surfaces, Studio export/contract generation, shared AI gateway/workflow store layers, adaptive dashboard planning with `adaptiveRankingSnapshot`, deterministic scanner/community workflow suggestion IDs, conflict-aware workflow upserts, Pages push-alert env plumbing, a machine-readable launch proof surface with evidence requirements, post-deploy launch-verification artifacts, normalized CTA link metadata and analytics, production dashboard smoke, `launch:status`, `AppChrome`/`appText`/`AppNotifications`/`useProfitNotifications` seams, restored `ParlayHedge` route coverage, and safer service-worker cache writes that avoid the consumed-response clone failure seen in production
- Test coverage: full test suite reached 409/409 passing during S88 verification; `npm run verify:launch-local` passed end to end including browser smoke, public dist exposure, bundle budget, and strict public-repo sanitization.
- Operator runners: `npm run smoke:stripe` walks the Stripe smoke checklist with evidence capture; `npm run beta:check` now includes account creation/sign-in plus confirmation-email or password-reset recovery visibility before calculator/CTA/pricing/trust checks; both record to `context/LAUNCH_PROOFS.json` with `--record`
- Post-deploy ingester (S81): `npm run ingest:launch` pulls the latest GitHub `launch-verification` artifact via `gh` CLI and writes `artifacts/launch-verification/post-deploy.{md,json}` without ever modifying manual proof status
- Latest post-deploy ingest (S82): run `25181776729` shows Supabase tables, VAPID env, public signup, confirmed billing user, live checkout, and customer portal checks passing; remaining deploy-verification failures are `affiliate_coverage` and `required_launch_monetization` for `BetMGM`, `bet365`, and `BetRivers`
- Secret sync (S81): `npm run sync:secrets` (`scripts/sync-github-secrets.mjs`) pushes admin secrets from `.env.admin` to GitHub Actions; used this session to flip `SUPABASE_SERVICE_ROLE_KEY` live
- Security: strict public-repo sanitization scan 0 critical / 0 warning; scan respects public-repo protocol docs and git-tracked public files instead of false-failing on ignored local ops state
- Public trust copy: `/privacy/` and `/data-policy/` now describe the actual PostHog/Sentry analytics and diagnostics posture instead of stale Plausible/no-cookie claims
- Protocol FAQ cache: `docs/PROTOCOL_FAQ.md` contains 10 public-safe session-protocol Q&A entries, and `node scripts/ops.mjs ask --list` returns those cached entries without needing an AI key
- Important paths: `src/App.jsx`, `src/app/`, `src/ai/gateway.js`, `src/workflows/`, `src/lib/` (mastery.js, achievements.js, missions.js), `src/components/`, `supabase/functions/`, `scripts/`, `context/`

## In progress

- Active work: deploy S88 season/data-control/dist-gate improvements and run a real production auth email pass: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, new-password sign-in
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

1. Push S88 to `main`, let GitHub Pages deploy, then run production auth email checks and `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with the updated recovery-aware friend beta checklist and `npm run smoke:stripe -- --record` with one real checkout.
3. Finish CTA monetization truth by adding real `BetMGM`, `bet365`, and `BetRivers` tracking links, using `node scripts/update-launch-proof.mjs --list --guide` for evidence requirements.
