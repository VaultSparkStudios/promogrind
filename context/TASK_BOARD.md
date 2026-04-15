# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [x] **Google Search Console** — verified promogrind.bet via Cloudflare DNS TXT, sitemap submitted at https://promogrind.bet/sitemap.xml
- [x] **RESEND_API_KEY** — confirmed set in Supabase secrets (S39 audit)
- [x] **Stripe Customer Portal** — config `bpc_1TLsRNGMN60PfJYsM0S0ByAh` active, pinned in edge function (S38/S39)
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + "Manage billing →" portal redirect
- [ ] **Affiliate/referral links** — finish pasting personal referral URLs into `referralLink` fields in `src/books.js` for the remaining books (DraftKings, FanDuel, and Caesars are now configured)
- [ ] **Friend beta pass** — manually create/sign in with a friend-facing PromoGrind account, confirm the new in-app auth flow feels project-local, and verify shared-account messaging stays secondary

## Now
- [x] **S45 stabilization pass** — recovered interrupted refinement tranche; tests, build, and bundle budget are green again
- [x] Delete orphaned root .jsx duplicates (Promo_Engine_v2/v3, Sportsbook_Promo_Conversion_System) — no root-level orphan `.jsx` duplicates remain in this repo
- [x] Security headers via `public/_headers` — CSP, Referrer-Policy, Permissions-Policy, X-Content-Type-Options, X-Frame-Options (Cloudflare Pages native)
- [x] UI primitives in `src/ui.jsx` — state components landed, key loading views use `<LoadingState/>`, auth dialog supports `Escape`, and main tab bars now support Arrow/Home/End keyboard nav
- [x] Edge rate-limit helper in `supabase/functions/_shared/http.ts` — in-memory burst limiting plus durable `vault_events`-backed enforcement wired into promo-chat, promo-advisor, ai-action-plan, and stack-builder
- [x] Adaptive trust score — aggregate accuracy per calculator × promo-type × book in `src/track/insights.js`; render "Accuracy so far: X% (N settlements)" on calculator results; feedback ids now use `crypto.randomUUID()` when available
- [x] [SIL] Confidence layer — pure sensitivity helpers in `src/lib/shared.js`; sensitivity chips now render on key calculator result rows
- [x] Image pipeline — `sharp` prebuild emits AVIF/WebP for `public/og-image.png`; bundle-budget script enforces main chunk <= 420KB
- [x] [SIL] Promo intake pipeline — paste pipeline → regex parser → normalized PromoCard (type, book, min odds, max stake, expiry) → auto-suggest calculator
- [x] Shadow book mode — simulate workflow value on un-owned books to quantify affiliate value
- [ ] Extract `App.jsx` routes into `src/routes/*` — first route extraction pattern landed (`PromoIntakeRoute`); broader monolith carve-up still pending
- [ ] [SIL:2⛔] Smart promo alert system — push notification when high-EV promo goes live; wire VAPID send-daily-brief fn + "notify me" toggle in DailyBriefPage
- [ ] [SIL:2⛔] Onboarding completion tracker — localStorage pg_onboarding_steps[] + progress bar in Dashboard header, reads GetStarted step completion

## Innovation Bets (new this session)
- **Adaptive trust score** — per-calculator × promo-type × book accuracy, visible on results
- **Sensitivity chips** — hover bands show how much output moves per 10% input change
- **Shadow book mode** — quantify weekly value of creating an account at un-owned books (drives affiliate conversion)
- **Promo intake normalizer** — paste text → PromoCard; cuts entry time from 60s to ~3s
- **Drift alert (deferred to Next)** — background diff projected vs realized per promo type; surfaces cold promo classes
- **Reason-for-skip capture (deferred to Next)** — one-tap reason when user marks skipped; becomes promo-quality signal
- **Self-calibration chart (deferred to Next)** — "Your calcs were 92% accurate last 30 days" makes the loop visible
- **Micro-NPS after 3 settlements (deferred to Next)** — 1-tap "was this worth it?" → silScore input
- [x] Audit tranche 2 — extract dashboard state from `src/App.jsx` into focused modules
- [x] Build a true "Today" dashboard: expiring promos, unfinished work, next-best action, bankroll posture, recent settled profit
- [x] Launch copy alignment — sync smoke-covered marketing pages + trust-strip template to PromoGrind-native account wording and update smoke validators
- [x] Project-local auth UX — keep account creation on PromoGrind while preserving shared Vault identity + shared username metadata
- [x] Result feedback loop — ask "placed / skipped / settled / actual profit / calculator accurate?" after key workflows
- [x] Deploy updated AI edge functions: `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder`
- [x] Browser smoke expansion — cover age gate, first calculator result, sportsbook CTA, pricing, auth menu, and 375px mobile layout
- [x] Domain migration — promogrind.bet purchased, Cloudflare zones + CNAME + redirect configured, GitHub Pages custom domain set
- [x] NS switch confirmed — promogrind.bet live on Cloudflare (DNS verified S37)
- [x] PostHog analytics — src/analytics.js, user identity on auth, key events tracked
- [x] Sentry error monitoring — ErrorBoundary in main.jsx, project created, VITE_SENTRY_DSN set
- [x] Cloudflare Web Analytics — free, no-cookie, beacon live in index.html
- [x] AI edge functions deployed — promo-chat + promo-advisor + ai-action-plan
- [x] All 9 GitHub Secrets set
- [x] Stripe live secrets deployed — all 7 price IDs + webhook + STRIPE_TEST_MODE=false
- [x] Age gate + compliance pages (Income Access audit)
- [x] Contrast audit — WCAG AA compliant across dark + light themes (S36)
- [x] UserMenu — 12 sports avatar emoji, editable display name, tier badge, animated dropdown (S37)
- [x] Header — sticky + backdrop-blur, responsive, auth always visible top-right (S37)
- [x] Tab bar — sticky, 44px touch targets, iOS momentum scroll, tap-delay suppression (S37)
- [x] Responsive overhaul — iOS zoom prevention, safe-area insets, scrollbar polish, touch-action (S37)
- [x] sitemap.xml — /about/ and /compliance/ added, 145 URLs total (S37)
- [x] manifest.json path fixed — /promogrind/manifest.json → /manifest.json (S37)
- [x] Promo Advisor — guest sign-in gate, explicit auth headers on edge function (S37)
- [x] Branding softened — "Free Vault Membership" → "Free PromoGrind Account" everywhere (S37)
- [x] Stripe Customer Portal edge function — `supabase/functions/customer-portal/index.ts` deployed (S38)
- [x] manageBilling() in auth.js — calls customer-portal, dispatches pg:billing-unavailable if no sub (S38)
- [x] UserMenu "Manage billing →" wired to manageBilling() — no longer links to VaultSpark (S38)
- [x] RESEND URL migration — onboarding-drip (11 URLs) + weekly-digest + create-checkout updated to promogrind.bet (S38)
- [x] onboarding-drip + create-checkout re-deployed (S38)
- [x] Beta invite code system — `beta_codes` table + `redeem-beta-code` edge function deployed (S39)
- [x] UserMenu — "Have a beta invite code?" section for Free Agent tier (S39)
- [x] Home tab suite — Daily Brief, Get Started, What's New, Pricing, About tabs added to Home group (S39)
- [x] Global text size increase — all nav/label/input/note/help/RR text bumped 1–2px (S39)
- [x] Sprint 1 hardening — shared server-side AI entitlement/quota helper wired into PromoChat, PromoAdvisor, AI Action Plan, and Stack Builder
- [x] Sprint 1 revenue measurement — sportsbook CTA click tracking added for calculator result CTAs
- [x] Sprint 1 activation UX — Dashboard now shows one prioritized next-best action
- [x] Sprint 1 performance — PromoChat/PromoAdvisor lazy-loaded and analytics split into its own build chunk
- [x] Sprint 1 Wins Wall support — migration tightened with unique user/period upsert support and client publish path updated

## Next
- [ ] [SIL] Drift alert — background diff of projected vs realized profit per promo type
- [ ] Reason-for-skip capture — one-tap reason when user marks skipped in ResultFeedbackCard (odds moved / EV too low / deposit capped)
- [ ] [SIL] Self-calibration chart — surface "Your calcs were X% accurate last 30 days" inside Track
- [ ] Micro-NPS after 3 settlements — 1-tap "Was this calc worth it?" → feeds SIL
- [ ] Move auth tokens to httpOnly cookies OR accept localStorage + add refresh-rotation test coverage for hijack scenarios
- [ ] Offline write-queue in `src/sync.js` (IndexedDB) for ledger/feedback writes when offline
- [ ] Keyboard-nav follow-through — extend beyond tab bars to pinned favorites, compare selector flows, and remaining dialog/button clusters
- [ ] Motion-reduce guard for transitions (prefers-reduced-motion)
- [ ] Aria audit pass on `src/ui.jsx` (currently 0 aria attrs)
- [ ] State-aware + book-aware personalization for sportsbook CTAs and recommended workflows
- [ ] Playbooks — reusable promo routines by bankroll, promo type, and available books
- [ ] Community intel upgrade — freshness, verification, report quality, and region filters on promo submissions
- [ ] Observability dashboard — activation, return rate, CTA CTR, AI usage, and monetization health
- [ ] Bundle budget in CI — fail or warn when first-load bundle exceeds target
- [ ] Set up cron trigger for onboarding-drip (run daily) + weekly-digest (run weekly)
- [ ] Stripe smoke test — follow `docs/STRIPE_SMOKE_TEST.md`, verify subscriptions table row + customer portal redirect
- [ ] VAPID keys → deploy send-daily-brief push notification function
- [x] Apply `scripts/migration-wins-wall.sql` in Supabase SQL Editor, then verify Dashboard Wins Wall loads server entries
- [x] [SIL:2⛔] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books
- [x] Security/privacy hardening tranche 1 — restricted CORS helper, safer extension DOM rendering, analytics masking defaults

## Later
- [ ] **CANON-007 staging (at SPARKED transition)** — stand up `promogrind.staging.vaultsparkstudios.com` on Hetzner before flipping vaultStatus to sparked; required once paying users exist
- [ ] Reddit launch posts: r/sportsbook + r/matchedbetting
- [ ] YouTube: 5 explainer screen recordings
- [ ] Android: `npm run build:cap` → Play Store
- [ ] PWA screenshots → Chrome Web Store submission ($5 fee)
- [ ] Apply to DraftKings/FanDuel affiliate programs (Income Access network)
- [ ] AI abuse analytics — review `vault_events` quota logs for cost spikes, blocked users, and plan-limit tuning
- [ ] Service worker improvement: stale-while-revalidate + offline ledger queue
- [ ] App.jsx component extraction (ongoing — extract 2-3 calculators per session into src/calculators/)
- [ ] Calculator receipt exports — generate shareable math receipts with inputs, formula, hedge, profit both outcomes, timestamp, and disclaimer
- [ ] State/book availability intelligence — personalize sportsbook CTAs by legal state and book availability
- [ ] Creator/referral landing packs — UTM-aware landing pages with creator attribution and calculator presets
- [ ] Feature flag admin surface — server-controlled rollout, kill switches, beta cohorts, and tier gating
- [ ] Observability dashboard — activation, calculator completion, sportsbook CTA CTR, AI quota usage, checkout conversion, retained ledger users
- [ ] Bundle budget in CI — warn/fail when main app chunk exceeds target size
- [ ] Offline-first ledger queue — queue writes, show sync status, and resolve conflicts per entity timestamp
- [ ] AI response schema validation — validate JSON server-side, include assumptions/confidence, and add advice guardrails
- [ ] Calculator domain extraction — move calculators into dedicated modules with shared hooks and tests
- [ ] Dashboard domain extraction — isolate activity feed, next-best-action, wins wall, and onboarding surfaces

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
