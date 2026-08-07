# Current State — PromoGrind

Last updated: 2026-08-07 (Session 129 closeout boundary)

PromoGrind remains deployed/public-unlaunched in FORGE launch-hardening. S129 replaced the largest repo-owned release gaps with target-bound provider deployment and completed the Cloudflare staging-to-production promotion. The separate SPARKED/public-launch decision remains HOLD until its external business and identity proofs are real.

Stable staging at `https://staging.promogrind.bet` and production at `https://promogrind.bet` serve the exact commit-bound artifact digest `82f29e7c535ed5c9a548bd5d4543e3e98b2144cd7798462d05dd7c0b4ebc18ab` from commit `7a6a3a2`. Root, `/_health`, `/dashboard`, `/arb-scanner`, and `/pricing` return 200, all seven standard/health files pass, and CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, and Permissions-Policy are delivered. GitHub Pages remains the independent rollback origin. The production cutover preserved Cloudflare Email Routing MX/TXT records, and the pre-cutover GitHub Pages CNAME snapshot is retained for exact rollback.

Supabase deployment authority is now fail-closed and pinned to PromoGrind project `fjnpzjjyhnpmunfoycrp`. The quota and newsletter migrations are applied, five provider Edge Functions are ACTIVE, authenticated quota exhaustion returns a hard 429, and receipts contain no credential values. Browser-key discovery accepts only target-valid public keys and ignores service/secret keys.

Capture truth is complete. An anonymous disposable lead insert returned 201, privileged readback observed the exact row, cleanup returned 204, and only an email hash is persisted in the public-safe receipt. The landing capture UI now reports success only after a successful response and exposes an accessible retry on failure.

Rendered UI verification is green. Four real-Chromium captures cover dark/light at 1440×1000 and 390×844; the landing theme control, legal footer, and calculator actions are at least 44×44, mobile has no horizontal overflow, and the hash-bound `docs/visual-qa/LATEST.json` passes CANON-053. The independent release-gate recheck also passed every touched state.

Verification is green on the integrated dependency tree: 103/103 Vitest files and 705/705 assertions, 52 runtime compatibility checks, all 15 Edge entrypoints, Studio Doctor 12/12 with `blockingFailing: 0`, tracked-secret and strict public sanitizer scans clean, and `npm run verify:launch-local` exits 0. The React Router advisory affects unstable React Server Components APIs; PromoGrind pins 7.18.2, uses client-only BrowserRouter, and mechanically forbids those APIs, so the architecture-specific posture check passes without claiming `npm audit` is globally green.

## Honest deferrals

- Production deployment is complete; this does not satisfy or waive the remaining SPARKED criteria.
- SPARKED remains HOLD for Zoho send/receive/reply identity, live Obelisk delegation, production auth-email lifecycle, complete real Stripe lifecycle, independent friend beta, historical credential rotation/remediation, canonical cost reconciliation, and a distinct post-proof founder launch approval.
- Technical deployment authorization in S129 is not represented as completion of those business/external proofs.
- The optional Playwright CLI package was not installed because Package Trust scored it BLOCK; rendered verification reused the repository's bounded Chromium DevTools Protocol harness.

## Next actions

1. Complete the remaining Zoho alias/DNS/delivery/reply and live Obelisk delegation proofs.
2. Complete production auth-email, real Stripe lifecycle, and independent friend-beta proofs.
3. Complete historical credential remediation, canonical cost reconciliation, and a distinct post-proof founder approval before any SPARKED reassessment.
