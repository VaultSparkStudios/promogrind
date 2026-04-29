# Latest Handoff

Last updated: 2026-04-28 (S80)
Session: 80
Session Intent: Audit PromoGrind for the next highest-impact improvements, execute the refreshed Genius List work, then close out, update memory/context/CDR/task-board surfaces, commit, and push to GitHub.
Intent Outcome: Achieved for repo-controllable work. Protocol FAQ cache is restored, public privacy/data-policy copy now matches the actual analytics stack, and external launch proofs remain honestly pending.

## Where We Left Off (Session 80)

- `docs/PROTOCOL_FAQ.md` now has 10 public-safe cached protocol Q&A entries, so `node scripts/ops.mjs ask --list` returns real FAQ output instead of an empty-cache message.
- Public trust pages are more truthful: `/privacy/` and `/data-policy/` now describe the PostHog/Sentry analytics and diagnostics posture used by `src/analytics.js` rather than stale Plausible/no-cookie claims.
- The S80 audit produced a ranked improvement plan for stronger UI/UX, gamification, AI/intelligence, security, performance, and API/token efficiency; the repo-controllable Genius List work focused on protocol self-serve and public trust truth.
- Verification completed this session: `npm run smoke:ux`, `node scripts/check-public-repo-sanitization.mjs --strict`, `node scripts/ops.mjs ask --list`, and `node scripts/ops.mjs doctor` passed.
- Caveat from S79 still stands: full `npm test` previously hit a Vitest worker/import timeout in `calculators.test.jsx` during the parallel full-suite run; the same calculator suite passed by itself.
- Launch proof queue still reports `affiliateLinks`, `stripeSmoke`, and `friendBeta` as blocking via `node scripts/update-launch-proof.mjs --list`.

## What was completed

- **Project audit plan (S80)**: recommended the combined top improvement list spanning personalization, engagement loops, AI coaching, security/trust, performance, API/token efficiency, and launch-proof automation.
- **Protocol FAQ cache (S80)**: added `docs/PROTOCOL_FAQ.md` with 10 public-safe session-protocol Q&A entries so protocol help works without an AI-key-backed cache refresh.
- **Public trust copy (S80)**: aligned `public/privacy/index.html` and `public/data-policy/index.html` with the actual analytics/diagnostics implementation.
- **Launch proof guidance (S79)**: added `nextStep` and `evidenceRequired` fields for affiliate links, Stripe smoke, and friend beta, then extended `scripts/update-launch-proof.mjs` with `--guide`.
- **Workflow reconciliation (S79)**: made `scannerOpportunityToWorkflow` and `communityPromoToWorkflow` generate stable IDs/source IDs for repeated scanner/community items.
- **Workflow state preservation (S79)**: hardened `upsertWorkflowEntry` so a duplicate queued scanner/community item does not overwrite a progressed `placed`/`waiting`/`settled` workflow.
- **Observability (S79)**: added launch monetization summary and activation-funnel state to `src/observability.js`, and surfaced both in `ObservabilityPanel`.
- **App seam decomposition (S79 partial)**: changed the `Community Promos` tab to use the extracted `PromoBoard`/`CommunityPromoBoard` route.
- **Tests (S79)**: expanded workflow suggestion and observability regression coverage.

## What is mid-flight

- Real affiliate/referral links for `BetMGM`, `bet365`, and `BetRivers` are still missing from `src/books.js`.
- Stripe smoke purchase with real checkout/webhook/subscription/customer-portal lifecycle still required.
- One friend-facing auth/calculator/CTA/pricing pass still required.
- `src/App.jsx` decomposition remains worth continuing beyond `AppChrome`, `appText`, `AppNotifications`, and the community-promos route.
- The deploy-time `launch-verification` artifact still needs inspection after this push/deploy cycle.
- Genius List cache may report stale after closeout because context/status files changed; refresh it at the next `/start` or `/go` before trusting the generated list.

## What to do next

1. Let this push deploy, then inspect the retained `launch-verification` artifact.
2. Paste real `BetMGM`, `bet365`, and `BetRivers` approved tracking URLs into `src/books.js`, then rerun `npm run verify:production`.
3. Run the real Stripe smoke purchase and verify post-checkout portal/subscription behavior.
4. Complete one friend-facing auth/calculator/CTA/pricing pass and mark evidence in `context/LAUNCH_PROOFS.json`.
5. Add the post-deploy artifact ingester, continue the next bounded `src/App.jsx` extraction, clean up PostHog production console noise, and consider the S80 audit's AI/personalization/gamification recommendations.

## Constraints

- This public repo does not carry the full private Studio Ops layer; use repo-local truth files instead of assuming portfolio scripts exist.
- Avoid rerunning broad repair scripts blindly: `ops-onboard --repair --write` can overwrite valid repo-local truth with scaffolds.
- Do not fabricate sportsbook affiliate links. If the operator has not provided a real approved URL, leave the field empty and keep the blocker honest.
- Do not commit `supabase/.temp/*`; it is local linkage state, not public repo truth.
- `docs/CREATIVE_DIRECTION_RECORD.md` is required by this repo's AGENTS guide as a closeout surface and should remain available for additive updates.

## Read these first next session

1. `docs/STARTUP_BRIEF.md`
2. `context/TASK_BOARD.md`
3. `context/LAUNCH_PROOFS.json`
4. `docs/RELEASE_PLAN.md`

## Files to update next session if work continues

- `src/books.js` (affiliate links)
- `context/LAUNCH_PROOFS.json` (proof evidence)
- `src/App.jsx` and `src/app/` (continued decomposition)
- `src/workflows/`, `src/promograph/`, and remote sync paths (workflow reconciliation)
- `docs/RELEASE_PLAN.md`
