# Decisions

Append new entries. Do not erase historical reasoning unless it is wrong.

## Entry template

### YYYY-MM-DD - Decision title

- Status:
- Context:
- Decision:
- Alternatives considered:
- Why this was chosen:
- Follow-up:

### 2026-04-23 - Canonicalize manual launch blockers in LAUNCH_PROOFS and fail on the exact required books

- Status: accepted
- Context: PromoGrind's repo truth correctly said launch was still blocked by external steps, but the machine-readable surfaces were inconsistent: `check-launch-ready` could still report `✓ READY`, and `verify-production-launch` only failed on a vague aggregate affiliate count rather than the actual missing `BetMGM` / `bet365` / `BetRivers` monetization links.
- Decision: add `context/LAUNCH_PROOFS.json` as the canonical manual blocker surface, teach `scripts/check-launch-ready.mjs` to read it, and tighten `src/books.js` + `scripts/verify-production-launch.mjs` so launch monetization truth fails on the exact required books while rejecting generic partner/signup URLs as fake tracked links.
- Alternatives considered: keep relying on scattered prose in release docs and handoff notes; keep the verifier at the aggregate affiliate-count level; mark PromoGrind launch-ready and treat the manual steps as informal follow-ups.
- Why this was chosen: launch/marketing truth needs one canonical machine-readable surface, and the verifier should fail on the operator-owned books that actually block monetization instead of a lossy summary metric.
- Follow-up: when the operator supplies real URLs and completes the Stripe/friend-beta passes, update `context/LAUNCH_PROOFS.json`, rerun `scripts/check-launch-ready.mjs` and `scripts/verify-production-launch.mjs`, then clear the remaining launch blockers.

### 2026-04-22 - Public-safe repos need local truth fallbacks

- Status: accepted
- Context: `render-startup-brief`, runtime-pack synthesis, and local IGNIS rescoring drifted or failed because the repo was using public-safe/project-local surfaces instead of the private portfolio registry that some scripts implicitly assumed.
- Decision: make repo-local status/manifest/truth files authoritative for startup and derived-surface generation whenever portfolio-only sources are absent.
- Alternatives considered: keep treating missing portfolio data as fatal; patch individual generated files manually without fixing the generators.
- Why this was chosen: the public repo must remain self-healing and truthful on its own, and generator-level fixes reduce repeated token waste and future session drift.
- Follow-up: centralize these fallbacks into a single tested truth helper and add regression coverage for startup-brief, runtime-pack, and contract generation.

### 2026-04-22 - Manual closeout commit path because autopilot is genome-blocked

- Status: accepted
- Context: `closeout-autopilot.mjs` hard-aborts when `run-doctor.mjs --loop --update-json` exits nonzero. After repairs, doctor is still `11/12` because the protocol-genome check treats `13/25` as a blocking local failure and has no auto-remedy path.
- Decision: complete write-back, validation, secrets scan, commit, and push manually with normal git commands instead of claiming autopilot succeeded.
- Alternatives considered: falsify `truthGenome` to green so autopilot passes; skip closeout; use `--no-verify`.
- Why this was chosen: it preserves truthful repo state, keeps the safety gates that do work, and avoids introducing a dishonest or bypassed closeout artifact.
- Follow-up: downgrade non-red genome states from blocking for public-safe repos or give doctor a legitimate remediation path before requiring autopilot as a hard gate.

### 2026-04-22 - Shared app-shell, workflow graph, and AI gateway are now the canonical orchestration seams

- Status: accepted
- Context: PromoGrind had strong feature depth but too much component-local orchestration in `src/App.jsx` and across the AI/dashboard surfaces, which made feedback loops, persistence, and token governance inconsistent.
- Decision: treat `src/app/usePromoAppShell.js`, `src/workflows/store.js`, `src/workflows/actionGraph.js`, and `src/ai/gateway.js` as the canonical product seams for shell state, mutation routing, action resolution, and model invocation.
- Alternatives considered: continue with ad hoc component-local state; add one-off helpers to each surface without introducing shared contracts.
- Why this was chosen: it lowers local architecture debt, makes operator-facing recommendations deterministic enough to govern, and gives the remaining scanner/community surfaces a clear path onto the same contract.
- Follow-up: migrate the remaining scanner/community execution paths and live Supabase persistence onto these seams, then expand regression coverage around the shared contract.

### 2026-04-22 - Gamification computed from existing appData (no schema migrations)

- Status: accepted
- Context: Settlement mastery, achievements, and daily missions all needed player state — but adding new Supabase tables or schema fields would block shipping behind live migration work.
- Decision: compute all gamification state (`computeMastery`, `evaluateAchievements`, `getDailyMissions`) purely from the existing `appData` shape (ledger, resultFeedback, bets, done, workflowInbox, vaultEvents) plus localStorage for per-device mission completion. No schema changes required.
- Alternatives considered: add new Supabase tables for mastery/achievements/missions; store everything in localStorage only.
- Why this was chosen: ships immediately without external dependencies, leverages data already synced, and keeps local-first resilience. localStorage handles device-level state (mission completion, visit flags) which is appropriately ephemeral.
- Follow-up: if multi-device sync of achievements becomes a product requirement, add Supabase columns to existing user_data table at that point.

### 2026-04-22 - Untrack private ops scripts from public repo, not delete

- Status: accepted
- Context: `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, and `scripts/soul-interview.mjs` were committed to the public PromoGrind repo. They contain private Studio OS documents and a confirmed-exposed Render key reference.
- Decision: `git rm --cached` to untrack from git, add to `.gitignore`, keep files locally for ops use.
- Alternatives considered: delete files entirely; redact sensitive content and keep tracked.
- Why this was chosen: files have legitimate local ops value; untracking preserves them for local workflows while removing them from public history going forward. The Render key in `rotate-render-key.mjs` was already exposed in a prior handoff doc, so untracking the helper script doesn't make it worse — but it stops re-publishing the reference in future commits.
- Follow-up: rotate the Render deploy hook key via the Render dashboard (human action required). Run `git grep` with the old key after rotation to confirm zero references across all repos.

### 2026-04-22 - Restore missing calculator modules instead of soft-hiding broken routes

- Status: accepted
- Context: the deployed app stopped loading because `src/App.jsx` still referenced `DepositMatch`, but the module was missing, causing `Uncaught ReferenceError: DepositMatch is not defined` during boot.
- Decision: restore `DepositMatch` as a real calculator component and keep it in the app’s calculator registry rather than removing the route or hiding the feature.
- Alternatives considered: remove the calculator reference from the registry; wrap the missing reference in a conditional fallback; hide the feature behind a flag until later.
- Why this was chosen: the product already presents the calculator surface as part of its public feature set, and restoring the module preserves user-facing breadth while fixing the hard boot failure at the correct seam.
- Follow-up: keep the calculator registry aligned with actual modules and add regression coverage around any future calculator set changes that touch startup routing.

### 2026-04-22 - Canonicalize scanner/community/launch queue actions through workflow suggestion builders

- Status: accepted
- Context: the shared workflow graph existed, but Live Scanner, Community Promo Board, and Launch Command Center still exposed recommendations as isolated UI actions instead of emitting shared workflow-ready suggestions.
- Decision: introduce `src/workflows/suggestions.js` as the canonical builder layer for surfaced promo/workflow suggestions and route queue actions from those surfaces through it.
- Alternatives considered: let each surface keep its own local queue payload shape; wait for live Supabase migrations before wiring the UI layer; add only one-off button handlers without a shared builder layer.
- Why this was chosen: it unifies local behavior immediately, lowers future drift, and gives the post-migration remote reconciliation path one shared input contract instead of three divergent UI-specific payloads.
- Follow-up: once live migrations are applied, add remote reconciliation coverage so scanner/community suggestions persist across devices and sessions.

### 2026-04-22 - Reconcile live sync schema with an idempotent catch-up migration

- Status: accepted
- Context: local migration files for workflow/entity sync and feature flags existed, but the linked Supabase project had missing migration-history entries and the live tables were still absent from PostgREST even after repairing the ledger.
- Decision: add one idempotent reconciliation migration (`20260422200000_reconcile_live_sync_schema.sql`) that creates the expected public tables/policies/functions and triggers a `pgrst` schema reload, then push that migration live instead of pretending the older migrations had already taken effect.
- Alternatives considered: leave the migration history repaired but tables absent; apply SQL manually only through the dashboard and keep the repo blind to the change; rewrite or delete the historic migration ledger.
- Why this was chosen: it preserves an honest repo-local schema history, is safe to rerun, and gives future operators a deterministic recovery path when the live project drifts from migration history again.
- Follow-up: keep using `scripts/verify-production-launch.mjs` as the source of truth for launch-readiness checks and avoid marking a migration tranche "done" until the live tables are queryable.

### 2026-04-22 - Treat sportsbook affiliate URLs as operator-owned truth, never placeholders

- Status: accepted
- Context: all other verified launch blockers were cleared from this workspace, but `affiliate_coverage` stayed red because `BetMGM`, `bet365`, and `BetRivers` still have no real approved tracking URLs in repo or local secrets.
- Decision: leave those fields empty and keep the release/task/handoff surfaces red on affiliate coverage until the operator supplies real URLs.
- Alternatives considered: paste generic partner-program landing pages; fabricate placeholders; copy unverifiable referral links from the web.
- Why this was chosen: CTA monetization truth directly affects user trust, revenue attribution, and compliance. Fake or generic links would create a dishonest release state.
- Follow-up: once the operator provides approved URLs, wire them into `src/books.js`, rerun `scripts/verify-production-launch.mjs`, and clear the final launch blocker.

### 2026-04-23 - GitHub Pages push rollout must inject both the VAPID key and the push-alert feature flag

- Status: accepted
- Context: the client build already gated push UI on `VITE_PG_FEATURE_PUSH_ALERTS`, but the Pages deploy workflow only injected `VITE_VAPID_PUBLIC_KEY`, which meant a live Pages build could still suppress the feature even after VAPID wiring was configured.
- Decision: treat `.github/workflows/deploy-pages.yml` as the canonical rollout seam for browser push and inject both `VITE_VAPID_PUBLIC_KEY` and `VITE_PG_FEATURE_PUSH_ALERTS` from GitHub Actions secrets.
- Alternatives considered: leave the feature flag off until a later manual sweep; hardcode the push-alert flag in the app; expose push UI based only on VAPID presence.
- Why this was chosen: it keeps rollout behavior environment-driven, matches the existing launch-state contract, and avoids a misleading live build where push is partly configured but still silently gated off.
- Follow-up: let the next push trigger a Pages deploy, then confirm the live bundle reflects the env-backed push rollout before clearing launch-proof tasks.

### 2026-04-23 - Shared context parsing is now the default for closeout- and contract-facing repo truth surfaces

- Status: accepted
- Context: several public-safe repo scripts still hand-read `PROJECT_STATUS.json`, session locks, or SIL header blocks directly even after startup/doctor surfaces had already moved onto `scripts/lib/context-parsing.mjs`.
- Decision: continue consolidating repo-facing status parsing onto `scripts/lib/context-parsing.mjs`, including fast-start, founder-control, action-queue, contract generation, and closeout autopilot paths.
- Alternatives considered: tolerate duplicated local parsers; only patch the one script that most recently drifted; postpone consolidation until after launch.
- Why this was chosen: keeping repo truth parsing in one helper reduces drift across startup, contracts, closeout, and derived release surfaces in this public-safe repo where the private ops layer is intentionally absent.
- Follow-up: keep moving remaining repo-facing scripts onto the shared helper and downgrade the yellow-genome autopilot contradiction once doctor/autopilot logic catches up.

### 2026-04-23 - Book CTA truth must use normalized link metadata, not raw affiliate fields

- Status: accepted
- Context: launch verification had become stricter about what counts as a real tracked monetization link, but `BookCTA` still derived `linkType` and analytics flags from raw `affiliateLink` presence, which could disagree with the verifier and the launch dashboard.
- Decision: treat `getBookLinkMeta` in `src/books.js` as the canonical CTA truth seam for link classification, monetization readiness, and analytics labeling.
- Alternatives considered: leave UI/analytics on raw `affiliateLink` checks; duplicate the verifier logic inside `BookCTA`; soften the verifier back to aggregate counts.
- Why this was chosen: one shared helper keeps UI, analytics, and launch readiness aligned around the same monetization contract and avoids reintroducing drift after verifier hardening.
- Follow-up: move any remaining launch/admin surfaces that still reason about raw affiliate fields onto the same helper.

### 2026-04-23 - Deploy-time launch verification should emit an artifact, not just local console output

- Status: accepted
- Context: `scripts/verify-production-launch.mjs` already gave an honest local verdict, but deploy truth still depended on humans rerunning it manually and reading console output after each push.
- Decision: make the GitHub Pages deploy workflow run `npm run verify:production`, render a markdown summary, and upload a `launch-verification` artifact as part of the normal deploy path.
- Alternatives considered: keep verification local-only; add a workflow step that logs to stdout without a retained artifact; wait until all external launch blockers are resolved before automating deploy proof.
- Why this was chosen: production readiness needs a retained deploy artifact so launch truth can be inspected after the fact instead of reconstructed from memory or scattered terminal output.
- Follow-up: once the next deploy runs, consume the artifact as the preferred post-push verification record and keep the launch dashboard aligned with that output.
