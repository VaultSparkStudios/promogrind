# Implement Plan — 2026-06-18

Source: `docs/AUDIT_2026-06-18.json`

## Wave Plan

1. **sil-forecast-parser-honesty** — foundational startup truth bug; shipped first because it corrected a false `0/1000` forecast.
2. **closeout-live-url-truth** — closeout UX truth bug; shipped while the board renderer was already in context.
3. **brief-validator-budget-and-coherence-gate** — verified existing in-flight validator work after regenerating the corrected startup brief.
4. **doctor-provenance-single-predicate** — verified existing in-flight doctor/provenance work against the live doctor path.
5. **refresh-stale-revenue-and-ignis** — deferred to next cleanup because doctor marks both as advisory derived-surface staleness, not local implementation failure.

## Verification Bundle

- `node scripts/lib/sil-forecaster.mjs --json`
- `node scripts/render-startup-brief.mjs`
- `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md --json`
- `node scripts/render-closeout-board.mjs --stdout`
- `node scripts/test-validate-closeout-board-format.mjs`
- `node scripts/test-validate-brief-format.mjs`
- `node scripts/classify-warning-provenance.mjs --json`
- `node scripts/ops.mjs doctor --update-json`
