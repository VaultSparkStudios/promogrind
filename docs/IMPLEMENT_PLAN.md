# Implementation Plan — S117 Audit

Source of truth: `docs/AUDIT_2026-07-24.json`.

| Order | Audit item | Target depth | Why this order | Verification |
|---:|---|---|---|---|
| 1 | public-repo-secret-and-ops-purge | L3 | Immediate containment; scanner foundation protects every later edit | fixture rejection + all-tree/staged scans + Ark receipt |
| 2 | release-surface-contract | L3 | Establishes navigation, standard-file, rollback, and delivered-header gates before product changes | checker tests + launch-local + live probe |
| 3 | self-attestation-trust-boundary | L3 | Closes active forgeability/injection risk before trust UX expands | adversarial Passport/provenance tests + public verifier smoke |
| 4 | advisor-privacy-envelope | L3 | Establishes AI data boundary before copy and telemetry settle | UI/server privacy-contract tests + disclosure scan |
| 5 | multilingual-claims-totality | L3 | Remediates all locales after shared trust language is final | three-locale fixtures + full public claims scan |
| 6 | promo-observation-freshness-loop | L3 | Product façade builds on the corrected trust/claims primitives; token measurement runs last | freshness/feedback/UI tests + token-savings check |

Every item must reduce or protect time-to-first-value. Partial work is not shipped; real external proof remains deferred with explicit evidence.
