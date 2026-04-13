# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [ ] **Google Search Console** — UNBLOCKED: add promogrind.bet property, verify via Cloudflare DNS TXT record, submit sitemap at https://promogrind.bet/sitemap.xml
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js` (Refer a Friend in each sportsbook app)
- [ ] **Stripe webhook smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row created
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

## Next
- [ ] Stripe Customer Portal edge function → wire "Manage billing" link in UserMenu (currently links to VaultSpark)
- [ ] RESEND_API_KEY → deploy onboarding-drip, weekly-digest edge functions
- [ ] VAPID keys → deploy send-daily-brief push notification function
- [ ] [SIL] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books

## Later
- [ ] Reddit launch posts: r/sportsbook + r/matchedbetting
- [ ] YouTube: 5 explainer screen recordings
- [ ] Android: `npm run build:cap` → Play Store
- [ ] PWA screenshots → Chrome Web Store submission ($5 fee)
- [ ] Apply to DraftKings/FanDuel affiliate programs (Income Access network)
- [ ] Server-side rate limiting for PromoChat/PromoAdvisor (move from localStorage to edge function + RLS)
- [ ] Service worker improvement: stale-while-revalidate + offline ledger queue
- [ ] App.jsx component extraction (ongoing — extract 2-3 calculators per session into src/calculators/)

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
