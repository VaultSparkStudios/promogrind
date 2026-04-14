# Current State

Public-safe summary:
- this repo remains deployable — build passing, 127/127 tests green
- version: 23.7.0 · last session: S39 (2026-04-13)
- domain: promogrind.bet LIVE on Cloudflare (NS switch confirmed via DNS lookup)
- **Home tab suite (S39)**: 5 new Home tabs added — Daily Brief, Get Started, What's New, Pricing, About; all accessible from the Home group in the nav
- **Global text size increase (S39)**: all menu/nav text, labels, inputs, notes, help text, and RR rows bumped 1–2px for readability; affects shared.js, ui.jsx, and App.jsx nav
- **Beta invite code system**: `beta_codes` Supabase table + `redeem-beta-code` edge function deployed; 10 PGBETA-XXXX codes seeded (Runner tier, 30d, single-use); UserMenu "Have a beta invite code?" section added for Free Agent tier users
- **RESEND_API_KEY**: CONFIRMED SET in Supabase secrets — onboarding-drip + weekly-digest are active
- **Stripe Customer Portal**: config `bpc_1TLsRNGMN60PfJYsM0S0ByAh` active, pinned in customer-portal edge function; cancel + payment method update enabled; return_url: promogrind.bet/
- **All Supabase secrets confirmed set**: ANTHROPIC_API_KEY, RESEND_API_KEY, STRIPE_SECRET_KEY, STRIPE_TEST_MODE=false, all 7 price IDs, STRIPE_WEBHOOK_SECRET, VAPID keys (public/private/subject), DIGEST secrets, NEWSLETTER_SECRET, SUPABASE keys
- UserMenu: auth widget — 12 sports/betting emoji avatar picker, editable display name, tier badge, animated dropdown; Manage billing calls customer-portal edge function; beta code entry for Free Agent tier
- header: sticky + backdrop-blur, responsive, auth always visible top-right; mobile strip layout
- tab bar: sticky, 44px touch targets, iOS momentum scroll, tap-delay suppression
- Promo Advisor: guest sign-in gate active, auth headers explicit on edge function calls
- branding: all "Free Vault Membership" replaced with "Free PromoGrind Account" / "free account"
- independent PromoGrind pricing live: Free Agent → Scout → Runner → Closer → The House
- Stripe live mode active: checkout + webhook + customer-portal all deployed · live price IDs set in Supabase
- PromoChat gated to Scout+ · promo-chat + promo-advisor + ai-action-plan edge functions deployed · ANTHROPIC_API_KEY live
- analytics: Cloudflare Web Analytics + PostHog + Sentry — full stack live
- all GitHub Secrets set (9/9): Supabase, feature flags, PostHog, Sentry DSN
- WCAG AA contrast compliance: both dark and light themes pass 4.5:1 for all body/label text
- sitemap.xml: 145 URLs — /about/ and /compliance/ included
- wins_wall: Supabase table does not yet exist — component degrades silently to localStorage, no UX impact
- detailed internal state now lives in the private Studio OS / ops repository
