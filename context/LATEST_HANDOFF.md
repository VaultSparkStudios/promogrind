# Latest Handoff

Last updated: 2026-04-24 (S76)
Session: 76
Session Intent: Gamification sprint — audit and implement the highest-leverage improvements to calculator depth, UI/UX engagement, AI intelligence, and analytics. Ship as many top-ranked items as possible.
Intent Outcome: Achieved. All 11 planned items shipped: Juice Score, CalcNextStep chaining, ShareCard expansion, Promo Expiry Widget, Bet History Charts, UserProfile play-style inference, PlayStyleCard, Comeback Bonus + weak-lane boost, feature flag % rollout, PostHog analytics noise fix. 378/378 tests passing.

## Where We Left Off (Session 76)

- Shipped 11 features across calculators, dashboard, analytics, and feature flag infrastructure
- Tests: 378/378 passing (up from 375 before S76)
- PostHog `/decide` and survey polling now disabled — production analytics noise eliminated
- Genome: 25/25 perfect (templates synced to prompts)
- Deploy: all 6 commits pushed to main, Cloudflare Pages deploying automatically

## What was completed

- **Juice Score (S76)**: `src/lib/juiceScore.js` + `src/components/JuiceScore.jsx` — 0–100 composite promo quality score with animated fill bar, integrated into BonusBet, Arb2Way, Arb3Way, DepositMatch, PlusEV, SGPEstimator, TeaserCalc
- **CalcNextStep chaining (S76)**: `src/components/CalcNextStep.jsx` — context-aware "next step" suggestions for 13 calculator types, uses internal `useNavigate()`
- **ShareCard expansion (S76)**: Added ShareCard to 8 additional calculators (Arb3Way, DepositMatch, FirstBet, InsurancePromo, ParlayHedge, ParlayBuilder, PlusEV, SGPEstimator, TeaserCalc)
- **Promo Expiry Widget (S76)**: `src/components/dashboard/PromoExpiryWidget.jsx` — countdown timers with urgency color coding, inline add form, persisted to localStorage
- **Bet History Charts (S76)**: `src/components/BetHistoryCharts.jsx` — profit by book/type (H-bars) + 8-week trend (column bars), rendered in TrackInsights
- **UserProfile inference (S76)**: `src/lib/userProfile.js` — arb/bonus/ev/parlay cohort classification from existing pg_hist_* keys, requires ≥3 uses and 1.5× dominance
- **PlayStyleCard (S76)**: Added to `ActivationNextAction.jsx` — shows play-style label/tip/next-calc CTA below the Next Best Action card
- **Comeback Bonus + weak-lane boost (S76)**: `DashboardHero.jsx` — comeback banner (≥3 days away → 2× XP prompt), weak-lane suggestion card, accuracy % tag on MasteryBar
- **Feature flag % rollout (S76)**: `src/lib/featureFlags.js` — stable FNV-1a hash enables deterministic percentage cohort rollouts by userId without server state
- **PostHog noise fix (S76)**: `src/analytics.js` — `advanced_disable_decide: true` + `disable_surveys: true` eliminates /decide and /remote-config 404/401 console errors

## What is mid-flight

- Real affiliate/referral links for `BetMGM`, `bet365`, and `BetRivers` still missing from `src/books.js`
- Stripe smoke purchase (one real transaction) still required
- VAPID key still needed for PWA push notifications
- Seasonal missions/tournaments require a Supabase leaderboard table
- AI Mastery Coach (weekly personalized coaching letter) — not started
- Smart Promo Stack Builder AI upgrade — not started
- `src/App.jsx` decomposition ongoing

## What to do next

1. Paste real `BetMGM`, `bet365`, and `BetRivers` tracking URLs into `src/books.js`
2. Run the real Stripe smoke purchase and verify post-checkout portal flow
3. Set the VAPID key in Cloudflare env vars and wire up the push notification opt-in
4. Create the Supabase `missions` and `leaderboard` tables for seasonal tournaments
5. Ship the AI Mastery Coach weekly email via Resend edge function

## Constraints

- This public repo does not carry the full private Studio Ops layer; use repo-local truth files instead of assuming portfolio scripts exist.
- Avoid rerunning broad repair scripts blindly: `ops-onboard --repair --write` can overwrite valid repo-local truth with scaffolds.
- Do not fabricate sportsbook affiliate links. If the operator has not provided a real approved URL, leave the field empty and keep the blocker honest.
- Do not commit `supabase/.temp/*`; it is local linkage state, not public repo truth.
- `docs/CREATIVE_DIRECTION_RECORD.md`, `scripts/rotate-render-key.mjs`, `scripts/soul-interview.mjs` are gitignored — they exist locally but must not be committed to the public repo.

## Read these first next session

1. `docs/STARTUP_BRIEF.md`
2. `context/TASK_BOARD.md`
3. `docs/RELEASE_PLAN.md`

## Files to update next session if work continues

- `src/books.js` (affiliate links)
- `supabase/migrations/` (leaderboard/missions tables)
- `src/App.jsx` (continued decomposition)
- `docs/RELEASE_PLAN.md`
