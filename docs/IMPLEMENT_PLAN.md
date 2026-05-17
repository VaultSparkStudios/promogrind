# Implement Plan — PromoGrind Audit 2026-05-17

Source: `docs/AUDIT_2026-05-17.md`

## Sequence

1. `public-dist-exposure-gate` — foundational release/security gate before adding more browser surfaces.
2. `self-serve-data-controls` — trust/control UI and helper tests.
3. `operator-season-rail` — engagement loop built on existing mission/discipline data.
4. `friend-beta-feedback-summary` — manual proof evidence becomes durable feedback signal.
5. `ai-cost-contract-in-launch-gate` — launch command renders AI ledger after code changes settle.

## Verification

- Focused Vitest files for new helpers.
- `node scripts/check-public-dist-exposure.mjs` after build output exists.
- `npm test` and `npm run build` when implementation is complete.

