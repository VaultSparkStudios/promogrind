# PromoGrind Rollback Plan

PromoGrind serves production from the Cloudflare Pages project `promogrind-production`, promoted with `scripts/deploy-cloudflare-pages.mjs`. Stable staging is `staging.promogrind.bet` on `promogrind-staging`. GitHub Pages remains the independently deployed rollback origin through `.github/workflows/deploy-pages.yml`. Rollbacks are forward-moving Git history: never force-push or reset public `main`.

## Trigger

Rollback when the latest deployment introduces a blocking launch-gate regression, broken account/calculator flow, exposed private artifact, or materially unsafe public claim.

## Procedure

1. Identify the last known-green Cloudflare deployment receipt in `artifacts/cloudflare-pages/` and its commit-bound artifact digest. Save the failing deployment receipt and live-verification output.
2. Reproduce or classify the failure with `npm run verify:launch-local`.
3. Create a bounded revert commit: `git revert <bad-commit-sha>`.
4. Run `npm run verify:launch-local` against the reverted tree.
5. Push the revert to `main`; do not use `--force` or rewrite history. Rebuild the release artifact from that commit.
6. Redeploy the reverted artifact with `node scripts/deploy-cloudflare-pages.mjs --environment production --apply --dist dist --commit <revert-sha>`. If the Cloudflare project itself is impaired, restore the exact production DNS record from the `production-dns-before-*.json` receipt so `promogrind.bet` points to the GitHub Pages rollback origin.
7. Confirm `CI` and `Deploy Pages` succeed, then run `npm run verify:web-live -- --url https://promogrind.bet` and the production dashboard smoke.
8. Record the failed commit, revert commit, Cloudflare and GitHub deployment receipts, DNS action (if any), user impact, and follow-up root fix in `logs/WORK_LOG.md` and `context/TRUTH_AUDIT.md`.

## Data and provider changes

Static-site rollback does not roll back Supabase migrations, Edge Functions, Stripe objects, or email routing. A Cloudflare promotion may change DNS; the deploy receipt stores the exact previous record and rollback target. Database corrections use a new forward migration. Provider changes require their own explicit rollback evidence and must target PromoGrind project ref `fjnpzjjyhnpmunfoycrp`; never infer provider state from repository state.

## Recovery proof

Recovery is complete only when local launch verification, CI, the active Cloudflare deployment, the GitHub Pages rollback deployment, live web-contract verification, and the affected user journey are green. If any check is skipped, keep release posture NO-GO and record why.
