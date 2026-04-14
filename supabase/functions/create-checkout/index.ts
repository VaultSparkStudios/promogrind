import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, json } from "../_shared/http.ts";

// Live mode requires STRIPE_TEST_MODE=false AND a sk_live_ key
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const LIVE_MODE = Deno.env.get("STRIPE_TEST_MODE") === "false" && STRIPE_SECRET.startsWith("sk_live_");

// ── Price IDs ──────────────────────────────────────────────────────────────────
// Configure via Stripe dashboard, then set as Supabase secrets:
//   supabase secrets set STRIPE_LIVE_PRICE_SCOUT_MONTHLY=price_...
const PRICES: Record<string, Record<string, string>> = {
  test: {
    scout_monthly:   Deno.env.get("STRIPE_TEST_PRICE_SCOUT_MONTHLY")   ?? "price_test_scout_monthly",
    scout_annual:    Deno.env.get("STRIPE_TEST_PRICE_SCOUT_ANNUAL")    ?? "price_test_scout_annual",
    runner_monthly:  Deno.env.get("STRIPE_TEST_PRICE_RUNNER_MONTHLY")  ?? "price_test_runner_monthly",
    runner_annual:   Deno.env.get("STRIPE_TEST_PRICE_RUNNER_ANNUAL")   ?? "price_test_runner_annual",
    closer_monthly:  Deno.env.get("STRIPE_TEST_PRICE_CLOSER_MONTHLY")  ?? "price_test_closer_monthly",
    closer_annual:   Deno.env.get("STRIPE_TEST_PRICE_CLOSER_ANNUAL")   ?? "price_test_closer_annual",
    house:           Deno.env.get("STRIPE_TEST_PRICE_HOUSE")           ?? "price_test_house",
    // legacy — keep for backwards compat
    monthly:         Deno.env.get("STRIPE_TEST_PRICE_MONTHLY")         ?? "price_test_monthly_placeholder",
    annual:          Deno.env.get("STRIPE_TEST_PRICE_ANNUAL")          ?? "price_test_annual_placeholder",
    agency:          Deno.env.get("STRIPE_TEST_PRICE_AGENCY")          ?? "price_test_agency_placeholder",
  },
  live: {
    scout_monthly:   Deno.env.get("STRIPE_LIVE_PRICE_SCOUT_MONTHLY")   ?? "",
    scout_annual:    Deno.env.get("STRIPE_LIVE_PRICE_SCOUT_ANNUAL")    ?? "",
    runner_monthly:  Deno.env.get("STRIPE_LIVE_PRICE_RUNNER_MONTHLY")  ?? "",
    runner_annual:   Deno.env.get("STRIPE_LIVE_PRICE_RUNNER_ANNUAL")   ?? "",
    closer_monthly:  Deno.env.get("STRIPE_LIVE_PRICE_CLOSER_MONTHLY")  ?? "",
    closer_annual:   Deno.env.get("STRIPE_LIVE_PRICE_CLOSER_ANNUAL")   ?? "",
    house:           Deno.env.get("STRIPE_LIVE_PRICE_HOUSE")           ?? "",
    monthly:         Deno.env.get("STRIPE_LIVE_PRICE_MONTHLY")         ?? "",
    annual:          Deno.env.get("STRIPE_LIVE_PRICE_ANNUAL")          ?? "",
    agency:          Deno.env.get("STRIPE_LIVE_PRICE_AGENCY")          ?? "",
  },
};

// Amounts in cents (for test-mode simulation display)
const PLAN_AMOUNTS: Record<string, number> = {
  scout_monthly:  999,    // $9.99/mo
  scout_annual:   7900,   // $79/yr
  runner_monthly: 1999,   // $19.99/mo
  runner_annual:  14900,  // $149/yr
  closer_monthly: 3499,   // $34.99/mo
  closer_annual:  24900,  // $249/yr
  house:          14900,  // $149/mo
  // legacy
  monthly:        2499,
  annual:         19900,
  agency:         19900,
};

// Maps billing plan IDs → subscription plan name stored in metadata
const PLAN_NAME_MAP: Record<string, string> = {
  scout_monthly:  'scout',
  scout_annual:   'scout',
  runner_monthly: 'runner',
  runner_annual:  'runner',
  closer_monthly: 'closer',
  closer_annual:  'closer',
  house:          'house',
  monthly:        'pro',
  annual:         'pro',
  agency:         'agency',
};

const VALID_PLANS = Object.keys(PLAN_AMOUNTS);

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return json(req, { error: "Unauthorized" }, 401);
    }

    const { plan, success_url, cancel_url } = await req.json() as {
      plan: string;
      success_url?: string;
      cancel_url?: string;
    };

    if (!VALID_PLANS.includes(plan)) {
      return json(req, { error: `Invalid plan. Must be one of: ${VALID_PLANS.join(", ")}` }, 400);
    }

    const planName = PLAN_NAME_MAP[plan] ?? plan;

    // Test mode — simulate checkout without calling Stripe
    if (!LIVE_MODE) {
      return json(req, {
        test_mode: true,
        message: "Stripe test mode active. Set STRIPE_SECRET_KEY (sk_live_...) and STRIPE_TEST_MODE=false to go live.",
        plan,
        plan_name: planName,
        checkout_url: null,
        session: {
          id: `cs_test_${plan}_${Date.now()}`,
          customer_email: user.email,
          amount_total: PLAN_AMOUNTS[plan] ?? 0,
          currency: "usd",
          mode: "subscription",
          status: "simulated",
        },
      });
    }

    // Live Stripe checkout session
    const priceId = PRICES.live[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Price ID not configured for plan: ${plan}. Set STRIPE_LIVE_PRICE_${plan.toUpperCase()} in Supabase secrets.` }),
        { status: 500, headers: corsHeaders },
      );
    }

    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_method_types[]": "card",
        "mode": "subscription",
        "customer_email": user.email ?? "",
        "client_reference_id": user.id,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "success_url": success_url ?? "https://promogrind.bet/?checkout=success",
        "cancel_url": cancel_url ?? "https://promogrind.bet/?checkout=cancelled",
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][plan]": planName,
        "subscription_data[metadata][billing_plan]": plan,
      }),
    });

    const session = await stripeRes.json();
    if (!stripeRes.ok) {
      return new Response(
        JSON.stringify({ error: session.error?.message ?? "Stripe error" }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ checkout_url: session.url, session_id: session.id, test_mode: false }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("create-checkout error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
