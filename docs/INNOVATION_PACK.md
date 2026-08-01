# Innovation Pack

> Generated: 2026-08-01 · 4 ranked candidates

Second-order genius list — drawn from brainstorm orphans, TODO markers, newly-shipped-but-unpolished code, SIL regressions, capability-map gaps, and cross-repo silence.

## Ranked candidates

| # | Source | Score | Title | Next action |
|---|---|---:|---|---|
| 1 | polish | 25 | Polish scripts/deploy-edge-functions.sh | Write a smoke test |
| 2 | polish | 25 | Polish scripts/migrate-cloud-to-selfhosted.sh | Write a smoke test |
| 3 | polish | 25 | Polish scripts/restore-to-selfhosted.sh | Write a smoke test |
| 4 | polish | 25 | Polish scripts/test-accessible-toggle-contract.mjs | Write a smoke test |

## Rationale

**1. Polish scripts/deploy-edge-functions.sh** — no test · missing Usage header
**2. Polish scripts/migrate-cloud-to-selfhosted.sh** — no test · missing Usage header
**3. Polish scripts/restore-to-selfhosted.sh** — no test · missing Usage header
**4. Polish scripts/test-accessible-toggle-contract.mjs** — no test · missing Usage header

## Saturation verdict

All remaining generated rows were premise-rejected against the live tree:

- `scripts/deploy-edge-functions.sh`, `scripts/migrate-cloud-to-selfhosted.sh`, and `scripts/restore-to-selfhosted.sh` do not exist. They are historical git-log paths, so creating placeholders would manufacture work and regress the public-repo shim.
- `scripts/test-accessible-toggle-contract.mjs` is itself a passing contract test. Requiring a second test for a test is recursive detector noise, not a product or infrastructure gap.

No live generated candidate remains open. The generator is intentionally left unmodified because its source belongs to the sibling Studio Ops repository; cross-repo fixes must travel through Studio Ark.

## Executed second-order ledger

| # | Candidate | Result | Direct verification |
|---|---|---|---|
| 1 | Supabase deploy entrypoint | Added leading usage contract plus named-function, pinned-target, secret-free dry-run, and wrong-target fail-closed coverage. | `node scripts/__tests__/deploy-supabase.test.mjs` |
| 2 | Protocol entropy entrypoint | Added nine-signal schema, bounded-score, and read-only non-mutation coverage. | `node scripts/__tests__/compute-entropy.test.mjs` |
| 3 | Public sanitization scanner | Added adversarial tracked-file/report fixtures; the fixture exposed and root-fixed explicit credential rules echoing matched secret values. | `node scripts/__tests__/check-public-repo-sanitization.test.mjs` |
| 4 | Launch-proof truth mirror | Added source-exactness and read-only freshness coverage plus usage documentation. | `node scripts/__tests__/generate-launch-proof-mirror.test.mjs` |
| 5 | Project-status truth mirror | Added source-exactness and read-only freshness coverage plus usage documentation. | `node scripts/__tests__/generate-project-status-mirror.test.mjs` |
| 6 | Public capability generator | Added fail-closed callable-tool, source-exactness, and read-only freshness coverage plus usage documentation. | `node scripts/__tests__/generate-public-capabilities.test.mjs` |
| 7 | Release attestation entrypoint | Added real temporary artifacts, render/verify, and artifact-drift fail-closed coverage plus usage documentation. | `node scripts/__tests__/render-release-attestation.test.mjs` |
| 8 | Doctor machine contract | Added exact probe-set, tally-coherence, drift-class, score-bound, and blocking-failure semantics. | `node scripts/__tests__/run-doctor.test.mjs` |
| 9 | Secret/history scanner discoverability | Made the existing adversarial suites discoverable under the generator's supported `scripts/__tests__/*.test.mjs` convention; added an explicit history-scanner Usage header. | `node scripts/__tests__/scan-git-history.test.mjs`; `node scripts/__tests__/scan-secrets.test.mjs` |

The root-level legacy scanner suites remain callable for compatibility; their convention entrypoints import the same implementation rather than duplicating assertions.
