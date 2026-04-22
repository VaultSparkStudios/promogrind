<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-22 (S71)
Overall status: yellow
Next action: finish moving doctor/closeout generation onto the shared truth helper and stop treating yellow local genome states as hard-closeout blockers for public-safe repos.

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
| Schema alignment | 3 | `PROJECT_STATUS.json`, `CURRENT_STATE.md`, and `LATEST_HANDOFF.md` now agree on the shipped boot-fix + workflow-routing tranche. Live Supabase migration status is still manual truth. |
| Prompt/template alignment | 3 | Canonical template versions are aligned; doctor/autopilot assumptions still lag public-safe repo reality. |
| Derived-view freshness | 4 | Startup brief, compact handoff, state vector, and more doctor/closeout surfaces now read the shared parsing helper, but not every closeout path is consolidated yet. |
| Handoff continuity | 3 | Session 71 handoff fully reflects shipped work; all context files updated in the same closeout pass. |
| Contradiction density | 2 | Operational contradiction remains where yellow genome blocks autopilot even though repo truth is coherent. 3 private files are now gitignored (not deleted) — no tracking contradiction. |
| **Total** | **15 / 25** | Yellow: core truth is coherent and drift is lower, but derived automation surfaces and autopilot rules still lag. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | yellow | 2026-04-22 | Keep this file authoritative and avoid broad repair writes that collapse it. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | green | 2026-04-22 | S71 write-back complete; all context surfaces describe current repo state. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-22 | Keep manifest as source of capability truth. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-22 | Fresh rescore landed and derived IGNIS surfaces now agree on `47857 FORGE`. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | yellow | 2026-04-22 | More doctor/closeout surfaces now share the parser; finish the remaining renderers and relax yellow-genome autopilot blocking for public-safe repos. |
| Public-repo sanitization | `.gitignore` + git tracking | public commits | green | 2026-04-22 | 0 critical / 0 warning findings. 3 private files gitignored. |

---

## Current Contradictions

- `run-doctor` still blocks closeout on a yellow `14/25` genome even though the repo's canonical truth surfaces are consistent enough for an honest manual closeout.
- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.

## Resolved This Session (S71)

- Restored `DepositMatch` and removed the app-load boot failure caused by `DepositMatch is not defined`.
- Added `src/workflows/suggestions.js` and routed scanner/community/launch queue actions through shared workflow-ready payload builders.
- Moved `run-doctor`, `render-ops-cockpit`, `score-tasks`, and `closeout-summary` onto the shared context parsing helper.
- Refreshed release-plan truth to reflect current tests and actual launch blockers.

## Resolved in S69

- Added gamification source modules (`src/lib/mastery.js`, `src/lib/achievements.js`, `src/lib/missions.js`) — new canonical sources for engagement data.
- Added `flagVisit` helper and wired all 4 previously un-completable mission check flags.
- Untracked `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, `scripts/soul-interview.mjs` from git; added to `.gitignore`. Public-repo sanitization scan now clean.
- Refreshed handoff, work log, decisions, SIL, and state surfaces to describe S69.
