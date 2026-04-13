# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 35)
- Shipped: PostHog behavioral analytics + Sentry error monitoring — full analytics stack wired
- Shipped: promo-chat + promo-advisor + ai-action-plan edge functions deployed to Supabase (ANTHROPIC_API_KEY live)
- Shipped: All 9 GitHub Secrets set — VITE_POSTHOG_KEY + VITE_SENTRY_DSN added this session
- Shipped: Sentry project created via API (vaultspark-studios/promogrind) — DSN in GitHub Secrets + ops secrets file
- Shipped: Vite bumped to 6.4.2 — patched path traversal + arbitrary file read CVEs
- Shipped: launchTelemetry.js dead plausible calls replaced with analytics module
- Tests: 127/127 passing · Build: ✓ clean · delta: 0

## Session Intent
Analytics stack implementation (PostHog + Sentry) + AI edge function deployment + full secrets/infrastructure audit.

## Human Action Required
- [ ] **Namecheap nameservers** — point both domains to Cloudflare: `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com` (Namecheap → Domain List → each domain → Nameservers → Custom DNS). Once active, promogrind.bet goes live.
- [ ] **Affiliate/referral links** — open each sportsbook app → Refer a Friend → copy your personal referral link → paste into `referralLink` field in `src/books.js` for DraftKings, FanDuel, BetMGM, Caesars, bet365, ESPN BET, Fanatics, BetRivers.
- [ ] **Stripe smoke test** — make a test purchase (card 4242 4242 4242 4242) and verify `subscriptions` table row is created.

## State at Handoff
- Domain: promogrind.bet purchased + Cloudflare zones created · awaiting Namecheap NS update
- Analytics: Cloudflare Web Analytics (pageviews) + PostHog (behavioral, funnel, user identity) + Sentry (errors + replays) — all three active in production after this deploy
- PostHog: tracks calculator_viewed, $pageview per slug, vault_member_login, first_calc_run, referral_shared · identifies users by id/email/plan/trial on auth
- Sentry: React ErrorBoundary in main.jsx · 10% trace sample · 100% replay on errors · 5% session replay
- AI functions: promo-chat + promo-advisor + ai-action-plan deployed · ANTHROPIC_API_KEY set in Supabase
- Stripe: live mode fully deployed · all 7 price IDs + webhook secret set in Supabase · create-checkout deployed
- GitHub Secrets: 9/9 set — all feature flags + Supabase + PostHog + Sentry
- Supabase also has: RESEND_API_KEY + VAPID keys (email + push functions ready to deploy when needed)
- Build: ✓ passing · Tests: 127/127
