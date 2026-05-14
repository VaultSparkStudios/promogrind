<!-- fallback truncation (no API key) -->

# Latest Handoff

Last updated: 2026-05-13 (S86)
Session: 86
Session Intent: Separate PromoGrind create-account/sign-up from Studio membership because cross-project Studio membership is not fully integrated yet, then close out, commit, and push with all repo truth surfaces updated.
Intent Outcome: Achieved for repo-controllable work. PromoGrind account/signup is now explicit and standalone across app, auth, profile/account help, legal/data, smoke checks, and generated public trust copy. External/manual launch proofs remain honest blockers: approved BetMGM/bet365/BetRivers tracking URLs, one real Stripe smoke purchase, one friend beta pass with account-recovery visibility, and a production auth email pass after deploy.

## Where We Left Off (Session 86)

- Separated PromoGrind account creation from Studio membership in the auth modal, member welcome copy, footer access copy, Terms, Privacy, Data Policy, and generated public HTML trust/footer copy.
- Removed the user-facing Vault account portal path from profile/account surfaces; logged-in account help now routes to PromoGrind support instead of implying a shared Studio membership portal.
- Removed the unused `VAULT_ACCOUNT_PORTAL_URL` export after decoupling the account UI from the Vault member portal.
- Updated `src/auth.js` comments/log prefixes from shared Vault identity language to PromoGrind account auth language.
- Expanded `scripts/validate-auth-launch-smoke.mjs` so auth/account surfaces fail if Vault account/membership, cross-Studio sync, or connected-VaultSpark-tool claims return.
- Verification passed: `npm run smoke:auth`, `npm run smoke:launch`, `npm run build`, and `npm test` (396/396).

## Verification (Session 86)

- `npm run smoke:auth` — passing.
- `npm run smoke:launch` — passing.
- `npm run build` — passing.
- `npm test` — 396/396 passing.

## What is mid-flight

- Deploy S86 to production, then run a real auth email smoke: create account, confirmation delivery/resend, forgot-password email, recovery link to `?auth=update-password`, and new-password sign-in.
- Real affiliate/referral tracking URLs for `BetMGM`, `bet365`, `BetRivers` remain operator/partner-blocked.
- Real Stripe smoke purchase remains pending (`npm run smoke:stripe -- --record`).
- Friend-facing auth/recovery/calculator/CTA/pricing pass remains pending (`npm run beta:check -- --record`).
- Continued `src/App.jsx` decomposition remains valuable; App.jsx still carries several large inline surfaces.

## What to do next

1. Let GitHub Pages deploy S86, then run the production auth email smoke and ingest the deploy artifact with `npm run ingest:launch`.
2. Complete `npm run beta:check -- --record` with a trusted tester after deploy.
3. Complete `npm run smoke:stripe -- --record` with one real checkout when operator is ready.
4. Add approved BetMGM/bet365/BetRivers tracking URLs when partner approvals arrive, then rerun `npm run verify:production`.
5. Continue extracting another `src/App.jsx` seam once launch proof is no longer the active bottleneck.

## Constraints