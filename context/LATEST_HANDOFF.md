# Latest Handoff

## Where We Left Off (Session 24)
- Shipped: 8 improvements across 4 groups — launch-state, trust/copy, analytics/readiness, tests
- Tests: 75 passing (75 core / 0 server / 0 client) · delta: +4 this session
- Deploy: deployed to GitHub Pages · auto-deploy active

Session Intent: Implement the audit recommendations and ideas while keeping the free Vault membership model intact and aligned with the website agent’s shared-auth rollout.

### What changed this session

**Shipped:**
- New `src/launchState.js` with centralized `VITE_PG_FEATURE_*` flags for AI scan, Promo Advisor, PromoChat, Live Scanner, Stack Builder, AI Action Plan, push alerts, and paid checkout
- AI/live/push/billing surfaces now beta-gate cleanly instead of presenting undeployed backends as live
- App shell, loading screen, footer, landing page, and README now explicitly explain the free Vault membership model
- Legacy share/export/referral strings normalized to the canonical `vaultsparkstudios.com/promogrind/` URL
- Added launch-state tests (`src/__tests__/launchState.test.js`) — suite expanded 71 → 75

**Validation:**
- `npm test` → **75/75 passing**
- `npm run build` → **passing** (`index` 118.62 kB gzip, `vendor` 49.33 kB gzip, `supabase` 50.93 kB gzip)

**Priority reset for next session:**
1. Re-check PromoGrind once the website agent lands the shared Vault membership/auth updates
2. Turn on the `VITE_PG_FEATURE_*` flags as backend services actually go live
3. Extend the trust/compliance copy pass to the highest-intent static SEO pages
4. Decide whether `calc-api` should be publicly surfaced now or stay quietly deployable until docs exist

**Truth audit:**
- Refreshed `TRUTH_AUDIT.md` again to reflect the free Vault membership model
- Synced `PROJECT_STATUS.json` to the shipped launch-state gating and updated test/build counts
- Removed the earlier repo-local contradiction around "free product" vs auth gate; access is now framed as free membership, not guest access

### What was built — session 22 (v22.0)

**Light mode settings toggle (`src/App.jsx` + `index.html`):**
- `darkMode` is now React state backed by `localStorage('pg_theme')`
- `Object.assign(K, darkMode ? KD : KL)` swaps entire palette reactively
- Blocking script in `index.html` reads theme before paint — no flash
- `body.light` CSS class for dark/light input focus + selection colors
- Toggle button in header: "☀ LIGHT" / "🌙 DARK"
- Toast system uses `K.s1` instead of hardcoded `#0f1520`

**Code quality — inline math → shared.js imports:**
- Removed 28 duplicated math functions + KD/KL/K/font/fontD/S from App.jsx
- Single import line from `./lib/shared.js` replaces all inline copies
- S extended with JSX `meter` method locally (shared.js stays pure JS)
- All calculator math now covered by 71 tests via shared.js

**Profit Certificate (new Track tool):**
- Shareable ledger-backed win card with period filter (week/month/year)
- Shows total profit, conversion count, books used, best day
- Copy + native share (Twitter fallback) — gradient header, verified badge
- Added as "Profit Cert" in Track tab group (tool #53)

**UX polish:**
- Ctrl+K keyboard shortcut opens calc search (standard, discoverable)
- Scroll-to-top on tab/calculator navigation
- Global input focus rings (accent-color outline, theme-aware)
- Text selection highlighting (accent color, theme-aware)

**Test suite expansion (32 → 71 tests):**
- 39 new tests for 13 previously untested functions
- calcFirst, calcBoost, calcPH, calcMid, calcRO, calcTeaser, calcRR, calcParlay, calcSGP, toP, toF, bestOdds, calcInsurance

**PT-BR market completion (3 new pages):**
- `public/ev-calculator-pt/index.html` — EV calculator for Brazil
- `public/parlay-calculator-pt/index.html` — Parlay calculator PT-BR
- `public/matched-betting-pt/index.html` — Matched betting guide for Brazil
- Sitemap: 178+ URLs (was 175)

**TASK_BOARD:** Session 22 brainstorm (30 items) added at top

## Human Action Required

- [ ] **Coordinate with the website agent once the shared Vault membership system is fixed** — confirm PromoGrind loading/auth copy still matches the final global flow
- [ ] **Submit sitemap to Google Search Console** — highest-value manual action for discovery once the shared-auth flow is stable
- [ ] **Run `migration-gift-tokens.sql` in Supabase SQL Editor** — required before gift-trial/newsletter capture paths can be considered live
- [ ] **Set `ANTHROPIC_API_KEY` and deploy AI functions** — required before turning on AI-related `VITE_PG_FEATURE_*` flags
- [ ] **Set `RESEND_API_KEY` and deploy email functions** — required before email/gift-trial flows should be considered live
- [ ] **Generate VAPID keys and deploy push** — required before turning on the push alerts launch-state flag
- [ ] **Configure live billing and deploy Stripe webhooks** — required before turning on the paid checkout launch-state flag
- [ ] **Apply for sportsbook affiliate programs and replace `affiliateLink` values** — monetization activation, not a blocker for free public launch

### Next session priorities
1. Component extraction (Tracker/Ledger/LiveScanner → `src/components/`)
2. Replace remaining hardcoded dark colors throughout App.jsx for full light mode polish
3. State legalization alert signup (email capture for non-legal states)
4. Profit Certificate visual polish + Reddit share button

---

## Where We Left Off (Session 20)

**Auth dev bypass (`src/auth.js`):**
- `VITE_DEV_BYPASS_AUTH=true` env variable skips the VaultSparked auth redirect in local dev
- Guard is at the top of `checkAuth()` — absent in production builds (GitHub Pages / Vercel)
- `.env` has the flag set; `.env` is gitignored (never committed)

**`src/lib/shared.js` — NEW canonical math/constants module:**
- Pure JS (no JSX, no React) — testable in Node environment
- Exports: `K` (color palette), `font`, `S` (style primitives — all pure CSS objects, no JSX)
- Exports all calc math: `calcBonus`, `calcFirst`, `calcBoost`, `calcArb2`, `calcArb3`, `calcNV`, `calcNV3`, `calcEV`, `calcPH`, `calcMid`, `calcRO`, `calcDeposit`, `calcKelly`, `calcInsurance`, `calcTeaser`, `calcRR`, `calcParlay`, `calcSGP`, `calcHold`
- Exports utilities: `toD`, `toA`, `toP`, `toF`, `gcd`, `f`, `calcROI`, `downloadFile`, `bestOdds`
- Non-breaking addition — App.jsx still has its own inline copies; future refactor replaces inline with imports

**Test suite (`src/__tests__/math.test.js` + `vitest.config.js`):**
- 32 unit tests: toD conversions, toA, calcBonus, calcArb2/3, calcNV, calcEV, calcKelly, calcDeposit, calcHold, calcInsurance, calcRO, f formatter
- All 32 passing (`npm test`)
- `vitest.config.js` — Node environment, globals true
- `package.json` — added vitest + @vitest/ui devDependencies + `test`/`test:watch`/`test:ui` scripts

**`src/App.jsx` — ShareCard + StackBuilder:**
- **ShareCard enhanced** — added Reddit share button, X/Twitter fallback (native share → X tweet URL), improved share copy text; three action buttons: 📋 Copy | 𝕏 Tweet ↗ | Reddit ↗
- **Arb2Way share** — `showShareCardArb` state + "🎉 Share this arb" button added to Arb2Way result section
- **StackBuilder component** — VaultSparked-gated; bankroll input + book multi-select chips; calls `stack-builder` edge fn; displays AI-generated 3-step promo plan with estimated total; copy button; free upsell gate

**TABS update:**
- Stack Builder added to Live group: `{n:"Stack Builder", slug:"stack-builder", c:StackBuilder, pro:true}`
- Total tools: **52** (was 51)

**`supabase/functions/stack-builder/index.ts` — NEW edge function:**
- POST `{ bankroll, booksAvailable, goal? }` → filters PROMO_DATABASE → Claude Haiku → 3-step stack plan
- Returns: `{ plan, bankroll, estimatedTotal, booksUsed, promoCount, generatedAt }`
- Deploy: `supabase functions deploy stack-builder` (needs `ANTHROPIC_API_KEY`)

**New SEO pages (PT-BR market):**
- `public/bonus-bet-pt/index.html` — bonus bet guide for Brazil (🇧🇷 badge, R$ examples, 6 Brazilian books, 8s redirect)
- `public/arb-calculator-pt/index.html` — arbitrage calculator PT-BR, 2-way + 3-way football examples
- `public/kelly-criterion-pt/index.html` — Kelly Criterion PT-BR with formula display
- All three: hreflang en/es/pt-BR, Schema.org WebApplication JSON-LD, UTM redirect to SPA

**New landing pages:**
- `public/the-grind/index.html` — weekly newsletter landing; email capture → `newsletter_subscribers` (source: 'the-grind-page'); preview of 5 promo items; stats: $487/wk avg, Monday delivery
- `public/creator-program/index.html` — creator affiliate program; 30% rev share 12 months; earnings calculator; application form → `newsletter_subscribers` (source: 'creator-program'); Schema.org Service JSON-LD

**`public/sitemap.xml`:**
- Added 5 new URLs: bonus-bet-pt, arb-calculator-pt, kelly-criterion-pt, the-grind, creator-program

## Human Action Required

> Items only the Studio Owner can action. Sorted by impact.

- [ ] **`supabase functions deploy stack-builder`** — needs `ANTHROPIC_API_KEY` already set from other fns; Stack Builder UI is live but calls will 404 until deployed
- [ ] **Set `ANTHROPIC_API_KEY` Supabase secret** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` — unlocks promo-chat, promo-advisor, ai-action-plan, stack-builder, parse-bet-slip; single step
- [ ] **`supabase functions deploy promo-chat create-checkout promo-advisor`** — all built and ready
- [ ] **Google Search Console sitemap submit** — submit `https://promogrind.com/sitemap.xml`; 170+ URLs
- [ ] **Affiliate program applications** — DK, FanDuel, BetMGM; revenue blocker #1
- [ ] **Stripe LLC + EIN setup** — form LLC → EIN → business bank → Stripe products → `STRIPE_SECRET_KEY` + `STRIPE_TEST_MODE=false`

### Next session priorities
1. Deploy: `supabase functions deploy stack-builder promo-chat create-checkout promo-advisor` (set `ANTHROPIC_API_KEY` first)
2. Manual: Google Search Console sitemap submit (175+ URLs including new PT-BR pages)
3. Manual: Affiliate program applications (DK/FD/BetMGM) — revenue blocker #1
4. Future code: Replace App.jsx inline math with imports from `src/lib/shared.js` — dedicated refactor session
5. Future code: Component extraction (Tracker/Ledger/LiveScanner → `src/components/`)

---

## Where We Left Off (Session 19)
- Shipped: Full project audit (76/100) + 8 features + 3 edge fns + 20 hreflang edits + annual report
- Build: clean ✓ (8.74s)
- Git: commit + push pending (closeout)

### What was built — session 19 (v19.0)

**App.jsx (PromoChat + Agency tier):**
- **PromoChat component** — floating 💬 button (`bottom: 80px, right: 20px`); slide-out 360px panel; 10/day free rate limit (localStorage); unlimited for VaultSparked; calculator suggestion chips (clickable, navigate to calc slug); calls `promo-chat` edge fn with session token + last-10 history + user context (bankroll, books); "Go VaultSparked" CTA when limit hit
- **B2B Agency pricing card** — 4th tier in PricingPage ($199/mo, purple `#a855f7` accent); 6 features (white-label, embed, API, branding removal, priority support, custom domain); "Contact Sales →" mailto CTA

**New Edge Functions:**
- `supabase/functions/create-checkout/index.ts` — Stripe test/live dual mode; test mode active until LLC+EIN (`STRIPE_TEST_MODE=false` + `sk_live_` activates live); plans: monthly ($24.99), annual ($199), agency ($199); returns `{ test_mode: true, session: {...} }` in test mode
- `supabase/functions/promo-chat/index.ts` — Claude Haiku conversational AI; 10/day free (tracked via vault_events), unlimited VaultSparked/trial; auto-suggests relevant calc slugs from keyword matching; returns `{ response, suggestions, isPro, remaining }`

**src/auth.js:**
- `isAgency()` — returns true if `plan === 'agency' && status === 'active'`
- `startCheckout()` — updated body param (`planId` → `plan`) + test mode alert handler

**20 hreflang edits:**
- All 10 EN calculator pages + all 10 ES pages updated with reciprocal `hreflang` alternate links
- Pattern: canonical → hreflang en/es/x-default → preconnect (EN); canonical → hreflang en/es/x-default → script (ES)

**public/annual-report/index.html:**
- "State of Sports Betting Promos 2026" dark-theme static page; Schema.org Report JSON-LD
- Key stats: 68% avg conversion, $4,200 annual value, 847K monthly players
- Sections: sportsbook bar charts, player profile value table, top 10 states, arb/EV trends, 2026 key trends, calc CTAs
- PR/backlink magnet; updated quarterly note

**sitemap.xml:** 170+ URLs (annual-report/ added)

**TASK_BOARD.md:** Session 19 brainstorm table (30 items), P0 queue updated, SIL hreflang marked done

**Component extraction DEFERRED:** Extracting Tracker/Ledger/LiveScanner to `src/components/` requires creating `src/lib/shared.jsx` for ~20 shared utilities first. Too risky in 6700-line monolith without a dedicated refactor session.

## Human Action Required

> Items only the Studio Owner can action. Sorted by impact.

- [ ] **Set `ANTHROPIC_API_KEY` Supabase secret** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` — unlocks promo-chat, promo-advisor, ai-action-plan, and parse-bet-slip in one step; zero cost beyond API usage
- [ ] **`supabase functions deploy promo-chat create-checkout promo-advisor`** — after setting ANTHROPIC_API_KEY; all 3 are built and ready; promo-chat and create-checkout are session 19 additions
- [ ] **Google Search Console sitemap submit** — add vaultsparkstudios.com property → verify → submit `https://vaultsparkstudios.com/promogrind/sitemap.xml` (170+ URLs); 5 minutes, free; activates 18+ months of SEO investment
- [ ] **Affiliate program applications** — DK (draftkings.com/partners, CPA $75+), FanDuel (partners.fanduel.com, $25-35 or 35% RevShare), BetMGM (betmgmpartners.com, $50+); revenue blocker #1 — $0 → $100s/mo the moment links go live
- [ ] **Stripe LLC + EIN setup** — form LLC → EIN → business bank → create Monthly/Annual products in Stripe dashboard → set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` → set `STRIPE_TEST_MODE=false` to activate live checkout

### Next session priorities
1. Deploy: `supabase functions deploy promo-chat create-checkout` (set ANTHROPIC_API_KEY first)
2. Deploy: `supabase functions deploy promo-advisor` (same key)
3. Manual: Google Search Console sitemap submit (170+ URLs)
4. Manual: Affiliate program applications (DK/FD/BetMGM) — revenue blocker #1
5. Future code: Component extraction refactor (Tracker/Ledger/LiveScanner) — dedicated session
6. Future code: Automated test suite (Vitest, 20 core calculator tests)

---

## Where We Left Off (Session 18)
- Shipped: Full project audit (77/100) + 7 code features + 20 US state SEO pages + Simplify code review
- Build: clean ✓ — 111.57 kB gzip (3.13s)
- Git: commit + push pending (closeout)

### What was built — session 18 (v18.0)

**App.jsx (+194 lines → ~6,752 lines, build ✓):**
- **PromoAdvisorPanel** — floating 💡 button in header; slide-out 360px panel; Claude Haiku promo explainer; 3/day free, unlimited VaultSparked/trial; calls `promo-advisor` edge fn; color-coded result (excellent=green, good=cyan, fair=yellow, poor=red)
- **DailyStreak milestone awards** — streak milestones at 7/30/100 days award 50/200/500 Vault Points via `award_vault_points` RPC; parallel RPCs for multiple milestones; toast celebration
- **Trial urgency banner 3-variant** — green (>3 days, 🎉), amber/K.yl (>1 ≤3, ⏳), red/K.rd (≤1, 🚨)
- **PricingPage Concierge tier** — $9.99/mo waitlist card (cyan accent) above VaultSparked; toast-based waitlist capture in localStorage
- **isConcierge()** — added to `src/auth.js` for future Concierge-gated features

**New Edge Function:**
- `supabase/functions/promo-advisor/index.ts` — Claude Haiku; POST `{promoText}` → `{verdict, rating, explanation, ev, action, hedge}`; requires `ANTHROPIC_API_KEY`

**Updated Edge Functions:**
- `supabase/functions/onboarding-drip/index.ts` — added `processTrialExpiryEmails()`: sends day-4 (3 days left) + day-6 (last chance) trial urgency emails; guarded by `trial_emails_sent` in user metadata
- `supabase/functions/weekly-digest/index.ts` — added `getUserWeekStats()`: personalized P/L + streak + top book per user; `buildWeekStatsHtml()`: "📊 Your Week" section in every digest email

**20 new US state SEO pages** (`public/bonus-bets-{state}/index.html`):
- Full mobile markets: Indiana, Iowa, West Virginia, Kansas, Maryland, Massachusetts, Louisiana, Kentucky, North Carolina, Connecticut
- Restricted/special: Nevada (in-person reg), Oregon (DK-only lottery), New Hampshire (DK monopoly), Vermont (2-operator)
- Limited/retail: Mississippi (retail only), Missouri (just approved), Wyoming (small pop, competitive)
- No mobile yet: North Dakota (tribal only), South Dakota (limited), Montana (lottery monopoly)
- 30 US state pages total

**sitemap.xml** — 169+ URLs (+20 state pages)

**Simplify code review (session 18 closeout):**
- DailyStreak milestones: replaced 3x copy-paste blocks with `MILESTONES` config array + `Promise.all` for parallel RPC calls
- PromoAdvisorPanel: fixed `ratingColor` to handle 'poor' → K.rd; extracted `isLimited` boolean (removes 5x repeated ternary); fixed stale `usesKey` at midnight (compute `today` at call time, not render)
- weekly-digest `getUserWeekStats`: extracted single `sevenDaysAgoMs` constant; parallel `Promise.all` for ledger + vault_events queries; added `console.error` in catch for operational visibility

---

## Where We Left Off (Session 17)
- Shipped: 13 improvements across 3 groups — spanish_seo (10 pages), drip (extended to 14 days), polish (3 App.jsx fixes)
- Tests: N/A — no automated test suite
- Deploy: deployed — commit 08e7046, live at vaultsparkstudios.com/promogrind/

### What was built — session 17 (v17.0)

**10 Spanish SEO pages** (`public/{slug}-es/index.html`):
- bonus-bet-es, arb-calculator-es, no-vig-es, profit-boost-es, kelly-criterion-es
- ev-calculator-es, parlay-calculator-es, hedge-calculator-es, matched-betting-es, sportsbook-promo-es
- Each: dark-theme HTML, JSON-LD schema, FAQ section, pg-capture.js email capture, UTM redirect
- sitemap.xml: 149+ URLs (+10 ES pages)

**onboarding-drip extended to 14 days:**
- Added day 10: Promo stacking strategy → links to `#/promo-stacking`
- Added day 14: 2-week check-in + Sportsbooks progress nudge → links to `#/sportsbooks`
- Full sequence now: days 1, 2, 3, 4, 5, 6, 7, 10, 14

**App.jsx polish (3 edits, build ✓):**
- Ledger by-book empty state: was "No entries yet." → now icon + heading + hint copy (matching Ledger pattern)
- OnboardingChecklist invite step: auto-completes when `pg_referral_shared` is set (wired to ReferralHub copy button)
- Mobile nav content overlap: added `pg-main-content` class + CSS rule `padding-bottom: 72px` on mobile

---

## Where We Left Off (Session 16)
- Shipped: 12 improvements across 7 groups — email_growth, social_proof, ai, onboarding, extension, infrastructure, seo_distribution
- Tests: N/A — no automated test suite
- Deploy: deployed — commit 08e7046 (combined with session 17), live at vaultsparkstudios.com/promogrind/

### What was built — session 16 (v16.0)

**App.jsx (+~420 lines, build ✓ 109.61 kB gzip):**
- **StarterPackModal** — 3 onboarding profiles on first Dashboard visit (Casual/Hunter/Grinder); pre-fills `pg_bankroll` + `appData.profitGoal`
- **LiveActivityFeed** — rotating 10-event social proof ticker on PricingPage; seeds pseudo-randomly per 10-min window
- **AIActionPlan component** — VaultSparked-gated; calls `ai-action-plan` edge fn; tiered by bankroll; caches daily result in localStorage; added as "Action Plan" tab in Live group
- **GiftTrialBox in ReferralHub** — "Give 14 days free" email input → calls `gift-trial` edge fn
- **EV Scanner free teaser** — non-subscribers see live opportunity count tease above upgrade gate
- **Account Health Alert Panel** — Tracker shows gubbed/limited/inactive book alerts with specific advice

**New Edge Functions:**
- `supabase/functions/ai-action-plan/index.ts` — Claude Haiku, tiered prompt by bankroll; deploy + `ANTHROPIC_API_KEY` needed
- `supabase/functions/calc-api/index.ts` — public REST API, 6 endpoints, no auth; deploy only
- `supabase/functions/gift-trial/index.ts` — rate-limited (5/30d), token generation, sender bonus days; deploy + `RESEND_API_KEY` optional

**New static files:**
- `public/js/pg-capture.js` — email capture interstitial; injected on bonus-bet, arb-calculator, no-vig, profit-boost, kelly-criterion SEO pages
- `public/promogrind-verified/index.html` + `badge.svg` — partner badge program landing page
- `scripts/migration-gift-tokens.sql` — gift_tokens + newsletter_subscribers tables + redeem_gift_token RPC
- `sitemap.xml` — added promogrind-verified/ (139+ URLs)

**Chrome Extension:**
- `extension/content.js` — added `detectBetSlip()` + `setInterval(detectBetSlip, 2000)` in `init()`; auto-appends `?sz=&bo=` to calculator URLs; `⚡ Auto-fill ready` panel indicator

### Deploy needed (human action)
| Item | Command | Notes |
|---|---|---|
| `migration-gift-tokens.sql` | Run in Supabase SQL Editor | Must run before gift-trial is called |
| `calc-api` | `supabase functions deploy calc-api` | Public, no secrets needed |
| `ai-action-plan` | `supabase functions deploy ai-action-plan` + `supabase secrets set ANTHROPIC_API_KEY=...` | VaultSparked-gated |
| `gift-trial` | `supabase functions deploy gift-trial` + `supabase secrets set RESEND_API_KEY=...` | Resend optional (email send) |
| Git commit + push | `git add -A && git commit -m "v16.0"` | Triggers GitHub Pages deploy |

---

## Where We Left Off (Session 15)
- Full project audit (76/100) + implemented all "Highest Leverage Now" and "Highest Ceiling" items
- Build: clean ✓ — 105.87 kB gzip (app chunk, up from 101.55 kB)
- Git: not yet committed

### What was built — session 15 (v15.0)

**App.jsx (+349 lines, build ✓):**
- **Onboarding Checklist** — 5-step getting-started card on Dashboard; auto-detects completion from appData/localStorage; dismissible
- **Book Signup Progress Tracker** — "Unclaimed Promo Value" section in Sportsbooks tab; shows unsigned books + estimated value + Claim CTAs
- **Behavioral Upgrade Triggers** — contextual upsell banners: arb calc (5+ uses) → Live Scanner; ledger (3+ entries) → cloud sync; dismissible, reads `pg_usage_log`
- **Plausible Funnel Events** — 5 events wired: `trial_start`, `upgrade_click`, `referral_shared`, `first_ledger_entry`, `first_calc_run`
- **Calculator Share Cards** — `ShareCard` component on BonusBet + ProfitBoost profitable results; copy text + native share / Twitter fallback
- **Taxes Estimator** — new Calculate tool; reads from Ledger auto; 2025 federal brackets, state rate, W-2G warning, quarterly schedule, print PDF

**New static files:**
- `public/promogrind-vs-profitduel/index.html` — 13-row competitor comparison, UTM-tracked
- `public/promogrind-vs-oddsjam/index.html` — 12-row competitor comparison, UTM-tracked
- `public/promogrind-vs-betterbet/index.html` — 10-row competitor comparison, UTM-tracked
- `discord-bot/bot.js` + `discord-bot/package.json` — Discord.js v14 bot; `/promos` + `/calc` slash commands + daily 9am digest from `community_promos` table
- `sitemap.xml` — competitor pages added (138+ URLs now)

**UTM attribution:**
- 35 SEO page redirects updated with `?utm_source=seo&utm_medium=organic&utm_content={slug}` — Plausible now attributes SPA visits to source pages

### Parked (manual only — no code blocks next session)
| Item | What's needed |
|---|---|
| Onboarding drip | RESEND_API_KEY → `supabase functions deploy onboarding-drip` → schedule daily cron |
| Weekly digest | RESEND_API_KEY → `supabase functions deploy weekly-digest` → schedule weekly cron |
| Discord bot | Discord dev account → bot token → set env vars → `npm install` in `discord-bot/` → run |
| parse-bet-slip | ANTHROPIC_API_KEY → deploy |
| Push notifications | VAPID keys → deploy → run migration-push-subscriptions.sql |
| Affiliate links | Apply to partner programs → replace `referralLink` in `src/books.js` |
| Stripe | LLC + EIN → products → secrets → deploy |
| Google Search Console | Submit sitemap (138+ URLs) |
| promogrind.com domain | Purchase → CNAME DNS |

---

## Where We Left Off (Session 14)
- Full project audit (74/100 honest score — revenue identified as #1 blocker)
- Shipped: 5 App.jsx features + 2 static pages + 3 SQL migrations + task board + memory all updated
- Build: clean ✓ — 101.55 kB gzip (app chunk)
- Git: not yet committed

### What was built — session 14 (v14.0)

**App.jsx (all 5 features — build ✓):**
- **White-Label Embed Mode** — `?embed=1` hides nav/header, shows only calculator + "Powered by PromoGrind" watermark
- **Bet Slip → Auto-Track** — after AI scan in BonusBet, "➕ Add to Tracker" creates bet entry via `syncAppData`
- **Influencer Affiliate Dashboard** — "⚡ Creator Mode" section in ReferralHub (VaultSparked-gated); custom vanity code + click/signup stats + estimated commission
- **Crowdsourced Promo Database** — new "Community Promos" Learn tab; browse/upvote; VaultSparked can submit; backed by `community_promos` Supabase table
- **Team Accounts UI** — full create/invite/manage replaces waitlist; backed by `team_accounts` + `team_members` tables

**New files:**
- `public/income-estimator/index.html` — interactive "How Much Can I Make?" estimator (state/bankroll/time inputs → personalized annual income breakdown)
- `public/embed/index.html` — embed docs page with copy-paste iframe codes for 5 calculators
- `scripts/migration-team-accounts.sql` — team_accounts + team_members tables with RLS
- `scripts/migration-community-promos.sql` — community_promos table + `upvote_community_promo` RPC
- `scripts/migration-influencer-codes.sql` — influencer_codes table + 3 RPCs (get_influencer_code, track_influencer_click, track_influencer_signup)
- `sitemap.xml` — added income-estimator + embed (135+ URLs)

### Manual items flagged and parked
| Item | What's needed | Where |
|---|---|---|
| Run 3 new SQL migrations | SQL Editor | Supabase dashboard |
| Deploy onboarding-drip | `supabase functions deploy onboarding-drip` + Resend key + cron schedule | Supabase |
| parse-bet-slip deploy | `ANTHROPIC_API_KEY` + deploy | Supabase |
| Push notifications | VAPID keys + deploy + SQL migration | See TASK_BOARD |
| Live Scanner | Odds API key | theoddsapi.com |
| Paid upgrade flow | Stripe products + LLC + EIN | Stripe dashboard |
| Affiliate revenue | Apply to each book's partner program | See TASK_BOARD |
| Chrome Web Store | Screenshots + listing copy + $5 dev fee | chrome.google.com |
| Domain promogrind.com | Purchase + CNAME DNS | GoDaddy/Namecheap |
| Google Search Console | Submit sitemap | search.google.com/search-console |

---

## Where We Left Off (Session 13)
- Shipped: 4 high-ceiling items — Chrome Extension, AI Bet Slip Parser, UK market module (8 pages), Content Blog (5 posts + index)
- Also shipped: domain migration prep (CNAME), sitemap updated to 131+ URLs
- Closeout: TASK_BOARD + CURRENT_STATE + LATEST_HANDOFF + PROJECT_STATUS.json + memory all updated
- Build: clean ✓ — 98.41 kB gzip (app chunk)
- Git: committed + pushed (commit `b724175`) — live at vaultsparkstudios.com/promogrind/

### Manual items flagged and parked (nothing blocks next code session)
| Item | What's needed | Where |
|---|---|---|
| AI Scan button | `ANTHROPIC_API_KEY` + `supabase functions deploy parse-bet-slip` | Supabase dashboard |
| Push notifications | VAPID keys + deploy + SQL migration + .env | See push_notifications block in PROJECT_STATUS.json |
| Live Scanner | Odds API key | theoddsapi.com |
| Paid upgrade flow | Stripe products + LLC + EIN | Stripe dashboard |
| Affiliate revenue | Apply to each book's partner program | See TASK_BOARD |
| Chrome Web Store | Screenshots + listing copy + $5 dev fee | chrome.google.com/webstore/devconsole |
| Domain promogrind.com | Purchase + CNAME DNS + update 45 SEO pages | GoDaddy/Namecheap/Cloudflare |
| Google Search Console | Submit sitemap (131+ URLs) | search.google.com/search-console |

---

## What was completed — session 13 (v13.0)

### Chrome Extension (`extension/`)
- `manifest.json` — Manifest V3, matches 12 sportsbooks (DK, FD, MGM, Caesars, bet365, ESPN, Fanatics, BetRivers + 4 UK books)
- `content.js` — injects floating ⚡ PG button at bottom-right of sportsbook pages; click opens slide-out panel with 6 calc links
- `popup.html` + `popup.js` — extension popup detects active tab's book, shows contextual suggested calculators
- `background.js` — service worker handles `OPEN_CALC`, `DETECT_BOOK`, `OPEN_APP` messages
- Load unpacked in Chrome at `chrome://extensions` → Load unpacked → select `extension/` folder
- Submit to Chrome Web Store when ready (needs screenshots + privacy policy)

### AI Bet Slip Parser
- `supabase/functions/parse-bet-slip/index.ts` — Claude claude-haiku (vision model)
- Accepts: `{ imageBase64, mimeType }` POST body
- Returns: `{ betType, stake, odds, hedgeOdds, boostPct, maxExtra, book, promoName, confidence, rawText }`
- UI: "📷 Scan" button in BonusBet next to "Parse" button; shows extracted fields after scan
- Deploy: `supabase functions deploy parse-bet-slip` + `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

### UK Market Module (8 new pages)
- `public/matched-betting-uk/` — full guide: legal, step-by-step, 6 UK books, recurring offers
- `public/bonus-bets-uk/` — offer comparison table (Sky Bet, bet365, William Hill, Betway, Paddy Power)
- City pages: London, Manchester, Birmingham, Glasgow, Edinburgh, Liverpool
- PromoCalendar in App.jsx: added 🌎/🇺🇸/🇬🇧 market toggle → filters to US or UK books only

### Content Blog (6 new files)
- `public/blog/index.html` — blog index with 5 post cards + CTA
- `how-matched-betting-works/` — 8-min beginner guide, conversion table, worked example
- `best-sportsbook-promos-2026/` — ranked sign-up offers + recurring monthly estimates
- `draftkings-vs-fanduel-promos/` — side-by-side comparison with annual value estimates
- `sports-betting-taxes-guide/` — IRS W-2G, deductions, after-tax yield calc, record-keeping
- `arbitrage-betting-explained/` — arb formula, stake sizing, account sustainability tips

### Domain Prep
- `public/CNAME` created with `promogrind.com`
- `sitemap.xml` updated: 131+ URLs (added 8 UK pages + 6 blog posts)

---

## Current app state

- **Version**: 13.0
- **App.jsx**: ~5,870 lines
- **Build**: clean — 98.41 kB gzip
- **Calculators**: 27
- **Static SEO pages**: 45 (30 original + 8 UK + blog index + 5 blog posts + landing/privacy/terms)
- **Blog posts**: 5 live
- **Chrome Extension**: ready to load unpacked
- **Parse Bet Slip Edge Function**: needs `ANTHROPIC_API_KEY` secret + deploy

---

## Session 12 Handoff (preserved below)
## Where We Left Off (Session 12)
- Shipped: 10 features + 17 SEO pages + supporting files across 4 groups — features (10: EV%, splash, UK market, PushEnableBtn, testimonials, etc.), seo (17 new static pages → 30 total), monetization (affiliate referralLink field, Plausible activated), legal (privacy/terms/landing pages)
- Tests: N/A — no automated test suite
- Deploy: deployed — live at vaultsparkstudios.com/promogrind/ · App.jsx ~5,780 lines · 82/100 audit score

---

Last updated: 2026-03-27 (session 20 — full audit + test suite + shared.js + StackBuilder + PT-BR SEO + newsletter/creator pages)

This is the authoritative active handoff file for the project.

---

## To activate push notifications (when ready)

```bash
npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...
supabase functions deploy send-daily-brief
# Run scripts/migration-push-subscriptions.sql in Supabase SQL Editor
# Add VITE_VAPID_PUBLIC_KEY=... to .env
```

PushEnableBtn in DailyDashboard will handle the browser permission request + subscription upsert automatically once VITE_VAPID_PUBLIC_KEY is set.

---

## To activate AI bet slip scanner (when ready)

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy parse-bet-slip
```

📷 Scan button in BonusBet is already live in the UI — it just calls the Edge Function.

---

## Pending external setup

1. **Affiliate tracking URLs** — `src/books.js` has `referralLink` field on all 8 books; replace placeholder URLs with real affiliate-approved tracking links once approved by each program
2. Odds API key → deploy `odds` edge function; change 120s → 300s refresh
3. Stripe: two products (Monthly $24.99 + Annual $199) → set secrets → deploy `create-checkout` + `stripe-webhook`
4. Resend key → deploy `weekly-digest` edge function
5. ✅ Plausible: activated in `index.html`
6. Google + Discord OAuth in Supabase dashboard
7. Google Search Console: submit updated sitemap (131+ URLs)
8. VAPID keys → deploy `send-daily-brief` (see above)
9. **ANTHROPIC_API_KEY** → deploy `parse-bet-slip` (see above)
10. **Chrome Web Store** — screenshots + listing copy needed before submission
11. **promogrind.com** — purchase domain → CNAME DNS → update 45 SEO page redirects + canonicals + sitemap

---

## Architecture snapshot

- `AppDataCtx` → `{ appData, syncAppData }` — single loadData, all Track components use syncAppData(d)
- `CurrencyCtx` → display-only FX. Never affects stored values or input parsing.
- `syncAppData(d)` — ONLY correct way to save from Track components
- `useCalcMemory(key, defaults)` — localStorage + URL param init for calculators
- `DEFAULT_SLUG = "dashboard"` — Home tab is default landing
- `isPro()` in auth.js accepts `pro`, `vault_sparked`, AND `trial` status
- `startTrial()` in auth.js — sets trial_started_at in Supabase user metadata (idempotent)
- `subscribeToPush(vapidPublicKey)` in sw-register.js — returns PushSubscription for storage
- Static SEO pages: `public/{slug}/index.html` pattern — real HTML + instant JS redirect
- vite-plugin-ssg NOT viable — app is auth-gated, SSR renders loading screen

---

## Critical constraints (unchanged)

- Never commit `.env` or `.env.admin`
- `SUPABASE_SERVICE_ROLE_KEY` — admin CLI only, never browser
- Calculator math: never change without verifying formulas
- All sportsbook links: `src/books.js` only
- Stripe live: blocked until LLC + EIN
- `isPro()` must accept `pro`, `vault_sparked`, AND `trial`
- `syncAppData(d)` is the ONLY correct way to save from Track components
- Default landing = `dashboard`
- `CurrencyCtx` affects display only
