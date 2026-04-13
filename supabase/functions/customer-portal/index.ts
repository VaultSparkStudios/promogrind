import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

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

    // Look up the Stripe customer ID from the subscriptions table
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error("subscriptions lookup error:", subErr);
      return new Response(
        JSON.stringify({ error: "Failed to look up subscription" }),
        { status: 500, headers: corsHeaders },
      );
    }

    if (!sub?.stripe_customer_id) {
      return new Response(
        JSON.stringify({ error: "No billing record found. Complete a purchase first." }),
        { status: 404, headers: corsHeaders },
      );
    }

    if (!STRIPE_SECRET || !STRIPE_SECRET.startsWith("sk_")) {
      return new Response(
        JSON.stringify({ error: "Stripe not configured on this server" }),
        { status: 503, headers: corsHeaders },
      );
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
        return_url: "https://promogrind.bet/",
      }),
    });

    const portal = await portalRes.json();
    if (!portalRes.ok) {
      console.error("Stripe portal error:", portal);
      return new Response(
        JSON.stringify({ error: portal.error?.message ?? "Stripe portal error" }),
        { status: 500, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({ portal_url: portal.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("customer-portal error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
