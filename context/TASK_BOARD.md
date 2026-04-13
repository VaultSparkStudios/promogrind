# Task Board

Public-safe roadmap only. Detailed backlog sequencing is maintained privately.

## Human Action Required
- [ ] **Anthropic API key** — `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...` then `supabase functions deploy promo-chat promo-advisor ai-action-plan` (console.anthropic.com)
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js` for each sportsbook (Refer a Friend in each app)
- [ ] **Custom domain** — check promogrind.io / .co / .app / getpromogrind.com → purchase → domain migration commit
- [ ] **Stripe webhook smoke test** — make a test purchase (use card 4242 4242 4242 4242) and verify `subscriptions` table row is created

## Now
- [ ] Deploy AI edge functions once Anthropic key is set
- [ ] Configure GitHub Secrets: VITE_PG_FEATURE_PROMO_CHAT=true, VITE_PG_FEATURE_PROMO_ADVISOR=true
- [ ] Add GitHub feature flag secrets once AI backend is live

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
