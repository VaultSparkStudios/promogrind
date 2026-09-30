# Release correctness implementation — S131

Source: AUDIT_2026-09-30.json. Six verified findings, no speculative feature expansion.

1. Reconcile incoming runtime exports and safety overlays; verify startup and compatibility.
2. Reject unauthenticated scheduler requests before effects; typecheck and test every handler.
3. Require exact owned-domain release binding and live staging proof for promotion.
4. Replace wrong-provider automation with one-build Cloudflare promotion and safe credential synchronization.
5. Repair navigation freshness and apply the reviewed dependency patch.
6. Run full local gates, stage, deploy functions, promote production, verify remote commit/artifact and complete write-back.

All six are selected at L3 where deployment proof applies. A failed check remains unresolved; historical green records are not reused as current evidence.
