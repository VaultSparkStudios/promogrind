# Task Board

---

## Now

- [ ] Re-check auth/loading copy once the website agent ships the shared Vault membership fix; verify PromoGrind’s free-account messaging still matches the final global flow
- [ ] Flip `VITE_PG_FEATURE_*` flags on as each backend/service actually goes live (AI, live scanner, push, billing)
- [ ] Deploy `calc-api` and decide whether to surface it publicly or keep it partner-facing until docs exist

## Next

- [ ] Extend the trust/compliance copy pass from the current top-intent pages to the remaining high-intent static SEO pages
- [ ] Add launch analytics for beta-surface impressions and conversion into activated features after flags turn on
- [ ] Continue component extraction from `src/App.jsx` once the launch-state pass has settled
- [ ] **[SIL] Browser-level launch smoke harness** — add a real UI-run path for auth redirect, landing, and top calculator checks instead of relying only on repo-text validation
- [ ] **[SIL] Reusable SEO trust-strip template** — centralize the free-membership / responsible-gambling snippet so future high-intent pages inherit the same launch-safe copy

## Completed This Session (2026-03-31)

- [x] Added `docs/LAUNCH_CHECKLIST.md` for soft-launch vs full-launch readiness
- [x] Added `docs/FEATURE_FLAG_ACTIVATION_MATRIX.md` mapping every `VITE_PG_FEATURE_*` flag to its activation requirements
- [x] Added dashboard `MemberWelcomeCard` explaining free Vault membership, VaultSparked Pro, and beta-gated features
- [x] Extended the trust/compliance pass to top-intent calculator and comparison pages
- [x] Added `npm run smoke:launch` (`scripts/validate-launch-smoke.mjs`) to validate launch-critical docs and copy
- [x] Added centralized frontend launch-state flags in `src/launchState.js`
- [x] Beta-gated AI / live / push / billing surfaces instead of presenting them as fully live
- [x] Updated app shell, footer, landing page, and README to explain the free Vault membership model
- [x] Normalized stale share/referral/export URLs to the canonical `vaultsparkstudios.com/promogrind/` path
- [x] Added launch-state utility tests (71 → 75 passing)

## Session 23 Audit — Free Launch Readiness (2026-03-31)

> Launch lens for this audit: "ready to deploy as a free product." Overall app quality is strong; free-launch readiness is held back by access-model drift and truth/compliance gaps, not by calculator depth.

| Rank | Item | Why it matters | Impact | Effort | Status |
|---|---|---|---|---|---|
| 1 | Ungate core free product from Vault auth | Biggest contradiction in the repo: free product promise vs global login redirect | 10/10 | M | 🔲 Next session |
| 2 | Free-launch hardening for dead integrations | Prevents users from hitting non-functional live scanners, billing, or AI paths | 9/10 | S | 🔲 Next session |
| 3 | Trust/compliance copy pass | Raises public credibility and lowers launch risk in gambling-adjacent category | 8/10 | S | 🔲 Next session |
| 4 | Search Console submission | Highest-value manual action for discovery once public guest access exists | 8/10 | S | 🔲 MANUAL |
| 5 | Guest-mode smoke tests | Protects the new free path before refactors or public traffic | 7/10 | S | 🔲 [SIL] |
| 6 | Legacy URL normalization | Removes trust erosion from stale share/export links | 6/10 | S | 🔲 Future |

## Session 22 Brainstorm — All 30 Items (v22.0 Audit — 70/100)

> Full innovation brainstorm from session 22 (complete project audit, 2026-03-27). Score Δ = points added to weighted 70/100 overall. Effort: S=<2hr / M=2-8hr / L=8hr+.

| # | Tier | Item | Synopsis | Impact | Score Δ | Effort | Status |
|---|------|------|----------|--------|---------|--------|--------|
| 1 | Activation | Deploy ANTHROPIC_API_KEY + 4 AI functions | PromoChat, Advisor, Action Plan, Bet Slip Parser — app's biggest differentiators. One secret unlocks all. | 10/10 | +8 | S | 🔲 MANUAL |
| 2 | Activation | Buy promogrind.com + submit sitemap to GSC | 84+ SEO pages invisible without domain. $15 + 5 min = indexing clock starts. | 9/10 | +7 | S | 🔲 MANUAL |
| 3 | Activation | Wire live affiliate links (DK/FD/BetMGM) | Every calculator click currently dead revenue. Paste 3 URLs into books.js after approval. $75+ CPA. | 10/10 | +6 | S | 🔲 MANUAL |
| 4 | Activation | Set RESEND_API_KEY + deploy email functions | Onboarding drip (9 emails), weekly digest, trial expiry all coded. Email is #1 retention lever. | 9/10 | +5 | S | 🔲 MANUAL |
| 5 | Activation | Submit Chrome extension to Web Store | Built locally, tested. $5 one-time fee. 200-1K passive installs/mo in niche. | 8/10 | +4 | S | 🔲 MANUAL ($5) |
| 6 | Activation | Deploy calc-api function (public REST API) | No secrets needed. Enables affiliate partnerships + developer ecosystem. | 7/10 | +3 | S | 🔲 MANUAL |
| 7 | Growth | Reddit r/sportsbook + r/matchedbetting outreach | 800K+ targeted audience. Genuine calc walkthrough = 5K-20K impressions per post. | 7/10 | +4 | S | 🔲 MANUAL |
| 8 | Growth | YouTube calculator walkthroughs (5 videos) | Screen record + Loom. Targets 2K-20K search/mo keywords. Zero production cost. | 7/10 | +6 | M | 🔲 MANUAL |
| 9 | Growth | Discord bot activation (daily promo digest) | Code exists in discord-bot/. Deploy to Railway free tier. | 5/10 | +3 | S | 🔲 MANUAL |
| 10 | Retention | Weekly "Grind Report" personalized P/L email | "You made $X last week" is #1 retention hook. Converts trials at 15-25%. | 8/10 | +5 | S | 🔲 MANUAL (RESEND) |
| 11 | Retention | Profit Certificate — shareable win card | Ledger-backed "I made $847 this month" card. One-tap share → testimonial + viral loop. | 7/10 | +5 | M | 🔲 v22 |
| 12 | Retention | "Grind Buddy" accountability pairing | Opt-in mutual P/L challenge. Doubles retention. | 6/10 | +4 | M | 🔲 Future |
| 13 | Retention | Push notification "Best opportunity right now" | VaultSparked-exclusive. Daily 9am push + calculator deeplink (VAPID keys needed). | 7/10 | +4 | S | 🔲 MANUAL (VAPID) |
| 14 | Retention | "Beat Last Week" personalized push challenge | Monday push with self-reinforcing performance loop. | 6/10 | +3 | M | 🔲 Future |
| 15 | Monetization | Concierge tier — "Done For You" promo service | $99/mo, Claude does 90%, human validates. 20 clients = $2K MRR. | 8/10 | +5 | M | 🔲 Future |
| 16 | Monetization | Creator affiliate program activation | Landing page built v20. 5 creators × 10 converts/mo = 50 new subs/mo. | 8/10 | +5 | M | ✅ Done v20 (page) |
| 17 | Monetization | Embed syndication deal (3 affiliate sites) | White-label embed live. Approach betting blogs. | 6/10 | +4 | M | 🔲 MANUAL |
| 18 | Monetization | Public calculator API docs page | calc-api built. $49/mo above free tier. Devs + affiliates = backlinks. | 6/10 | +4 | M | 🔲 Future |
| 19 | Monetization | Annual report PDF email capture | Report page built. Email gate → journalist outreach → backlinks. | 5/10 | +3 | S | 🔲 Future |
| 20 | Platform | Component extraction (App.jsx → modules) | Extract Tracker/Ledger/LiveScanner. Unlocks lazy loading, tests, parallel dev. | 7/10 | +8 | L | 🔲 Next session |
| 21 | Platform | Mobile app iOS/Android (Capacitor) | Config ready. App Store = permanent home screen. -40% churn. | 8/10 | +5 | L | 🔲 MANUAL (build env) |
| 22 | Platform | Expanded test coverage (components + integration) | 32→60+ tests. UI component tests. Safe refactoring foundation. | 6/10 | +6 | M | 🔲 v22 |
| 23 | SEO | State legalization alert signup | Email capture for non-legal states. 30%+ conversion when state legalizes. | 5/10 | +3 | S | 🔲 Future |
| 24 | SEO | 50-state completion (add remaining 10) | TX, FL, GA, WI, IL + 5 more. Template-driven. | 5/10 | +2 | S | 🔲 Future |
| 25 | SEO | Competitor comparison page updates | 3 pages built. Monthly refreshes = recurring SEO. | 5/10 | +3 | M | 🔲 Future |
| 26 | SEO | Backlink outreach (HARO + betting forums) | 10 expert answers/week. Targets 20+ high-authority links in 3 months. | 6/10 | +4 | S | 🔲 MANUAL |
| 27 | Platform | Light mode settings toggle | Dark/light toggle, localStorage persistence, body.light sync, blocking script. | 3/10 | +1 | S | ✅ Done v22 |
| 28 | International | PT-BR market completion (3 pages) | ev-calculator-pt, parlay-calculator-pt, matched-betting-pt. First mover in 200M pop market. | 5/10 | +2 | S | 🔲 v22 |
| 29 | Distribution | Promo expiry countdown embeddable widget | 2-line script embed. Every embed = backlink + brand + distribution. | 7/10 | +5 | M | 🔲 Future |
| 30 | Infrastructure | Move to promogrind.com (domain migration) | DNS + CNAME. Reduces lost traffic to subdomain. | 6/10 | +4 | S | 🔲 MANUAL |

---

## Session 20 Brainstorm — All 30 Items (v20.0 Audit — Fresh 68/100)

> Full innovation brainstorm from session 20 (complete project audit, 2026-03-27). Score Δ = points added to weighted 68/100 overall. Effort: S=<2hr / M=2-8hr / L=8hr+.

| # | Tier | Item | Synopsis | Impact | Score Δ | Effort | Status |
|---|------|------|----------|--------|---------|--------|--------|
| 1 | Activation | Set ANTHROPIC_API_KEY + deploy 4 AI fns | One secret unlocks PromoChat, Advisor, Action Plan, Bet Slip Parser — the app's biggest differentiators | 10/10 | +8 | S | 🔲 MANUAL |
| 2 | Activation | Wire affiliate links in books.js | Every calculator click to a book is dead revenue. DK/FD/BetMGM pay $50-200 CPA | 10/10 | +6 | S | ✅ Done (structure) |
| 3 | Activation | Set RESEND_API_KEY + deploy onboarding drip | 9-email nurture sequence fully written, zero new code. Converts trials at 15-25% | 9/10 | +5 | S | 🔲 MANUAL |
| 4 | Activation | Submit sitemap + buy promogrind.com | 84 SEO pages invisible to Google. $15 domain + 5 min = indexing clock starts | 9/10 | +7 | S | 🔲 MANUAL |
| 5 | Activation | Submit Chrome extension to Web Store | Built, tested locally. $5 + screenshots. 200-1K passive installs/mo in niche | 8/10 | +4 | S | 🔲 MANUAL ($5) |
| 6 | Activation | Reddit r/sportsbook + r/matchedbetting posts | 800K+ targeted audience. Genuine calc walkthrough = 5K-20K impressions per post | 7/10 | +4 | S | 🔲 MANUAL |
| 7 | Retention | "Guaranteed Profit" summary card on calculators | Makes the math visceral. One-tap share drives organic word-of-mouth | 8/10 | +5 | S | ✅ Done v20 |
| 8 | Retention | "Grind Report" weekly personalized P/L email | Weekly digest function built. "You made $X last week" is the #1 retention hook | 8/10 | +5 | S | 🔲 MANUAL (RESEND) |
| 9 | Retention | Push notification "Best opportunity right now" | VaultSparked-exclusive. Daily 9am push + calculator deeplink. #1 reason to stay subscribed | 7/10 | +4 | S | 🔲 MANUAL (VAPID) |
| 10 | Retention | "Profit Certificate" shareable win card | "I made $847 this month." Ledger-backed, one-tap share → testimonial + ad + backlink | 7/10 | +5 | M | 🔲 Future |
| 11 | Retention | "Grind Buddy" accountability pairing | Opt-in mutual P/L challenge. Doubles retention — churn means hurting a friend's streak | 6/10 | +4 | M | 🔲 Future |
| 12 | Retention | "Beat Last Week" personalized push challenge | Monday: "Last week $312. Target: $350. Here's how." Self-reinforcing performance loop | 6/10 | +3 | M | 🔲 Future |
| 13 | Distribution | "The Grind" weekly newsletter | Owned distribution channel (not rented like SEO/social). 10K subs = bulletproof growth engine | 9/10 | +6 | M | ✅ Done v20 |
| 14 | Distribution | Promo Expiry Countdown embeddable widget | 2-line script embed for affiliate sites. Every embed = backlink + brand + distribution | 7/10 | +5 | M | 🔲 Future |
| 15 | Distribution | YouTube calculator walkthroughs (5 videos) | Screen record + Loom. Targets 2K-20K search/mo keywords. Zero production cost | 7/10 | +6 | M | 🔲 MANUAL |
| 16 | Distribution | State legalization alert signup | Email capture for non-legal states. When a state legalizes, email converts at 30%+ | 5/10 | +3 | S | 🔲 Future |
| 17 | AI | Persistent PromoChat history | Chat history → appData sync. "Last time you said bankroll was $2K" = relationship | 7/10 | +4 | M | 🔲 Future |
| 18 | AI | Stack Builder — optimal 3-book promo sequence | "Your guaranteed $487 this week" from bankroll input. No competitor has this | 9/10 | +5 | M | ✅ Done v20 |
| 19 | AI | Bet Slip OCR → auto-fill all calculators | Parser built but only wired to BonusBet. Wire to every calc. 10x mobile UX | 7/10 | +4 | M | 🔲 MANUAL (key) |
| 20 | AI | Promo T&C URL scraper | Paste promo URL → Claude auto-fetches + analyzes. Eliminates copy-paste friction entirely | 7/10 | +4 | M | 🔲 Future |
| 21 | Monetization | Concierge tier — "Done For You" promo service | $99/mo, Claude does 90%, human validates. 20 clients = $2K MRR, 2 hrs/week | 8/10 | +5 | M | 🔲 Future |
| 22 | Monetization | Public calculator API docs page | calc-api built, 1 deploy command. $49/mo above free tier. Devs + affiliates = backlinks | 6/10 | +4 | M | 🔲 Future |
| 23 | Monetization | Creator affiliate program activation | DB infra live. Landing page built v20. 5 creators × 10 converts/mo = 50 new subs/mo | 8/10 | +5 | M | ✅ Done v20 (page) |
| 24 | Monetization | Embed syndication deal (3 affiliate sites) | White-label embed live. Approach betting blogs: "add our calcs, we handle math" | 6/10 | +4 | M | 🔲 MANUAL |
| 25 | Monetization | Annual report PDF email capture | Report page built. Productize: email capture for PDF download → journalist PR outreach | 5/10 | +3 | S | 🔲 Future |
| 26 | Platform | Mobile app iOS/Android (Capacitor) | Capacitor config ready. App Store = permanent home screen. Reduces churn 40%+ | 8/10 | +5 | L | 🔲 MANUAL (build env) |
| 27 | Platform | Component extraction (App.jsx → modules) | 503KB monolith. Extract Tracker/Ledger/LiveScanner. Unlocks lazy loading, tests, parallel dev | 7/10 | +8 | L | 🔲 Next session |
| 28 | Platform | Vitest unit test suite | 20 tests for core math. Zero regression risk. Foundation for safe refactoring | 6/10 | +6 | M | ✅ Done v20 |
| 29 | Platform | International: Brazil PT-BR pages | Brazil legalized 2024. 200M pop, thin competition in PT-BR niche. First mover | 6/10 | +4 | M | ✅ Done v20 |
| 30 | Platform | Discord bot activation | Code in discord-bot/. Daily promo digest → links to calculator. Each post = touchpoint | 5/10 | +3 | S | 🔲 MANUAL |

---

## 🔴 Human Action Required — Priority Queue

> All items require manual browser logins, credentials, purchases, or CLI commands. Sorted by impact-per-minute.

### P0 — Zero cost, <15 min each (DO THESE FIRST)
- [ ] `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then deploy: `supabase functions deploy promo-chat promo-advisor ai-action-plan parse-bet-slip stack-builder`
- [ ] `supabase functions deploy calc-api` (no secrets needed — public REST API)
- [ ] Run `supabase/migrations/migration-gift-tokens.sql` in Supabase SQL Editor
- [ ] Submit `https://vaultsparkstudios.com/promogrind/sitemap.xml` to Google Search Console

### P1 — Small cost or short setup (<1 hr each)
- [ ] Buy **promogrind.com** (~$15/yr) — `public/CNAME` already set. Add DNS CNAME → `vaultsparkstudios.github.io`
- [ ] `supabase secrets set RESEND_API_KEY=...` → deploy: `onboarding-drip weekly-digest gift-trial`
- [ ] Generate VAPID: `npx web-push generate-vapid-keys` → `supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=...` → `supabase functions deploy send-daily-brief` → run `migration-push-subscriptions.sql`
- [ ] Apply to affiliate programs: [DraftKings](https://www.draftkings.com/partners) / [FanDuel](https://partners.fanduel.com) / [BetMGM](https://www.betmgmpartners.com) → update `affiliateLink` in `src/books.js`

### P2 — Costs $5 + some setup time
- [ ] **Chrome Web Store**: take 1280×800 screenshots of extension popup + sidebar → submit at chrome.google.com/webstore/devconsole ($5 one-time dev fee)
- [ ] **Reddit**: post genuine calc walkthrough in r/sportsbook + r/matchedbetting (no promotion, real math)
- [ ] **YouTube**: record 5 short screen walkthroughs (Loom or OBS, no production needed)
- [ ] **Discord bot**: create Discord dev account → create server → `node discord-bot/bot.js` or deploy to Railway

### [SIL] From Session 20/21 Brainstorm
- [ ] **[SIL] App.jsx inline math → src/lib/shared.js imports** — now that shared.js is tested, a surgical ~200-line refactor makes all App.jsx math covered by the test suite; dedicated session, no scope creep
- [ ] **[SIL] PT-BR market completion** — add ev-calculator-pt, parlay-calculator-pt, matched-betting-pt; same template; 30 min each; closes the 3 highest-traffic PT-BR keywords not yet covered
- [ ] **[SIL] Light mode settings option** — KD/KL palettes + getter-based S already in place; wire `Object.assign(K, darkMode ? KD : KL)` at top of App render + add toggle in a new Settings page; all infrastructure done in session 21
- [ ] **[SIL] Guest-mode boot + top free calculator smoke tests** — cover unauthenticated app load and top calculators before/after auth-gate decoupling
- [ ] **[SIL] Public free-launch landing/copy pass** — make "no account required" explicit and reserve login only for sync/community/pro flows

### P3 — Multi-week (external blockers)
- [ ] LLC → EIN → bank account → Stripe live keys → create products → `supabase secrets set STRIPE_SECRET_KEY=...` → deploy `create-checkout` + `stripe-webhook` in live mode
- [ ] **Android app**: `npm run build:cap` → Android Studio → Play Store (Windows build OK, iOS needs Mac)
- [ ] **Creator outreach**: email 10 betting YouTube/TikTok creators with vanity code offer (30% rev share, stats dashboard ready)

---

## Session 19 Brainstorm — All 30 Items (v19.0 Audit)

| # | Tier | Item | Impact | Score Δ | Status |
|---|------|------|--------|---------|--------|
| 1 | Revenue | Affiliate Program Applications (DK/FD/BetMGM) | 10/10 | +18 | 🔲 MANUAL |
| 2 | Revenue | Stripe Test Mode Checkout Validation | 8/10 | +4 | ✅ Done |
| 3 | Revenue | Annual Plan Discount In-App Banner | 7/10 | +2 | 🔲 Parked |
| 4 | Revenue | "Beat Your Books" Weekly Free Tier Email | 7/10 | +3 | 🔲 Parked (needs RESEND) |
| 5 | Distribution | promogrind.com Domain Migration | 9/10 | +5 | 🔲 MANUAL |
| 6 | Distribution | Google Search Console Sitemap Submit | 8/10 | +3 | 🔲 MANUAL |
| 7 | Distribution | Chrome Web Store Submission | 8/10 | +4 | 🔲 MANUAL ($5) |
| 8 | Distribution | hreflang Tags on EN/ES Page Pairs | 6/10 | +2 | ✅ Done |
| 9 | Distribution | Backlink Seeding via Reddit + Betting Forums | 7/10 | +4 | 🔲 MANUAL |
| 10 | Distribution | Public API Documentation Page | 6/10 | +3 | 🔲 Parked |
| 11 | AI | AI Bet Slip Scanner Activation | 8/10 | +2 | 🔲 MANUAL (ANTHROPIC key) |
| 12 | AI | AI Action Plan Activation | 7/10 | +2 | 🔲 MANUAL (ANTHROPIC key) |
| 13 | AI | Promo Advisor Activation | 8/10 | +3 | 🔲 MANUAL (ANTHROPIC key) |
| 14 | AI | Enhanced AI Chat Widget (Conversational) | 9/10 | +5 | ✅ Done |
| 15 | AI | Promo Opportunity Push Notifications | 7/10 | +3 | 🔲 MANUAL (VAPID keys) |
| 16 | Retention | Discord Community Launch | 7/10 | +3 | 🔲 MANUAL |
| 17 | Retention | Social Proof "Wins Wall" | 7/10 | +3 | 🔲 Parked |
| 18 | Retention | Gamified Monthly Referral Contest | 6/10 | +2 | 🔲 Parked |
| 19 | Retention | "7-Day Promo Mastery" Email Course | 7/10 | +3 | 🔲 Parked |
| 20 | Retention | State Legalization Push Alert | 6/10 | +2 | 🔲 Parked |
| 21 | SEO | 50-State SEO Completion (30→50) | 6/10 | +2 | 🔲 Future |
| 22 | SEO | "State of Sports Betting Promos" Annual Report | 8/10 | +5 | ✅ Done |
| 23 | SEO | YouTube SEO Video Content (5 explainers) | 7/10 | +3 | 🔲 MANUAL |
| 24 | SEO | Embed Mode Syndication Outreach | 6/10 | +3 | 🔲 Parked |
| 25 | Platform | Android App (Capacitor) | 8/10 | +4 | 🔲 MANUAL (build env) |
| 26 | Platform | App.jsx Component Extraction (Refactor) | 5/10 | +5 (code quality) | 🔲 Next session (needs tests first) |
| 27 | Platform | Automated Test Suite (Vitest) | 5/10 | +4 | ✅ Done v20 |
| 28 | Platform | Influencer Creator Program Activation | 8/10 | +4 | ✅ Done v20 (page) |
| 29 | Platform | Google Ads Campaign (Competitor Keywords) | 7/10 | +3 | 🔲 Parked (needs revenue first) |
| 30 | Monetization | White-Label B2B Agency Tier ($199/mo) | 8/10 | +5 | ✅ Done (UI) |

---

## Session 18 Brainstorm — All 23 Items (v17.0 Audit)

| # | Tier | Item | Impact | Score Δ | Status |
|---|------|------|--------|---------|--------|
| 1 | Distribution | promogrind.com Domain Migration | 9/10 | +4 | 🔲 MANUAL |
| 2 | Distribution | Google Search Console Sitemap Submit | 8/10 | +3 | 🔲 MANUAL |
| 3 | Distribution | Programmatic State SEO (10→30 states) | 7/10 | +3 | ✅ Done |
| 4 | Distribution | Backlink Seeding HARO/Reddit | 7/10 | +3 | 🔲 MANUAL |
| 5 | Revenue | Affiliate Programs DK/FD/BetMGM | 10/10 | +15 | 🔲 MANUAL |
| 6 | Revenue | Trial Expiry Email Sequence (day 4+6) | 8/10 | +3 | ✅ Done |
| 7 | Revenue | Annual Plan Discount Banner | 7/10 | +2 | 🔲 Parked |
| 8 | Revenue | Stripe Test Mode Checkout | 8/10 | +4 | ✅ Done |
| 9 | AI | Promo Advisor (Claude Haiku explainer) | 9/10 | +4 | ✅ Done |
| 10 | AI | Personalized Weekly Report Card Email | 8/10 | +3 | ✅ Done |
| 11 | AI | AI Bet Slip Scanner Deploy | 8/10 | +2 | 🔲 MANUAL (ANTHROPIC key) |
| 12 | AI | Enhanced AI Chat Widget (full conv.) | 8/10 | +4 | ✅ Done v19 |
| 13 | Retention | Daily Streak Vault Points Milestones | 7/10 | +2 | ✅ Done |
| 14 | Retention | Copy My Setup Share Cards | 7/10 | +2 | 🔲 Parked |
| 15 | Retention | Push Notification Daily Brief Activate | 7/10 | +2 | 🔲 MANUAL (VAPID keys) |
| 16 | Retention | Promo Stacking Enhanced Calculator | 7/10 | +3 | 🔲 Future |
| 17 | Retention | Trial Urgency Banner (≤3 days) | 7/10 | +2 | ✅ Done |
| 18 | Platform | Chrome Extension Web Store | 8/10 | +3 | 🔲 MANUAL ($5) |
| 19 | Platform | Capacitor Mobile Android | 8/10 | +3 | 🔲 MANUAL (Mac for iOS) |
| 20 | Platform | Embed Mode Partner Syndication | 6/10 | +2 | 🔲 Parked |
| 21 | Monetization | Promo Concierge $9.99/mo Tier | 7/10 | +3 | ✅ Done (waitlist) |
| 22 | Monetization | Affiliate Link A/B Rotation | 6/10 | +2 | 🔲 Parked (needs live links first) |
| 23 | Monetization | Grind Report Annual PDF ($4.99) | 5/10 | +1 | 🔲 Parked |

---

## Persistent Parking Lot (valid ideas, not time-critical)

- Annual Plan Discount in-app banner — push monthly→annual ($199, 2 months free)
- "Wins Wall" social proof — opt-in anonymized user wins on landing page
- Monthly referral contest — top referrer wins 1 month free (referral infra live)
- Copy My Setup deep link share cards
- Promo Stacking multi-step guided tool
- Affiliate link A/B rotation (after live links are active)
- Google Ads campaign (after first $500/mo revenue)
- Grind Report annual paid PDF ($4.99)
- State legalization alert email capture
- Promo T&C URL scraper (Claude fetches URL instead of paste)
- "Profit Certificate" shareable ledger-backed win card
- "Grind Buddy" accountability pairing feature
- "Beat Last Week" personalized push challenge
- Promo Expiry Countdown embeddable widget
- Concierge tier ($99/mo done-for-you) — activate at 50 VaultSparked subs
- Public API docs page (after calc-api deployed)
- Embed syndication outreach (after domain live)
- 50-state SEO completion (WI, TX, GA, FL + 16 more)
- Discord community launch (code exists in discord-bot/)
