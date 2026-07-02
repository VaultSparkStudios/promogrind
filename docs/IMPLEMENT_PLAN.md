<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-07-01 · session 113 -->
<!-- source: docs/AUDIT_2026-07-01-S113.json -->

# Implement Plan — S113

Sequenced for optimal efficiency (Priority-per-hour, surface grouping, foundations first), not raw priority order. Budget ample (context 1M, <2% used) → default rung L2, climb where cheap.

| Seq | Slug | Tier | Rung | Rationale |
|---|---|:-:|:-:|---|
| 1 | public-repo-hygiene | 💡 | L3 | 30m quick win; cleans the tree before feature work; L3 folds root deploy-guide sweep. |
| 2 | edge-decay-heatmap-wiring | 🔥 | L2 | 2h 🔥; Track surface opens context reused by item 4. |
| 3 | operator-data-vault | 🔥 | L2 | Foundation: envelope + import feeds ProfilePanel tests in item 7. |
| 4 | intelligence-index | 🔥 | L2→L3 | Highest innovation; Track surface context still warm. |
| 5 | calculator-a11y-pass | ⚡ | L2 | UX sweep via shared ui.jsx primitives. |
| 6 | dashboard-memoization | 💡 | L2 | Probe-first; perf measured after features settle. |
| 7 | component-render-tests | ⚡ | L2 | Last so tests also cover vault/deck shipped above. |

Per item: implement → suite green (direct exit code) → bounded commit → session-floor gate.
