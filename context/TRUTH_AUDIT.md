<!-- truth-audit-version: 1.1 -->
# Truth Audit

Last reviewed: 2026-04-22
Overall status: yellow
Next action: consolidate startup/closeout truth parsing into one tested helper so repaired repo-local truth stays stable across future automation passes.

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
| Schema alignment | 3 | `PROJECT_STATUS.json` was clobbered by repair automation and restored manually; manifest/runtime-pack now agree on deployed public-unlaunched state, but this path is still fragile. |
| Prompt/template alignment | 3 | Canonical template versions are aligned, but repo-local continuity files were still placeholders after ops repair and needed manual write-back. |
| Derived-view freshness | 3 | Revenue signals, IGNIS, contracts, runtime pack, genome history, and startup rendering were regenerated after status repair; the remaining drag is historical template-era output, not current generation failure. |
| Handoff continuity | 2 | `LATEST_HANDOFF.md` and `CURRENT_STATE.md` now reflect real work instead of scaffolds, but they are session-repair quality rather than closeout-quality narrative continuity. |
| Contradiction density | 2 | Major contradictions are reduced, but historical drift between status, doctor, contracts, and startup surfaces means the repo is not yet fully contradiction-clean. |
| **Total** | **13 / 25** | Yellow: core truth is restorable and mostly coherent, but derived surfaces remain vulnerable to repair-script regression. |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | startup brief, contracts, runtime pack | yellow | 2026-04-22 | Keep this file authoritative and avoid broad repair writes that collapse it. |
| Session continuity | `context/LATEST_HANDOFF.md` + `context/CURRENT_STATE.md` | startup brief | yellow | 2026-04-22 | Replace with closeout-grade notes at next session close. |
| Capability truth | `context/STUDIO_MANIFEST.json` | contracts, runtime pack | green | 2026-04-22 | Keep manifest as source of capability truth. |
| IGNIS truth | `context/PROJECT_STATUS.json` + local IGNIS history | `context/contracts/ignis.json`, startup brief | green | 2026-04-22 | Fresh rescore landed and derived IGNIS surfaces now agree on `47857 FORGE`. |
| Startup reliability | `scripts/render-startup-brief.mjs` + `scripts/lib/human-action-ages.mjs` | `docs/STARTUP_BRIEF.md` | yellow | 2026-04-22 | Monitor after helper restore; add regression coverage later. |

---

## Current Contradictions

- `context/PROJECT_STATUS.json` was briefly reduced to IGNIS-only fields by `ops-onboard --repair --write`; this audit reflects the manual restoration.
- Historical startup briefs and genome history snapshots contain template-era values (`0/25`, `0/1000`) that no longer describe the repo accurately.

## Resolved This Session

- Restored the missing `scripts/lib/human-action-ages.mjs` dependency so startup brief rendering no longer fails.
- Patched runtime-pack and local IGNIS rescoring to support single-repo/public-safe execution without a private portfolio registry.
- Repaired manifest/runtime-pack capability truth so the app is no longer misreported as lacking auth, AI, community, analytics, storage, or publishing.
