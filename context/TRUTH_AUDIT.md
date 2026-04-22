<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-22
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
| Schema alignment | 3 | `PROJECT_STATUS.json`, `CURRENT_STATE.md`, and `LATEST_HANDOFF.md` now agree on the shipped shared-shell/workflow/AI tranche, but live Supabase migration status is still manual truth. |
| Prompt/template alignment | 3 | Canonical template versions are aligned and closeout surfaces are no longer scaffold-grade, though doctor/autopilot assumptions still lag the public-safe repo reality. |
| Derived-view freshness | 3 | Startup brief, compact handoff, state vector, and other derived surfaces can now read the shared parsing helper, but some doctor/closeout paths still use duplicated logic. |
| Handoff continuity | 2 | Session 67 handoff now reflects the shipped architecture tranche; the remaining weakness is that autopilot cannot carry that continuity through automatically. |
| Contradiction density | 2 | The big local contradictions are resolved, but the repo still has an operational contradiction where truthful yellow genome state is treated as a blocking closeout failure. |
| **Total** | **13 / 25** | Yellow: core truth is restorable and mostly coherent, but derived surfaces remain vulnerable to repair-script regression. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | yellow | 2026-04-22 | Keep this file authoritative and avoid broad repair writes that collapse it. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief, audit JSON, compact handoff | yellow | 2026-04-22 | Maintain manual closeout write-back until autopilot stops blocking on non-red local genome states. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-22 | Keep manifest as source of capability truth. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-22 | Fresh rescore landed and derived IGNIS surfaces now agree on `47857 FORGE`. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/context-parsing.mjs` | `docs/STARTUP_BRIEF.md` | yellow | 2026-04-22 | Extend the same parser into doctor/closeout surfaces so startup is not the only truthful renderer. |

---

## Current Contradictions

- `run-doctor` still blocks closeout on a yellow `13/25` genome even though the repo’s canonical truth surfaces are consistent enough for an honest manual closeout.
- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.

## Resolved This Session

- Added `scripts/lib/context-parsing.mjs` and moved startup/state-vector rendering onto the shared truth parser.
- Refreshed handoff, task, state, status, and audit surfaces so Session 67 architecture work is now the canonical repo narrative.
- Reduced local orchestration drift by centralizing app-shell, workflow, and AI seams instead of continuing component-local truth and routing.
