# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [ ] **Namecheap nameservers** — point promogrind.bet + promogrind.app to `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com` (Namecheap → Domain List → Nameservers → Custom DNS). Unlocks the live domain.
- [ ] **Anthropic API key** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-wK9CBfDT…` then `supabase functions deploy promo-chat promo-advisor ai-action-plan` (key in vaultspark-studio-ops/secrets/anthropic.txt)
- [ ] **GitHub Secrets** — set VITE_PG_FEATURE_PROMO_CHAT=true + VITE_PG_FEATURE_PROMO_ADVISOR=true + VITE_PG_FEATURE_AI_ACTION_PLAN=true + VITE_POSTHOG_KEY=phx_32e8je… after deploy (repo Settings → Secrets → Actions)
- [ ] **Sentry project** — go to sentry.io → vaultspark-studios org → New Project → React → name: promogrind → copy DSN → add as VITE_SENTRY_DSN GitHub Secret
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js` for each sportsbook (Refer a Friend in each app)
- [ ] **Stripe webhook smoke test** — test purchase with card 4242 4242 4242 4242, verify `subscriptions` table row is created

## Now
- [x] Domain migration — promogrind.bet purchased, Cloudflare zones + CNAME + redirect configured, GitHub Pages custom domain set, full codebase migrated in single commit (105 files)
- [x] PostHog analytics — posthog-js installed, src/analytics.js module, user identify on auth, calculator_viewed + page + referral + login events tracked
- [x] Sentry error monitoring — @sentry/react installed, ErrorBoundary in main.jsx, activated by VITE_SENTRY_DSN (needs Sentry project creation — see manual blockers)
- [x] Cloudflare Web Analytics — free, no-cookie, beacon live in index.html
- [ ] Google Search Console — add promogrind.bet property, verify via DNS TXT record, submit sitemap.xml
- [ ] Deploy AI edge functions — Anthropic key ready, run: `supabase secrets set ANTHROPIC_API_KEY=… && supabase functions deploy promo-chat promo-advisor ai-action-plan`

## Next
- [ ] RESEND_API_KEY → deploy onboarding-drip, weekly-digest edge functions
- [ ] VAPID keys → deploy send-daily-brief push notification function
- [ ] Apply to DraftKings/FanDuel affiliate programs (Income Access network)
- [ ] PWA screenshots → Chrome Web Store submission ($5 fee)
- [ ] [SIL] EV + analytics dashboard in Track tab — aggregate P/L, hit rate by promo type, best books

## Later
- [ ] Reddit launch posts: r/sportsbook + r/matchedbetting
- [ ] YouTube: 5 explainer screen recordings
- [ ] Android: `npm run build:cap` → Play Store
- [ ] Server-side rate limiting for PromoChat/PromoAdvisor (move from localStorage to edge function + RLS)
- [ ] Service worker improvement: stale-while-revalidate + offline ledger queue
- [ ] App.jsx component extraction (ongoing — extract 2-3 calculators per session into src/calculators/)

## Deferred to Project Agents
- cross-repo item owned by another repo agent:
