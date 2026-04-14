# Stripe Smoke Test

Use this after live/test Stripe secrets and price IDs are set for the deployed Supabase functions.

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

## Pass Criteria

- Checkout URL is created.
- Webhook writes the subscription row.
- Entitlement appears in the app after refresh.
- Customer Portal opens without manual support.
- Cancel/update events change Supabase state through webhook events.
