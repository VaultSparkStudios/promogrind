# Implementation Plan — S119

Source of truth: `docs/AUDIT_2026-07-25.json`.

Execution depth: L3 for all items. Context meter: CONTINUE with ample budget.

| Order | Audit item | Why this order | Required verification |
|---:|---|---|---|
| 1 | `startup-brief-provenance-lattice` | Small, foundational observability repair; removes lying session signals before later generated surfaces depend on them. | Brief golden/unit tests, regenerated brief, format validator |
| 2 | `streaming-secret-archaeology` | Independent security root-fix with a reproduced performance failure; yields trustworthy history evidence for closeout. | Scanner fixture tests, bounded full-history JSON run |
| 3 | `launch-proof-evidence-quorum` | Establishes the criterion/receipt contract before capability probes feed evidence into it. | Schema/unit/adversarial tests, migrated ledger, launch-local |
| 4 | `target-bound-capability-truth-plane` | Consumes the proof contract and resolves the largest launch-blocker ambiguity with target/scope-aware receipts. | Offline fixtures, live redacted probe, ledger integration, launch-local |

No package additions are planned. External mutations remain fail-closed and require both explicit `--apply` and the mapped capability; read-only probes are the default.

## Skill shim notes

- `scripts/lib/audit-sidecar.mjs`, `scripts/lib/sprint-runner.mjs`, and `scripts/lib/medium-quality-gates.mjs` are absent in this public repo; manual protocol fallbacks are in use.
- Every new command option must expose `--help` text and at least one README example.
