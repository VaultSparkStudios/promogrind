# Stack review — October 8, 2026

The current application remains React 18 with Vite 6, Supabase, Cloudflare Pages, Sentry and PostHog. Compatible minor and patch updates were installed from the reviewed lockfile with lifecycle scripts disabled. The installed versions and the lockfile were checked separately.

| Component | Installed version | Decision |
|---|---|---|
| React / React DOM | 18.3.1 | Preserve the intentional major-version pin. |
| Vite | 6.4.4 | Apply the supported-line update. |
| Supabase client | 2.117.3 | Apply compatible update; verify project identity separately. |
| Sentry React | 10.76.1 | Apply compatible update. |
| PostHog | 1.438.2 | Apply reviewed official registry release. |
| sharp | 0.35.5 | Apply security update. |
| source-map-js | 1.2.2 | Apply security update. |
| DOMPurify | 3.4.16 | Apply security update. |

The local npm audit reports zero known vulnerabilities across 237 packages. This does not prove that every dependency is risk-free. Supply-chain checks report zero blocks and three existing lifecycle-script review entries; installation did not execute those scripts.

## Build and delivery

Project-owned CI and Pages release workflows now select Node 24 LTS and official GitHub actions pinned to verified release commits: checkout 7.0.1, setup-node 7.0.0 and upload-artifact 7.0.1. Local application checks use Node 24. Hosted workflow execution remains unverified until these changes run in CI. Node 20 is end of life; the canonical, propagation-owned brief-format workflow still selects it and requires a Studio Ops source update rather than a recipient-only edit. [Node release schedule](https://github.com/nodejs/Release), [checkout release](https://github.com/actions/checkout/releases/tag/v7.0.1), [setup-node release](https://github.com/actions/setup-node/releases/tag/v7.0.0), [artifact release](https://github.com/actions/upload-artifact/releases/tag/v7.0.1).

Artifact upload 7.0.2 was released October 7, less than 24 hours before this review. Preserve 7.0.1 through the release cooldown rather than immediately adopting that new release. React 19, newer Vite/plugin majors and Vitest 5 require separate migration acceptance; version freshness alone does not justify replacing working major-version pins.

The existing release path builds once, checks stable staging, promotes identical bytes and preserves rollback receipts. Current source changes still need a commit-bound CI run and staging/production readback before delivery can be claimed.

## Service evidence

The capability probe reports four of five checks ready: email-domain authentication, the Stripe account, browser capture configuration and the exact Supabase project's management access. The Supabase management response proves project authority, not successful database REST operations or an authenticated customer journey. These distinctions remain explicit in the probe and regression tests.

The Cloudflare header-transform capability returned a scoped-access denial. Existing Pages response headers have a working alternative and live header checks passed against the previously deployed version. Broader Cloudflare access is not needed solely to satisfy those response-header checks. The current candidate still requires its own readback.

## Remaining acceptance

Published-policy corrections are approved and applied. Complete the current source-bound visual receipt, exact-candidate staging and public delivery evidence. Preserve the separate approval requirements for paid checkout, account/email journeys, public beta and production launch. No new paid service or broader credential access was enabled during this work.
