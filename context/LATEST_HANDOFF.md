# Latest Handoff

Last updated: 2026-04-28 (S79)
Session: 79
Session Intent: Implement all seven highest-impact PromoGrind items at the highest/optimal quality in one efficient pass, then close out, update context/memory/CDR/task-board surfaces, commit, and push to GitHub.
Intent Outcome: Achieved for all repo-controllable work. External proofs remain honestly pending because real sportsbook tracking URLs, a live Stripe smoke purchase, and a friend-facing beta pass require operator/tester action.

## Where We Left Off (Session 79)

- PromoGrind now has stronger launch-proof execution guidance: `context/LAUNCH_PROOFS.json` includes next steps and evidence requirements, and `node scripts/update-launch-proof.mjs --list --guide` prints them.
- Scanner/community workflow reconciliation is safer: generated workflows have stable IDs/source IDs, and duplicate queue actions no longer downgrade progressed workflow state.
- Observability is deeper: activation-funnel completion and required launch-link status are now included in `buildObservabilitySnapshot` and surfaced in the dashboard observability panel.
- `src/App.jsx` is slightly lighter: the `Community Promos` tab now routes to the extracted `CommunityPromoBoard` instead of the stale inline component.
- Verification completed: targeted regression run `66/66` passing, isolated calculator suite `34/34` passing, production build passing, launch smoke passing, UX route integrity passing, bundle budget passing, and strict public-repo sanitization 0 critical / 0 warning.
- Caveat: full `npm test` hit a Vitest worker/import timeout in `calculators.test.jsx` during the parallel full-suite run; the same calculator suite passed by itself.
- Launch proof queue still reports `affiliateLinks`, `stripeSmoke`, and `friendBeta` as blocking via `node scripts/update-launch-proof.mjs --list`.

## What was completed

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

## What to do next

1. Let this push deploy, then inspect the retained `launch-verification` artifact.
2. Paste real `BetMGM`, `bet365`, and `BetRivers` approved tracking URLs into `src/books.js`, then rerun `npm run verify:production`.
3. Run the real Stripe smoke purchase and verify post-checkout portal/subscription behavior.
4. Complete one friend-facing auth/calculator/CTA/pricing pass and mark evidence in `context/LAUNCH_PROOFS.json`.
5. Add the post-deploy artifact ingester, continue the next bounded `src/App.jsx` extraction, and clean up PostHog production console noise.

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
