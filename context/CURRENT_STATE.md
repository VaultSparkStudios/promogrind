# Current State

Public-safe summary:
- this repo remains deployable — build passing, 127/127 tests green
- version: 23.7.0 · last session: S38 (2026-04-13)
- domain: promogrind.bet LIVE on Cloudflare (NS switch confirmed via DNS lookup)
- **Stripe Customer Portal**: `supabase/functions/customer-portal/` deployed — auth JWT → subscriptions lookup → Stripe portal session → returns portal_url; `manageBilling()` in auth.js calls it; UserMenu "Manage billing →" button wired
- **RESEND URL migration**: onboarding-drip (11 URLs), weekly-digest, create-checkout all updated from old vaultsparkstudios.com/promogrind/#/ format to promogrind.bet/ path-based routes
- **RESEND_API_KEY**: NOT YET SET in Supabase secrets — set it to activate onboarding-drip + weekly-digest
- **Stripe Customer Portal config**: must be enabled in Stripe Dashboard before "Manage billing →" button works end-to-end
- UserMenu: auth widget — 12 sports/betting emoji avatar picker, editable display name, tier badge, animated dropdown; Manage billing calls customer-portal edge function
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
