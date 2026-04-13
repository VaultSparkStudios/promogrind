# Current State

Public-safe summary:
- this repo remains deployable — build passing, 127/127 tests green
- version: 23.5.0 · last session: S35 (2026-04-13)
- domain: promogrind.bet purchased · Cloudflare zones created · awaiting Namecheap NS update to go live
- independent PromoGrind pricing live: Free Agent → Scout → Runner → Closer → The House
- Stripe live mode active: checkout + webhook both deployed · live price IDs set in Supabase
- PromoChat gated to Scout+ · promo-chat + promo-advisor + ai-action-plan edge functions deployed · ANTHROPIC_API_KEY live
- analytics: Cloudflare Web Analytics (pageviews) + PostHog (behavioral, user identity, funnel) + Sentry (error monitoring) — full stack live in next deploy
- all GitHub Secrets set (9/9): Supabase, feature flags, PostHog, Sentry DSN
- detailed internal state now lives in the private Studio OS / ops repository
