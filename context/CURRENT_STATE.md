# Current State — PromoGrind

Last updated: 2026-08-07 (Session 129 closeout boundary)

PromoGrind remains deployed/public-unlaunched in FORGE launch-hardening. S129 replaced the largest repo-owned release gaps with target-bound provider deployment, a stable Cloudflare staging plane, delivered security headers, end-to-end capture proof, and commit-ready production promotion. The separate SPARKED/public-launch decision remains HOLD until its external business and identity proofs are real.

Stable staging is live at `https://staging.promogrind.bet`. The exact verified artifact digest is `aedc3d7b8a5f39eb12c8441a7a60ee2a30f2b053f8bd17d21a22c2058959360b`; root, `/_health`, `/dashboard`, `/arb-scanner`, and `/pricing` return 200, all seven standard/health files pass, and CSP, HSTS, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, and Permissions-Policy are delivered. GitHub Pages remains the independent rollback origin and Cloudflare deployment receipts preserve the prior DNS record.

Supabase deployment authority is now fail-closed and pinned to PromoGrind project `fjnpzjjyhnpmunfoycrp`. The quota and newsletter migrations are applied, five provider Edge Functions are ACTIVE, authenticated quota exhaustion returns a hard 429, and receipts contain no credential values. Browser-key discovery accepts only target-valid public keys and ignores service/secret keys.

Capture truth is complete. An anonymous disposable lead insert returned 201, privileged readback observed the exact row, cleanup returned 204, and only an email hash is persisted in the public-safe receipt. The landing capture UI now reports success only after a successful response and exposes an accessible retry on failure.

Rendered UI verification is green. Four real-Chromium captures cover dark/light at 1440×1000 and 390×844; the landing theme control, legal footer, and calculator actions are at least 44×44, mobile has no horizontal overflow, and the hash-bound `docs/visual-qa/LATEST.json` passes CANON-053. The independent release-gate recheck also passed every touched state.

Verification is green on the integrated dependency tree: 103/103 Vitest files and 705/705 assertions, 52 runtime compatibility checks, all 15 Edge entrypoints, Studio Doctor 12/12 with `blockingFailing: 0`, tracked-secret and strict public sanitizer scans clean, and `npm run verify:launch-local` exits 0. The React Router advisory affects unstable React Server Components APIs; PromoGrind pins 7.18.2, uses client-only BrowserRouter, and mechanically forbids those APIs, so the architecture-specific posture check passes without claiming `npm audit` is globally green.

## Honest deferrals

- Production promotion is the next post-closeout action and must reuse the commit-addressed verified artifact with its DNS rollback receipt.
- SPARKED remains HOLD for Zoho send/receive/reply identity, live Obelisk delegation, production auth-email lifecycle, complete real Stripe lifecycle, independent friend beta, historical credential rotation/remediation, canonical cost reconciliation, and a distinct post-proof founder launch approval.
- Technical deployment authorization in S129 is not represented as completion of those business/external proofs.
- The optional Playwright CLI package was not installed because Package Trust scored it BLOCK; rendered verification reused the repository's bounded Chromium DevTools Protocol harness.

## Next actions

1. Commit and push the S129 closeout to `main`, rebuild from that commit, and promote the exact artifact to Cloudflare production with DNS rollback evidence.
2. Verify production routes, standard files, headers, capture-safe configuration, and staging/production digest parity; record the production receipts in the canonical proof graph.
3. Complete the remaining Zoho, Obelisk, auth-email, Stripe, friend, credential-remediation, cost, and post-proof founder criteria before any SPARKED reassessment.
