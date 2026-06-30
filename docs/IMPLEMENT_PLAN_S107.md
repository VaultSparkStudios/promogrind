# Implement Plan — S107

1. `windows-hide-window-storm-hardening` — shipped first because it was a live guard failure and directly protects single-terminal arc execution on Windows.
2. `local-innovation-pack-command` — shipped second because repeated sessions had to fall back manually when the primary genius list was empty.
3. `external-launch-proof-ledger` — honest deferral; requires real external evidence and cannot be faked or locally generated.

Verification surfaces:
- `node scripts/check-windows-hide.mjs`
- `node --check scripts/render-innovation-pack.mjs`
- `node scripts/ops.mjs innovation-pack --json`
- `npm test`
- `npm run verify:launch-local`