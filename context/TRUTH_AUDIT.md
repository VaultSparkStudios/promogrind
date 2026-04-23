<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-22 (S72)
Overall status: yellow
Next action: finish moving doctor/closeout generation onto the shared truth helper and stop treating yellow local genome states as hard-closeout blockers for public-safe repos; keep affiliate-link truth honest until real URLs exist.

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
| Schema alignment | 4 | `CURRENT_STATE.md`, `LATEST_HANDOFF.md`, `TASK_BOARD.md`, and `RELEASE_PLAN.md` now agree that live schema, billing auth, and VAPID plumbing are cleared; only affiliate-link inventory remains red. |
| Prompt/template alignment | 3 | Canonical template versions are aligned; doctor/autopilot assumptions still lag public-safe repo reality. |
| Derived-view freshness | 4 | Startup brief, compact handoff, release truth, and verifier evidence now describe the same S72 state, but not every closeout path is consolidated yet. |
| Handoff continuity | 4 | Session 72 handoff fully reflects shipped code, live production work, and the remaining blocker. |
| Contradiction density | 2 | Operational contradiction remains where yellow genome blocks autopilot even though repo truth is coherent enough for honest manual closeout. |
| **Total** | **17 / 25** | Yellow: truth is materially cleaner after live reconciliation, but autopilot policy still over-blocks public-safe repos. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | yellow | 2026-04-22 | Keep this file authoritative and avoid broad repair writes that collapse it. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-04-22 | S72 write-back complete; all context surfaces describe the current repo/live-prod state. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-22 | Keep manifest as source of capability truth. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-22 | Fresh rescore landed and derived IGNIS surfaces now agree on `47857 FORGE`. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | yellow | 2026-04-22 | More doctor/closeout surfaces now share the parser; finish the remaining renderers and relax yellow-genome autopilot blocking for public-safe repos. |
| Launch-proof truth | `scripts/verify-production-launch.mjs` + live Supabase/GitHub config | `docs/RELEASE_PLAN.md`, `context/TASK_BOARD.md`, handoff docs | green | 2026-04-22 | Live verifier now agrees with release docs: schema/billing/VAPID are fixed, affiliate coverage remains the sole red item. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-04-22 | 0 critical / 0 warning findings. 3 private files gitignored. |

---

## Current Contradictions

- `run-doctor` still blocks closeout on a yellow `14/25` genome even though the repo's canonical truth surfaces are consistent enough for an honest manual closeout.
- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.
- `affiliate_coverage` is still red by design because no real approved tracking URLs exist locally; docs and verifier must keep saying that until the operator provides them.

## Resolved This Session (S72)

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
