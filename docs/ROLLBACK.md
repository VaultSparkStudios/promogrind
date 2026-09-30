# PromoGrind Rollback Plan

PromoGrind serves production from the Cloudflare Pages project `promogrind` at `https://promogrind.bet`. Stable staging is `https://staging.promogrind.bet` on `promogrind-staging`. Both projects use the `main` branch. `.github/workflows/deploy-pages.yml` promotes one built artifact through staging to production. Rollbacks use forward-moving Git history: never force-push or reset public `main`.

## Deployment contract

Run `npm run verify:launch-local` before promotion. Build once, deploy that directory to staging, then promote the same directory and commit using the staging receipt printed by the deployer:

```sh
npm run build:release
node scripts/deploy-cloudflare-pages.mjs --environment staging --apply --dist dist --commit <commit-sha>
npm run verify:web-live -- --url https://staging.promogrind.bet
node scripts/deploy-cloudflare-pages.mjs --environment production --apply --dist dist --commit <commit-sha> --staging-receipt <staging-receipt-path>
npm run verify:web-live -- --url https://promogrind.bet
```

Deployment receipts are written to `artifacts/cloudflare-pages/`. The deployer verifies the configured custom domain, six security headers, the exact commit and payload digest in `/_release.json`, and the deployed `index.html` hash. Production requires a matching successful staging receipt and rechecks the staging origin before upload. The receipt is a local action record, not a signed attestation. Preserve both receipts and confirm their full artifact digests match. A healthy `pages.dev` fallback cannot satisfy the custom-domain gate.

Backend deployment is separate. Inspect its target-bound plan with `node scripts/deploy-supabase.mjs --all --migration --json`; apply it with the same command plus `--apply` when backend changes are included. The only accepted Supabase project ref is `fjnpzjjyhnpmunfoycrp`. Confirm the affected backend behavior after deployment; a successful static-site upload does not prove backend release currency.

## Trigger

Rollback when the latest deployment introduces a blocking launch-gate regression, broken account/calculator flow, exposed private artifact, or materially unsafe public claim.

## Procedure

1. Identify the last known-green Cloudflare deployment receipt in `artifacts/cloudflare-pages/` and its commit-bound artifact digest. Save the failing deployment receipt and live-verification output.
2. Reproduce or classify the failure with `npm run verify:launch-local`.
3. Create a bounded revert commit: `git revert <bad-commit-sha>`.
4. Run `npm run verify:launch-local` against the reverted tree.
5. Push the revert to `main`; do not use `--force` or rewrite history. Rebuild the release artifact from that commit.
6. Run the staging-to-production sequence above with `<revert-sha>` and its new staging receipt. Preserve the restored artifact's commit and digest. If Cloudflare itself is impaired, evaluate a separately verified recovery origin before changing DNS; an old GitHub Pages URL or DNS snapshot alone does not prove a working replacement.
7. Confirm `CI` and the Cloudflare deployment workflow succeed, then run `npm run verify:web-live -- --url https://promogrind.bet` and the production dashboard smoke.
8. Record the failed commit, revert commit, Cloudflare deployment receipts, DNS action (if any), user impact, and follow-up root fix in the release record.

## Data and provider changes

Static-site rollback does not roll back Supabase migrations, Edge Functions, Stripe objects, or email routing. A Cloudflare promotion may change DNS; the deploy receipt stores the exact previous records. A DNS change requires separately verified delivery and must preserve unrelated mail records. Database corrections use a new forward migration. Provider changes require their own explicit rollback evidence and must target PromoGrind project ref `fjnpzjjyhnpmunfoycrp`; never infer provider state from repository state.

## Recovery proof

Recovery is complete only when local launch verification, CI, matching staging and production Cloudflare receipts, live web-contract verification, and the affected user journey are green. Deployment success does not clear public-launch proof requirements or change the project's FORGE status. If a required recovery check is skipped, keep release posture NO-GO and record why.
