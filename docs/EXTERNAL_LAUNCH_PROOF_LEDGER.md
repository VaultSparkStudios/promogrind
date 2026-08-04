# External Launch Proof Ledger

> Generated: 2026-08-03 | Project: PromoGrind | Session: 125

This ledger is an honesty surface. It records proof gates that require real-world evidence and must not be marked complete from local code alone.

## Summary

- Live URL: https://promogrind.bet
- Project-status external blockers: 9
- Proof-contract coverage: 9/9 blockers mirrored
- Unmirrored blockers: 0
- Blocking canonical launch proofs: 10
- Target-authorized launch capabilities: 0/5 (stale — not trusted)

## Canonical Launch Proofs

| Proof | Status | Blocking | Required For | Evidence Items | Next Step |
|---|---|---:|---|---:|---|
| Sportsbook monetization coverage | partial / advisory | no | marketing-push | 0/2 | Optional: apply to affiliate networks (Income Access, FanCompass) for the 3 advisory books. Not required for launch. |
| Real Stripe smoke | pending | yes | full-launch, marketing-push | 0/4 | Run docs/STRIPE_SMOKE_TEST.md against the deployed app with a real checkout, then record the checkout/session/subscription/customer-portal evidence. |
| Friend-facing beta pass | pending | yes | soft-launch, marketing-push, full-launch | 0/5 | Have one trusted tester complete account creation/sign-in, confirmation or password recovery visibility, a top calculator, a sportsbook CTA review, and pricing review after deploy. |
| Production auth email smoke | pending | yes | soft-launch, full-launch, marketing-push | 0/6 | Run `npm run smoke:auth-email -- --record` after creating a fresh production account and completing the confirmation/resend/reset flow. Record only masked email and provider IDs; never paste email bodies, tokens, passwords, or full auth links. |
| Zoho on-domain contact email delivery and reply identity | pending | yes | soft-launch, full-launch, marketing-push | 0/3 | Resolve zoho.mail.admin through the secrets gateway, attach contact@promogrind.bet to the founder mailbox, verify MX/SPF/DKIM/DMARC, then record redacted delivery and reply-as-alias receipts. |
| AI quota migration and provider deployment | pending | yes | soft-launch, full-launch, marketing-push | 0/3 | Resolve promogrind.supabase.deploy through the secrets gateway, deploy migration 20260723021000_ai_quota_claim.sql and the five provider functions to fjnpzjjyhnpmunfoycrp, then record redacted deployment IDs. |
| Production capture public-key configuration | pending | yes | soft-launch, full-launch, marketing-push | 1/3 | Provide the browser-safe anon key through the production deploy configuration and run a real capture submission without committing the key to this repository. |
| Stable staging and delivered edge hardening | pending | yes | soft-launch, full-launch, marketing-push | 0/3 | Provision stable staging, prove config parity and health, then verify all six headers on the delivered response. |
| Live Obelisk identity delegation | pending | yes | soft-launch, full-launch, marketing-push | 0/2 | Resolve the Obelisk relying-party capability and record redacted account-lifecycle and agent-identity exchange receipts. |
| Historical credential rotation and remediation | pending | yes | soft-launch, full-launch, marketing-push | 0/2 | Rotate every affected credential, verify provider revocation, and execute only the founder-approved history-remediation path. |
| Founder launch approval | pending | yes | soft-launch, full-launch, marketing-push | 0/1 | After every blocking proof is complete, record explicit founder approval without secrets or private identity data. |

## Project Status Blockers

| Category | Mirrored In Launch Proofs | Blocker |
|---|---:|---|
| staging-edge | yes | No true remote staging environment is configured; production promotion cannot satisfy CANON-007 staging proof. |
| staging-edge | yes | Production edge is missing Content-Security-Policy, Strict-Transport-Security, X-Content-Type-Options, Referrer-Policy, X-Frame-Options, and Permissions-Policy. |
| credential-remediation | yes | Five fully redacted credential findings remain in historical commit b1205ce; current tracked tree is clean, but rotation and approved history remediation are unproved. |
| obelisk-delegation | yes | The contact@promogrind.bet Zoho send/receive alias, MX/SPF/DKIM/DMARC posture, delivery, and reply-as-alias identity remain unproved; Brevo is transactional/app email only. |
| supabase-capability | yes | promogrind.supabase.deploy is MISSING; migration 20260723021000_ai_quota_claim.sql and target-pinned functions were not deployed. |
| auth-email | yes | Production auth confirmation/resend/reset/recovery delivery proof is pending. |
| stripe | yes | Real Stripe checkout/webhook/subscription/portal lifecycle proof is pending. |
| friend-beta | yes | One friend-facing auth/recovery/calculator/pricing pass is pending. |
| capture-config | yes | Capture submission and observable lead-row criteria remain pending. |

## Target-Bound Capability Receipt

> Checked: 2026-08-01T06:08:58.093Z

| Capability | Target | State | Ready | Reason |
|---|---|---|---:|---|
| Cloudflare response-header rules | promogrind.bet | authenticated | no | Credential authenticates to the zone but lacks response-header rules scope. |
| Brevo sender-domain authentication | promogrind.bet | authorized | yes | Target sender domain is authenticated. |
| PromoGrind Supabase project access | fjnpzjjyhnpmunfoycrp | authorized | yes | Target project REST surface authorized the service credential. |
| Stripe account mode | live | authorized | yes | Live account authorized (US). |
| Production capture configuration | https://promogrind.bet/js/pg-capture.js | authorized | yes | Production capture page includes browser-safe configuration. |

## Completion Rule

Only record completion through the existing proof-specific runners or `scripts/update-launch-proof.mjs` with redacted evidence. Do not paste secrets, tokens, passwords, full email bodies, or full auth links into this repo.

*Generated by `scripts/render-external-launch-proof-ledger.mjs`.*
