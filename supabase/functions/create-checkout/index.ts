import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Test mode active until STRIPE_TEST_MODE=false is explicitly set
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const LIVE_MODE = Deno.env.get("STRIPE_TEST_MODE") === "false" && STRIPE_SECRET.startsWith("sk_live_");

// Price IDs — configure via Stripe dashboard then set as env vars
const PRICES: Record<string, Record<string, string>> = {
  test: {
    monthly:  Deno.env.get("STRIPE_TEST_PRICE_MONTHLY")  ?? "price_test_monthly_placeholder",
    annual:   Deno.env.get("STRIPE_TEST_PRICE_ANNUAL")   ?? "price_test_annual_placeholder",
    agency:   Deno.env.get("STRIPE_TEST_PRICE_AGENCY")   ?? "price_test_agency_placeholder",
  },
  live: {
    monthly:  Deno.env.get("STRIPE_LIVE_PRICE_MONTHLY")  ?? "",
    annual:   Deno.env.get("STRIPE_LIVE_PRICE_ANNUAL")   ?? "",
    agency:   Deno.env.get("STRIPE_LIVE_PRICE_AGENCY")   ?? "",
  },
};

const PLAN_AMOUNTS: Record<string, number> = { monthly: 2499, annual: 19900, agency: 19900 };
const VALID_PLANS = ["monthly", "annual", "agency"];

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    }

    const { plan, success_url, cancel_url } = await req.json() as {
      plan: string;
      success_url?: string;
      cancel_url?: string;
    };

    if (!VALID_PLANS.includes(plan)) {
      return new Response(
        JSON.stringify({ error: `Invalid plan. Must be: ${VALID_PLANS.join(", ")}` }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Test mode — simulate checkout without calling Stripe
    if (!LIVE_MODE) {
      return new Response(JSON.stringify({
        test_mode: true,
        message: "Stripe test mode active. Set STRIPE_SECRET_KEY (sk_live_...) and STRIPE_TEST_MODE=false to go live.",
        plan,
        checkout_url: null,
        session: {
          id: `cs_test_${plan}_${Date.now()}`,
          customer_email: user.email,
          amount_total: PLAN_AMOUNTS[plan] ?? 0,
          currency: "usd",
          mode: "subscription",
          status: "simulated",
        },
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Live Stripe checkout session
    const priceId = PRICES.live[plan];
    if (!priceId) {
      return new Response(
        JSON.stringify({ error: "Price ID not configured for plan: " + plan }),
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
        "success_url": success_url ?? "https://vaultsparkstudios.com/promogrind/#/dashboard?checkout=success",
        "cancel_url": cancel_url ?? "https://vaultsparkstudios.com/promogrind/#/pricing?checkout=cancelled",
        "subscription_data[metadata][user_id]": user.id,
        "subscription_data[metadata][plan]": plan,
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
