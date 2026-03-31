# Work Log

Append sessions chronologically. Never delete entries.

---

## 2026-03-31 — Session 24 | v23.0 | Launch-State Gating + Free Vault Membership Alignment

**Session type:** Implementation sprint from audit recommendations

**Intent outcome:** Achieved — implemented the major repo-local launch/readiness recommendations while keeping free Vault membership as the access model

**Completed:**

**App / launch-state work:**
- Added `src/launchState.js` with centralized `VITE_PG_FEATURE_*` flags and feature metadata
- Beta-gated undeployed AI/live/push/billing surfaces instead of presenting them as fully live
- Updated app loading state, shell, trust strip, and footer to explain free Vault membership access
- Normalized canonical share/export/referral URLs away from stale domains
- Updated Bonus Bet scan UI, Promo Advisor, PromoChat, Live Scanner, Stack Builder, AI Action Plan, push alerts, and pricing/checkout behavior to reflect launch-state truth

**Public-facing copy / docs:**
- `public/landing/index.html` updated for free Vault membership framing + beta/live honesty
- `README.md` updated with shared Vault membership framing + launch-state flag guidance
- `.env.example` expanded with public feature-flag docs

**Validation:**
- `npm test` → 75/75 passing
- `npm run build` → passing (`index` 118.62 kB gzip)

**Context updates:**
- Updated CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, PROJECT_STATUS.json, DECISIONS, TRUTH_AUDIT, SELF_IMPROVEMENT_LOOP, and CREATIVE_DIRECTION_RECORD

**Open problems:**
- Website agent still needs to finish the shared Vault membership rollout
- Flags must stay off until backend services are actually live
- Trust/compliance copy pass still needs extension to more static SEO pages

**Recommended next action:**
- Re-check PromoGrind against the final website-agent auth flow, then begin flipping `VITE_PG_FEATURE_*` flags on only for live services

---

## 2026-03-31 — Session 23 | Audit | Free Launch Readiness + Truth Sync

**Session type:** Full-project audit with Studio OS write-back

**Intent outcome:** Achieved — audited the entire repo for free-product launch readiness, validated build/tests, reprioritized blockers, and updated project memory

**Completed:**

**Validation:**
- `npm test` → 71/71 passing
- `npm run build` → passing (`index` 116.60 kB gzip, `vendor` 49.33 kB gzip, `supabase` 50.93 kB gzip)

**Audit findings captured:**
- Overall project quality assessed at **76/100**
- Free public launch readiness assessed at **63/100**
- Top blocker identified: global auth gate in `src/auth.js` redirects unauthenticated users away from the app, conflicting with the "free core product" promise
- Secondary blocker cluster identified: dead/unconfigured live surfaces, trust/compliance polish gaps, stale truth surfaces

**Context / truth updates:**
- `context/CURRENT_STATE.md` — audit snapshot + blocker reprioritization
- `context/TASK_BOARD.md` — added `Now` / `Next`, Session 23 audit block, 2 new `[SIL]` commitments
- `context/LATEST_HANDOFF.md` — new Session 23 Where We Left Off block + human-action reframing
- `context/PROJECT_STATUS.json` — synced health, focus, blockers, SIL fields, audit score, truth audit metadata
- `context/TRUTH_AUDIT.md` — replaced template placeholders with real contradiction/freshness audit
- `context/SELF_IMPROVEMENT_LOOP.md` — rolling header refreshed, Session 23 entry appended
- `docs/CREATIVE_DIRECTION_RECORD.md` — added session direction entry for free-product launch goal

**Open problems:**
- Core free path still blocked by Vault auth redirect
- Public surfaces still overstate readiness of AI / Live / billing features that depend on undeployed secrets or manual setup
- Free launch trust/compliance pass not yet executed

**Recommended next action:**
- Next code session should decouple free calculators and read-only learning surfaces from the global auth gate, then add guest-mode smoke coverage

---

## 2026-03-27 — Session 17 | v17.0 | Spanish SEO + Drip Extension + Polish

**Session type:** Next code session options — SIL brainstorm execution + polish sprint

**Intent outcome:** Achieved — all "next code session options" completed

**Completed:**

**10 Spanish SEO pages (new files):**
- public/bonus-bet-es/, arb-calculator-es/, no-vig-es/, profit-boost-es/, kelly-criterion-es/
- public/ev-calculator-es/, parlay-calculator-es/, hedge-calculator-es/, matched-betting-es/, sportsbook-promo-es/
- Each: dark-theme HTML, JSON-LD schema, Spanish FAQs, pg-capture.js email capture, UTM redirect to app

**supabase/functions/onboarding-drip/index.ts:**
- Extended from 7 to 14-day sequence (days 10 + 14 added)
- Day 10: Promo stacking strategy → #/promo-stacking
- Day 14: 2-week check-in + Sportsbooks progress nudge → #/sportsbooks

**src/App.jsx (3 targeted edits, build ✓ 109.74 kB):**
- Line 1912: Ledger by-book empty state → icon + heading + hint (was bare "No entries yet.")
- Line 4397: OnboardingChecklist invite step auto-detects pg_referral_shared localStorage key
- Line 3665: ReferralHub copy() sets pg_referral_shared on clipboard write
- Line 6521: pg-main-content class on main content div + mobile CSS padding-bottom fix

**public/sitemap.xml:** 10 ES pages added (149+ URLs)

**Context files updated:** CURRENT_STATE, LATEST_HANDOFF, TASK_BOARD, SELF_IMPROVEMENT_LOOP, PROJECT_STATUS.json, audits/2026-03-27-2.json, CREATIVE_DIRECTION_RECORD, WORK_LOG, project memory

**SIL:** Total 40/50 | Velocity 13 | Debt →

---

## 2026-03-27 — Session 16 | v16.0 | Audit + 12-Feature Sprint

**Session type:** Full project audit + implement all Highest Leverage + Highest Ceiling brainstorm items

**Intent outcome:** Achieved — all 12 items shipped

**Completed:**

**App.jsx edits (10 targeted edits, build ✓ 109.61 kB gzip):**
- StarterPackModal (3 bankroll profiles, pre-fills bankroll + profit goal on first launch)
- LiveActivityFeed (rotating social proof ticker on PricingPage)
- AIActionPlan component (VaultSparked-gated, Claude Haiku, daily cache, bankroll-tiered)
- GiftTrialBox in ReferralHub ("Give 14 days free" → gift-trial edge fn)
- EV Scanner free teaser (opportunity count tease above upgrade gate)
- Account Health Alert Panel in Tracker (gubbed/limited/inactive book alerts)
- "Action Plan" tab added to Live group in TABS array

**New Supabase Edge Functions (3):**
- `supabase/functions/ai-action-plan/index.ts` — Claude Haiku, VaultSparked-gated, tiered prompt
- `supabase/functions/calc-api/index.ts` — public REST API, 6 calculator endpoints, no auth
- `supabase/functions/gift-trial/index.ts` — token generation, rate limiting, Resend email, sender bonus days

**New static / supporting files:**
- `public/js/pg-capture.js` — email capture interstitial (5s countdown, Supabase insert)
- `public/promogrind-verified/index.html` + `public/promogrind-verified/badge.svg`
- `scripts/migration-gift-tokens.sql` (gift_tokens + newsletter_subscribers + redeem RPC)
- 5 SEO pages updated to use pg-capture.js instead of bare redirect
- `public/sitemap.xml` — added promogrind-verified/ (139+ URLs)

**Chrome Extension:**
- `extension/content.js` — detectBetSlip() + setInterval(detectBetSlip, 2000) wired in init()

**Context files updated:** CURRENT_STATE, LATEST_HANDOFF, TASK_BOARD, SELF_IMPROVEMENT_LOOP, PROJECT_STATUS.json, audits/2026-03-27.json, CREATIVE_DIRECTION_RECORD, WORK_LOG, project memory

**SIL:** Total 39/50 | Velocity 12 | Debt →

---

## 2026-03-24 — Full Build Session

**Session type:** Bootstrap + infrastructure + app improvements

**Completed:**

**Repo & studio-system:**
- Created `VaultSparkStudios/promogrind` (public GitHub repo)
- Extracted source from `promogrind-deploy.zip` (React/Vite, 11 calculators)
- Scaffolded full studio-system: `context/`, `docs/`, `logs/`, `plans/`, `prompts/`, `specs/`
- Wrote all core context files from project knowledge (PROJECT_BRIEF, SOUL, BRAIN, CURRENT_STATE, DECISIONS, TASK_BOARD, LATEST_HANDOFF, OPEN_QUESTIONS, PORTFOLIO_CARD, PROJECT_STATUS.json)
- Wrote AGENTS.md, prompts/start.md, prompts/closeout.md
- Wrote docs/PRODUCT_REQUIREMENTS.md, docs/RELEASE_PLAN.md
- Initial commit pushed

**Deploy infrastructure:**
- Added `.github/workflows/deploy-pages.yml` (GitHub Pages CI/CD, builds with VITE_APP_BASE_PATH=/promogrind/)
- Added `.github/workflows/ci.yml` (build validation on push/PR)
- Added `scripts/postbuild-pages.mjs` (404.html SPA fallback)
- Updated `vite.config.js` to read VITE_APP_BASE_PATH
- Added `build:pages` script to package.json
- Removed `vercel.json` and `netlify.toml` (not needed for GitHub Pages)

**SEO & meta:**
- Fixed canonical URL: `promogrind.com` → `vaultsparkstudios.com/promogrind/`
- Fixed sitemap: all 7 → 14 real route slugs, correct domain
- Fixed robots.txt sitemap pointer
- Added OG image + Twitter image meta tags
- Added `og:url` meta tag
- Loaded JetBrains Mono + Space Grotesk from Google Fonts
- Generated OG image (1200×630): `scripts/og-image.svg` → `public/og-image.png`
- Added `npm run og` script for regeneration

**Studio site:**
- Added PromoGrind to `VaultSparkStudios.github.io` under new `#vault-tools` section
- Added `.promogrind` CSS card theme (emerald)
- Added "Vault Tools" nav link in header + footer
- Merged cleanly with remote changes (vault-sealed card, Projects rename)

**App improvements:**
- Removed duplicate BOOKS array from App.jsx — `src/books.js` is now single source of truth
- Wired affiliate links from books.js into Tracker "Sign Up →" buttons (`rel="sponsored"`)
- Added URL routing via react-router-dom — 14 shareable/SEO-indexable calculator URLs
- Added BrowserRouter in main.jsx with basename from VITE_APP_BASE_PATH
- Added CSV export to P/L Ledger (`↓ Export CSV` button)
- Added FTC affiliate disclosure + responsible gambling footer
- Fixed `b.n` → `b.name` bug in ledger book dropdown (broke after BOOKS migration)
- Split ledger form into two rows for clean mobile layout
- Tracker checkbox: `role="checkbox"`, `aria-checked`, `aria-label`, `tabIndex`, keyboard support (Enter/Space), green focus ring
- Fixed App.jsx comment: "no affiliate links" → accurate description
- Updated sitemap to 14 real route slugs

**Build status:** ✓ Passing (206 kB bundle, 66 kB gzip)

**Files changed:**
- `src/App.jsx`, `src/main.jsx`, `src/books.js` (no content change, now sole BOOKS source)
- `index.html`, `public/sitemap.xml`, `public/robots.txt`, `public/og-image.png`
- `public/favicon.svg`, `public/sitemap.xml`, `public/robots.txt`
- `vite.config.js`, `package.json`, `package-lock.json`
- `.github/workflows/deploy-pages.yml`, `.github/workflows/ci.yml`
- `scripts/postbuild-pages.mjs`, `scripts/og-image.svg`, `scripts/generate-og.mjs`
- `AGENTS.md`, `context/*`, `docs/*`, `logs/*`, `prompts/*`
- `C:/Users/p4cka/documents/Development/VaultSparkStudios.github.io/index.html` (studio site)

**Open problems:**
- Affiliate links in `src/books.js` still placeholder — monetization not live
- GitHub Pages source setting not yet configured in repo settings

**Recommended next action:**
- Insert affiliate links into `src/books.js`, enable GitHub Pages, submit sitemap

---

## 2026-03-26 — Session 9: Third Audit + 20-Feature Implementation (v9.0)

**Session type:** Full audit → brainstorm → 20-feature implementation

**Completed:**

**App.jsx (background agent, worktree isolation):**
- Fixed stale "22 Calculators" header stat → "26"
- 20 new features: Copy My Setup share link, Promo Stacking Calculator, Daily Grind Routine Generator, Profit Goal Milestone, Promo Trade Journal, Odds Comparison Table, Calculator Sub-Categories filter pills, Push Notification Daily Briefing (VaultSparked), Promo Value History Tracker, Kelly Fractional Risk Optimizer, Tax Bracket Timing Advisor, Bet Slip Text Parser, Multi-Book Pending Exposure Dashboard, CLV Leaderboard Column + My Stats, New State Legalized Alert, Promo Arb Finder, Leaderboard Privacy Control, Multi-Currency Mode (USD/CAD/GBP), Sportsbook Account Health Score, Calculator Usage Analytics + Top Tools
- New TABS entries: Promo Stacking (Calculate), Trade Journal (Track), Odds Compare (Track), Promo Arb Finder (Learn)
- New context: CurrencyCtx (display-only FX, USD/CAD/GBP)

**Non-App.jsx (main thread):**
- `public/sitemap.xml`: Added promo-stacking, trade-journal, odds-compare, team-accounts, promo-arb-finder (→47 URLs)
- `public/manifest.json`: Updated tool count description, added Promo Arb Finder shortcut
- `public/sw.js`: Cache version bumped v2→v3
- `public/robots.txt`: Added Disallow for arb-scanner, ev-scanner (pro-gated, no crawl value)
- `index.html`: Updated meta description (27+ calcs), expanded keywords, JSON-LD featureList (→16 items)
- `src/auth.js`: Fixed redirectToLogin to preserve full URL (was only origin, lost path/slug)
- `vite.config.js`: Added Supabase as separate cached chunk
- `.env.example`: Expanded with all edge function secrets and VAPID keys documented
- `package.json`: Added deploy:functions and deploy:brief npm scripts
- `supabase/functions/send-daily-brief/index.ts`: Push notification skeleton (for future VAPID upgrade)
- `scripts/migration-push-subscriptions.sql`: DB migration for server-sent push (future)
- `context/BRAIN.md`: Updated with file-size warning, new strategic beliefs
- `context/DECISIONS.md`: Added 3 session 9 decisions (currency, sub-categories, leaderboard privacy)
- `context/OPEN_QUESTIONS.md`: Resolved 2 stale questions; added 2 new active questions
- `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, `context/PROJECT_STATUS.json`: Updated to v9.0
- `context/TASK_BOARD.md`: Session 9 completion block added
- `prompts/start.md`: Added OPEN_QUESTIONS.md to read order; added sync.js note
- `memory/project_promogrind.md`: Updated to v9.0

**Build status:** ✓ Clean (verified by agent after implementation)

**Files changed:** src/App.jsx, src/auth.js, vite.config.js, .env.example, package.json, public/*, context/*, prompts/start.md, logs/WORK_LOG.md, scripts/migration-push-subscriptions.sql, supabase/functions/send-daily-brief/index.ts, memory/project_promogrind.md

**Open problems:**
- All external setup items remain unactivated (affiliate links, Odds API, Stripe, Resend, OAuth, Plausible)
- App.jsx approaching ~5,000 lines — plan component extraction or Astro migration for session 10+

**Recommended next action:**
- Activate affiliate links (`src/books.js`) — highest revenue-per-hour task
- Then set Odds API key + deploy odds Edge Function
