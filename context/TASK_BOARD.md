# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [x] **Google Search Console** — verified promogrind.bet via Cloudflare DNS TXT, sitemap submitted at https://promogrind.bet/sitemap.xml
- [x] **RESEND_API_KEY** — confirmed set in Supabase secrets (S39 audit)
- [x] **Stripe Customer Portal** — config `bpc_1TLsRNGMN60PfJYsM0S0ByAh` active, pinned in edge function (S38/S39)
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + "Manage billing →" portal redirect
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js` (Refer a Friend in each sportsbook app)
- [ ] **wins_wall Supabase table** — create table so community wins wall can load from server (component already gracefully degrades to localStorage without it)

## Now
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
- [ ] Set up cron trigger for onboarding-drip (run daily) + weekly-digest (run weekly)
- [ ] Stripe smoke test — follow `docs/STRIPE_SMOKE_TEST.md`, verify subscriptions table row + customer portal redirect
- [ ] VAPID keys → deploy send-daily-brief push notification function
- [ ] Apply `scripts/migration-wins-wall.sql` in Supabase SQL Editor, then verify Dashboard Wins Wall loads server entries
- [ ] Deploy updated AI edge functions: `promo-chat`, `promo-advisor`, `ai-action-plan`, `stack-builder`
- [ ] [SIL:1] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books
- [ ] [SIL] Smart promo alert system — push notification when high-EV promo goes live; wire VAPID send-daily-brief fn + "notify me" toggle in DailyBriefPage
- [ ] [SIL] Onboarding completion tracker — localStorage pg_onboarding_steps[] + progress bar in Dashboard header, reads GetStarted step completion
- [ ] Security headers pass — add CSP, Referrer-Policy, Permissions-Policy, and production webhook-secret fail-closed check
- [ ] Browser smoke expansion — cover age gate, first calculator result, sportsbook CTA, pricing, auth menu, and 375px mobile layout

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

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
