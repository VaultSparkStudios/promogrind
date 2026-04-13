# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [ ] **Namecheap nameservers** — point promogrind.bet + promogrind.app to `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com` (Namecheap → Domain List → Nameservers → Custom DNS). Unlocks the live domain.
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js` for each sportsbook (Refer a Friend in each app)
- [ ] **Stripe webhook smoke test** — test purchase with card 4242 4242 4242 4242, verify `subscriptions` table row is created
- [ ] **Google Search Console** — add promogrind.bet property, verify via DNS TXT record, submit sitemap.xml

## Now
- [x] Domain migration — promogrind.bet purchased, Cloudflare zones + CNAME + redirect configured, GitHub Pages custom domain set
- [x] PostHog analytics — src/analytics.js, user identity on auth, key events tracked
- [x] Sentry error monitoring — ErrorBoundary in main.jsx, project created, VITE_SENTRY_DSN set
- [x] Cloudflare Web Analytics — free, no-cookie, beacon live in index.html
- [x] AI edge functions deployed — promo-chat + promo-advisor + ai-action-plan
- [x] All 9 GitHub Secrets set
- [x] Stripe live secrets deployed — all 7 price IDs + webhook + STRIPE_TEST_MODE=false
- [x] Age gate + compliance pages (Income Access audit)
- [x] Contrast audit — WCAG AA compliant across dark + light themes (S36)
- [x] ProfilePanel — account/settings slide-in panel with tier, preferences, sign out (S36)
- [x] Account/Sign In button in header — visible pill with user initials (S36)
- [x] Splash screen CTAs — solid green primary + clear sign-in secondary (S36)

## Next
- [ ] RESEND_API_KEY → deploy onboarding-drip, weekly-digest edge functions
- [ ] VAPID keys → deploy send-daily-brief push notification function
- [ ] Apply to DraftKings/FanDuel affiliate programs (Income Access network)
- [ ] PWA screenshots → Chrome Web Store submission ($5 fee)
- [ ] [SIL] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books
- [ ] Stripe Customer Portal edge function → wire "Manage billing" link in ProfilePanel

## Later
- [ ] Reddit launch posts: r/sportsbook + r/matchedbetting
- [ ] YouTube: 5 explainer screen recordings
- [ ] Android: `npm run build:cap` → Play Store
- [ ] Server-side rate limiting for PromoChat/PromoAdvisor (move from localStorage to edge function + RLS)
- [ ] Service worker improvement: stale-while-revalidate + offline ledger queue
- [ ] App.jsx component extraction (ongoing — extract 2-3 calculators per session into src/calculators/)

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
