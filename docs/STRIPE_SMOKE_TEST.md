# Stripe Smoke Test

Use this after live/test Stripe secrets and price IDs are set for the deployed Supabase functions.

## Automated Preflight Completed (2026-04-15)

- `create-checkout` deployed and returns HTTP `200` plus a live checkout URL for an authenticated test user.
- `customer-portal` deployed and returns the expected `404 No billing record found. Complete a purchase first.` for a brand-new user with no subscription yet.
- Auth-backed edge invocation compatibility was fixed by deploying browser-invoked functions with `verify_jwt = false` in `supabase/config.toml`.

This means the remaining Stripe smoke work is the real payment + webhook + portal lifecycle, not basic function reachability.

## Preconditions

- `create-checkout`, `stripe-webhook`, and `customer-portal` are deployed.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, all live price IDs, and `STRIPE_TEST_MODE=false` are set in Supabase secrets.
- `VITE_PG_FEATURE_PAID_CHECKOUT=true` is set only for the environment being tested.

## Test Flow

1. Sign in with a test PromoGrind account.
2. Open Pricing and start checkout for `Scout monthly`.
3. Pay with Stripe test card `4242 4242 4242 4242` in test mode, or a real low-risk live transaction in live mode.
4. Confirm redirect returns to `https://promogrind.bet/?checkout=success`.
5. In Supabase, verify `subscriptions` has:
   - `user_id` for the test account
   - `plan = scout`
   - `status = active`
   - `stripe_customer_id`
   - `stripe_subscription_id`
   - `current_period_end`
6. Open User Menu -> Manage billing.
7. Confirm Stripe Customer Portal opens for the same customer.
8. Cancel or update payment method in the portal.
9. Confirm webhook updates the `subscriptions` row.

## What Still Requires A Human

- Completing one real checkout in Stripe Checkout
- Confirming the `subscriptions` row after webhook processing
- Opening Customer Portal from the app after purchase
- Confirming cancel/update actions flow back into Supabase

Without a real browser checkout and payment step, the smoke test is not complete.

## Pass Criteria

- Checkout URL is created.
- Webhook writes the subscription row.
- Entitlement appears in the app after refresh.
- Customer Portal opens without manual support.
- Cancel/update events change Supabase state through webhook events.

## After It Passes

Record the proof in the canonical surface:

```bash
node scripts/update-launch-proof.mjs --proof stripeSmoke --status complete --evidence "Completed live checkout, webhook, and portal lifecycle on YYYY-MM-DD."
```
