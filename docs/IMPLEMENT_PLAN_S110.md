# Implement Plan — S110

1. `safe-spawn-helper-convergence` — shipped; closeout helper scripts now route child spawns through `scripts/lib/safe-spawn.mjs`.
2. `startup-context-meter-extraction` — shipped; live/fallback context-meter loading now lives in `scripts/lib/startup-context-meter-block.mjs` with focused regression coverage.
3. `external-launch-proof-ledger` — honest deferral; requires real production/provider/tester evidence and cannot be faked locally.

Verification surfaces:
- `node scripts/check-windows-hide.mjs`
- `node scripts/record-skill-cost.mjs --skill audit --phase smoke`
- `node scripts/session-floor.mjs --json`
- `node scripts/render-startup-brief.mjs`
- `node scripts/validate-brief-format.mjs docs/STARTUP_BRIEF.md`
- `npm test`
- `npm run verify:launch-local`