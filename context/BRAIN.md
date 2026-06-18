# Brain

Use this file to capture the best current strategic intelligence of the project.

## Mental model

- how this project wins: PromoGrind wins by being the most trustworthy operator co-pilot for sportsbook promos: calculators, tracking, recommender logic, receipts, and discipline loops all point to better decisions instead of higher betting volume.
- what matters most: launch truth, clean verification, local-first user trust, and proof-backed claims. Security/tooling health matters because public trust collapses if dependency, secret, or launch surfaces drift.
- what tradeoffs we gladly make: keep external proof gates honest even if it delays public marketing; prefer deterministic/rule-engine intelligence where it is good enough; add dependencies only after package-trust review.

## Working heuristics

- heuristic: if a launch or trust claim cannot be proven by a script, artifact, or real operator/tester evidence, keep it yellow and name the missing proof.
- when it applies: launch status, Stripe smoke, friend beta, production auth email, affiliate/referral monetization, and public trust/privacy copy.
- heuristic: dependency changes must pass `npm run package:trust -- --package <name@version>` before install and `npm run scan:supply-chain` after lockfile changes.
- when it applies: any npm package addition/update, vulnerability fix, or lockfile churn.

## Current strategic beliefs

- belief: S95 removed the main local verification caveat and the post-closeout Supabase checkout deploy blocker; the next launch blockers are external/manual proof evidence plus stale revenue/IGNIS derived intelligence.
- evidence: `npm audit` is clean, Dependabot open alerts are 0, `npm run verify:launch-local` passed 500/500, all-tree/staged secret scans are clean, repo-local package-trust/supply-chain scripts now exist, production `create-checkout` returns 200 for `scout_monthly`, and Deploy Pages run `27791869430` passed.
- confidence: high
