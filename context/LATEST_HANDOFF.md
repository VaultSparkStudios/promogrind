# Latest Handoff

This repo now keeps only a public-safe handoff summary. Detailed handoff history is maintained privately.

## Where We Left Off (Session 38 — full closeout)

### Shipped this session (1 commit)

**feat(s38): Stripe Customer Portal edge function, manageBilling(), RESEND URL migration**

#### Stripe Customer Portal
- New `supabase/functions/customer-portal/index.ts` — auth via JWT, looks up `stripe_customer_id` from `subscriptions` table, calls `POST /v1/billing_portal/sessions`, returns `{ portal_url }`
  - Proper error responses: 401 (no auth), 404 (no billing record), 503 (Stripe not configured), 500 (Stripe API error)
  - return_url: `https://promogrind.bet/`
- New `manageBilling()` in `src/auth.js` — calls customer-portal edge function with auth header, redirects to portal_url; dispatches `pg:billing-unavailable` CustomEvent if no subscription found (free-tier user)
- `UserMenu.jsx` — "Manage billing on VaultSpark →" static link → `<button>` calling `manageBilling()`; closes dropdown first

#### RESEND email migrations
- `supabase/functions/onboarding-drip/index.ts` — all 11 ctaUrls updated from `vaultsparkstudios.com/promogrind/#/` → `promogrind.bet/` path-based routes
- `supabase/functions/weekly-digest/index.ts` — main CTA button updated to `promogrind.bet/`
- `supabase/functions/create-checkout/index.ts` — success_url + cancel_url updated to `promogrind.bet/`

#### Deployed edge functions
- `customer-portal` — NEW, deployed
- `onboarding-drip` — re-deployed (URL fix)
- `create-checkout` — re-deployed (URL fix)

Build: ✓ passing · Tests: 127/127

## Human Action Required
- [ ] **Set RESEND_API_KEY** in Supabase secrets: `supabase secrets set RESEND_API_KEY=re_...` — required to activate onboarding-drip and weekly-digest email sending
- [ ] **Enable Stripe Customer Portal** in Stripe Dashboard → Billing → Customer Portal → Activate portal (configure cancellation, plan change settings)
- [ ] **Affiliate/referral links** — paste personal referral URLs into `referralLink` fields in `src/books.js`
- [ ] **Stripe smoke test** — card 4242 4242 4242 4242, verify `subscriptions` table row + customer portal redirect works
- [ ] **wins_wall Supabase table** — create the table (component handles 404 silently but table needs to exist for community wins wall)

## State at Handoff
- Customer Portal: edge function deployed, UserMenu "Manage billing →" button wired to call it
- RESEND drip/digest: all URLs point to promogrind.bet — ready to send once RESEND_API_KEY is set
- Build: ✓ passing · Tests: 127/127
