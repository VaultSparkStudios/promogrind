# PromoGrind Rollback Plan

PromoGrind deploys `main` to GitHub Pages through `.github/workflows/deploy-pages.yml`. Rollbacks are forward-moving Git history: never force-push or reset public `main`.

## Trigger

Rollback when the latest deployment introduces a blocking launch-gate regression, broken account/calculator flow, exposed private artifact, or materially unsafe public claim.

## Procedure

1. Identify the last known-green commit from the successful `Deploy Pages` run and save the failing run URL.
2. Reproduce or classify the failure with `npm run verify:launch-local`.
3. Create a bounded revert commit: `git revert <bad-commit-sha>`.
4. Run `npm run verify:launch-local` against the reverted tree.
5. Push the revert to `main`; do not use `--force` or rewrite history.
6. Confirm the new `Deploy Pages` and `CI` runs succeed, then run `npm run verify:web-live -- --url https://promogrind.bet` and the production dashboard smoke.
7. Record the failed commit, revert commit, workflow runs, user impact, and follow-up root fix in `logs/WORK_LOG.md` and `context/TRUTH_AUDIT.md`.

## Data and provider changes

Static-site rollback does not roll back Supabase migrations, Edge Functions, Stripe objects, email routing, or DNS. Database corrections use a new forward migration. Provider changes require their own explicit rollback evidence and must target PromoGrind project ref `fjnpzjjyhnpmunfoycrp`; never infer provider state from repository state.

## Recovery proof

Recovery is complete only when local launch verification, CI, Pages deployment, live web-contract verification, and the affected user journey are green. If any check is skipped, keep release posture NO-GO and record why.
