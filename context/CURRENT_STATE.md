# Current State — PromoGrind

Last updated: 2026-09-30 (Session 131)

PromoGrind is deployed/public-unlaunched in FORGE launch-hardening. All seven selected release-correctness outcomes are implemented and verified.

Commit be2da225f3e0bad3d4e76e9d34ce1a272cdd00a8 is verified at both https://staging.promogrind.bet and https://promogrind.bet with content digest 69e385912e300396bf4e8565ab3f94ad7c60f0d9a04fdc8dc194661ddd3b5d93. Exact owned-origin marker and served HTML hashes agree. Remote workflow evidence: https://github.com/VaultSparkStudios/promogrind/actions/runs/36668970501.

The release workflow now builds once and promotes identical bytes through stable Cloudflare staging to production. Production refuses a missing or mismatched staging receipt and rechecks the live staging origin. Rollback uses a reviewed forward revert through the same path. GitHub Pages is a historical fallback, not the release authority.

Four scheduled dispatchers reject missing or forged authority before database/notification work. All 15 functions are ACTIVE on the pinned PromoGrind project; migration application was a verified no-op. No authorized live notification job was triggered for testing.

Same-origin HTML navigation now fetches the current release first and preserves offline fallback. Pricing text uses semantic colors: inspected contrast is 5.08–10.12:1 dark and 6.12–6.92:1 light. Deno verification uses an isolated frozen Edge lock and leaves the frontend dependency tree unchanged. The locked nanoid patch clears the registry audit.

Verification: 104/104 Vitest files and 716/716 assertions; all 15 Edge entrypoints and 56/56 tests across 8 files; 101/101 runtime checks on the pre-commit changed surface and 54/54 after commit (coverage is diff-derived); full verify:launch-local exit 0; 40 inspected before/after captures; 15 ACTIVE deployed functions and 12/12 unauthorized scheduled requests rejected.

## Remaining work

- SPARKED/public launch remains HOLD. Zoho mailbox delivery/reply identity, live Obelisk delegation, auth-email, real Stripe lifecycle, independent friend beta, historical credential remediation, canonical cost reconciliation, and distinct post-proof founder launch approval remain unproved.
- CANON-054 public stats is deferred until a real privacy-preserving aggregate feed and sustainable refresh producer exist; no invented counts were published.
- The old revenue-evidence date remains stale; it was not advanced to manufacture green status.

## Continuity

S131 recovers the written record of S129 follow-up deployment/DNS/CDR commits and S130 dependency/generated-artifact commits after the latest complete SIL entry. S130 is an already-used session number; no retrospective SIL score was invented. See WORK_LOG and TRUTH_AUDIT for recovery and current evidence.
