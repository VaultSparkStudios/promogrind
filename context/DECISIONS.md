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
