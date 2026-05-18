<!-- generated-by: /implement skill v1.0 (S90) -->
<!-- generated-at: 2026-05-17 -->
<!-- source: docs/AUDIT_2026-05-17-S90.md -->

# Implement Plan — PromoGrind S90

Optimal-efficiency sequence (NOT raw priority order).

## In-scope this sprint (7 items)

1. **decision-journal-autogen** — 2h, small win, momentum starter
2. **counterfactual-pnl-ribbon** — 4h, same data surface as #1 (groups well)
3. **terms-drift-detector** — 6h, foundational trust primitive
4. **edge-half-life-scheduler** — 4h, extends S89 edgeDecay (same file)
5. **promo-conflict-detector** — 3h, Tracker surface
6. **bankroll-kelly-sandbox** — 3h, Profile surface
7. **operator-briefing-share-card** — 3h, canvas/share util

## Deferred to S91

- **swarm-confidence-badges** — needs CF Worker server piece for full value
- **promo-recipe-synthesis** — depends on edge-half-life + conflict-detector landing first; clean S91 cornerstone
- **ocr-settlement-paste** — large Tesseract.js dep, needs dedicated session for bundle measurement
- **calculator-lazy-route-split** — touches 53 imports; risky for shared session
- **ai-cost-crash-diet** — token axis last; should run AFTER S90 features land so 7-day ledger baseline includes them

## Execution mode

Core-first: ship deterministic `src/lib/*.js` modules + tests for all 7. UI wiring kept minimal/lightweight (focused integration points only). All modules side-effect-free, idempotent, ESM. No new AI cost on any item.

---
*Ready for sequential execution. /closeout after final test pass.*
