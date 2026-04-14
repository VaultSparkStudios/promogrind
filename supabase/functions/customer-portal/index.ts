import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, json } from "../_shared/http.ts";

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

// Stripe Customer Portal configuration — created 2026-04-13
// Features: payment_method_update, subscription_cancel (at_period_end), invoice_history
const PORTAL_CONFIGURATION_ID = "bpc_1TLsRNGMN60PfJYsM0S0ByAh";

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

    // Look up the Stripe customer ID from the subscriptions table
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("subscriptions lookup error:", subErr);
      return json(req, { error: "Failed to look up subscription" }, 500);
    }

    if (!sub?.stripe_customer_id) {
      return json(req, { error: "No billing record found. Complete a purchase first." }, 404);
    }

    if (!STRIPE_SECRET || !STRIPE_SECRET.startsWith("sk_")) {
      return json(req, { error: "Stripe not configured on this server" }, 503);
    }

    // Create a Stripe Customer Portal session
    const portalRes = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: sub.stripe_customer_id,
        configuration: PORTAL_CONFIGURATION_ID,
        return_url: "https://promogrind.bet/",
      }),
    });

    const portal = await portalRes.json();
    if (!portalRes.ok) {
      console.error("Stripe portal error:", portal);
      return json(req, { error: portal.error?.message ?? "Stripe portal error" }, 500);
    }

    return json(req, { portal_url: portal.url });

  } catch (err) {
    console.error("customer-portal error:", err);
    return json(req, { error: "Internal server error" }, 500);
  }
});
