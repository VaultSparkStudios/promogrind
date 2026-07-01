# Implement Plan — S111

1. `startup-context-meter-render-extraction` — shipped; context-meter tile rendering now lives beside meter loading/fallback shaping in `scripts/lib/startup-context-meter-block.mjs`, with focused regression coverage.
2. `external-launch-proof-ledger` — honest deferral; real production/provider/tester evidence is still required and was not fabricated.

Verification surfaces:
- `node --check scripts/lib/startup-context-meter-block.mjs`
- `node --check scripts/render-startup-brief.mjs`
- `node --check scripts/test-studio-script-regressions.mjs`
- `node scripts/test-studio-script-regressions.mjs`
- `node scripts/render-startup-brief.mjs`
- `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md`
- `node scripts/check-windows-hide.mjs`
- `npm test`
- `npm run verify:launch-local`
