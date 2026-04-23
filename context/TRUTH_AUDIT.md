<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-23 (S73)
Overall status: yellow
Next action: keep affiliate-link truth honest until real URLs exist, let the next Pages deploy pick up the push-alert env wiring, and stop treating yellow local genome states as hard-closeout blockers for public-safe repos.

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
| Schema alignment | 4 | `CURRENT_STATE.md`, `LATEST_HANDOFF.md`, `TASK_BOARD.md`, `RELEASE_PLAN.md`, and `PROJECT_STATUS.json` now agree that the only remaining launch blockers are external affiliate/verification tasks. |
| Prompt/template alignment | 3 | Canonical templates are aligned, but doctor/autopilot policy still assumes yellow genome should block public-safe closeout. |
| Derived-view freshness | 5 | Startup brief, contract generation, action queue, fast-start, and release truth now share more of the same parser layer and describe the same S73 state. |
| Handoff continuity | 4 | Session 73 handoff fully reflects the shipped repo-local work, green verification, and the remaining external blockers. |
| Contradiction density | 2 | The main contradiction left is still operational: closeout autopilot may abort on the yellow genome even though repo truth is coherent enough for an honest manual fallback. |
| **Total** | **18 / 25** | Yellow: derived truth is tighter after S73 consolidation, but autopilot policy still over-blocks public-safe repos. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | yellow | 2026-04-23 | Keep this file authoritative and avoid broad repair writes that collapse it. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-04-23 | S73 write-back aligns state, handoff, task board, and work log around the same verified repo state. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-23 | Manifest remains the source of capability truth; contract generation now reads status via the shared helper. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-23 | Derived IGNIS surfaces still agree on `47857 FORGE`. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | green | 2026-04-23 | Fast-start/action-queue/founder-control/contract generation now share more of the same parsing seam, reducing startup-side drift. |
| Launch-proof truth | `scripts/verify-production-launch.mjs` + live Supabase/GitHub config | `docs/RELEASE_PLAN.md`, `context/TASK_BOARD.md`, handoff docs | yellow | 2026-04-23 | Repo truth is aligned on the remaining external blockers, but the next Pages deploy still needs to pick up the new push-alert env wiring. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-04-23 | 0 critical / 0 warning findings; `supabase/.temp/` is now ignored to keep local linkage state out of public commits. |

---

## Current Contradictions

- `run-doctor` still blocks closeout on a yellow `18/25` genome even though the repo's canonical truth surfaces are consistent enough for an honest manual closeout.
- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.
- `affiliate_coverage` is still red by design because no real approved tracking URLs exist locally; docs and verifier must keep saying that until the operator provides them.
- The live Pages bundle will not reflect the new `VITE_PG_FEATURE_PUSH_ALERTS` wiring until the next successful push/deploy cycle completes.

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
