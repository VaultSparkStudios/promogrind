# External Launch Proof Ledger

> Generated: 2026-07-26 | Project: PromoGrind | Session: 119

This ledger is an honesty surface. It records proof gates that require real-world evidence and must not be marked complete from local code alone.

## Summary

- Live URL: https://promogrind.bet
- Project-status external blockers: 8
- Proof-contract coverage: 8/8 blockers mirrored
- Unmirrored blockers: 0
- Blocking canonical launch proofs: 6
- Target-authorized launch capabilities: 3/5 (fresh)

## Canonical Launch Proofs

| Proof | Status | Blocking | Required For | Evidence Items | Next Step |
|---|---|---:|---|---:|---|
| Sportsbook monetization coverage | partial / advisory | no | marketing-push | 0/2 | Optional: apply to affiliate networks (Income Access, FanCompass) for the 3 advisory books. Not required for launch. |
| Real Stripe smoke | pending | yes | full-launch, marketing-push | 0/4 | Run docs/STRIPE_SMOKE_TEST.md against the deployed app with a real checkout, then record the checkout/session/subscription/customer-portal evidence. |
| Friend-facing beta pass | pending | yes | soft-launch, marketing-push, full-launch | 0/5 | Have one trusted tester complete account creation/sign-in, confirmation or password recovery visibility, a top calculator, a sportsbook CTA review, and pricing review after deploy. |
| Production auth email smoke | pending | yes | soft-launch, full-launch, marketing-push | 0/6 | Run `npm run smoke:auth-email -- --record` after creating a fresh production account and completing the confirmation/resend/reset flow. Record only masked email and provider IDs; never paste email bodies, tokens, passwords, or full auth links. |
| On-domain contact email delivery | pending | yes | soft-launch, full-launch, marketing-push | 1/3 | Use the Studio Ops Brevo capability to verify SPF/DKIM and deliver a redacted test message through contact@promogrind.bet to founder@vaultsparkstudios.com. |
| AI quota migration and provider deployment | pending | yes | soft-launch, full-launch, marketing-push | 0/3 | Resolve promogrind.supabase.deploy through the secrets gateway, deploy migration 20260723021000_ai_quota_claim.sql and the five provider functions to fjnpzjjyhnpmunfoycrp, then record redacted deployment IDs. |
| Production capture public-key configuration | pending | yes | soft-launch, full-launch, marketing-push | 0/3 | Provide the browser-safe anon key through the production deploy configuration and run a real capture submission without committing the key to this repository. |

## Project Status Blockers

| Category | Mirrored In Launch Proofs | Blocker |
|---|---:|---|
| brevo | yes | Brevo sender-domain SPF/DKIM is verified and recorded as proof 1/3; exact contact@promogrind.bet forwarding inspection remains pending because all available Cloudflare tokens return 403 for Email Routing Rules Read. |
| auth-email | yes | Run real production auth email smoke with npm run smoke:auth-email -- --record: confirmation delivery/resend, forgot-password email, recovery link, and new-password sign-in. |
| stripe | yes | Run one real Stripe smoke purchase and verify the post-checkout portal/subscription path (runner ready: npm run smoke:stripe -- --record). |
| friend-beta | yes | Complete one friend-facing auth/recovery/calculator/pricing pass (runner ready: npm run beta:check -- --record). |
| supabase-capability | yes | PromoGrind Supabase REST service scope is target-authorized, but CLI deployment still lacks a target-bound access token; Ark cargo 01JUE23NQ1EEF6010874B09F97 requests deploy scope before 20260723021000_ai_quota_claim.sql and five provider functions are deployed. |
| capture-config | yes | S119 Pages build now injects the browser-safe Supabase anon key into every static capture page; live capture submission proof awaits deployment. |
| supabase-capability | yes | Rotate the historical privileged Supabase token isolated at commit b1205ce through the Studio secrets gateway; redacted Ark request 01JUE23NQ1EEF6010874B09F97 is pending. |
| capture-config | yes | AI pixel inspection remains partial: S118 captured and hashed desktop/mobile dark/light screenshots and found zero live computed-style contrast failures, but the connected image viewer failed before pixel review. |

## Target-Bound Capability Receipt

> Checked: 2026-07-26T01:39:33.674Z

| Capability | Target | State | Ready | Reason |
|---|---|---|---:|---|
| Cloudflare response-header rules | promogrind.bet | authenticated | no | Credential authenticates to the zone but lacks response-header rules scope. |
| Brevo sender-domain authentication | promogrind.bet | authorized | yes | Target sender domain is authenticated. |
| PromoGrind Supabase project access | fjnpzjjyhnpmunfoycrp | authorized | yes | Target project REST surface authorized the service credential. |
| Stripe account mode | live | authorized | yes | Live account authorized (US). |
| Production capture configuration | https://promogrind.bet/js/pg-capture.js | authenticated | no | Capture code is live, but the production page has no browser-safe key configuration. |

## Completion Rule

Only record completion through the existing proof-specific runners or `scripts/update-launch-proof.mjs` with redacted evidence. Do not paste secrets, tokens, passwords, full email bodies, or full auth links into this repo.

*Generated by `scripts/render-external-launch-proof-ledger.mjs`.*
