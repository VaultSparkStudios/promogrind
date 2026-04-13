import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { code } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code is required" }), { status: 400, headers: corsHeaders });
    }

    // Look up code (case-insensitive)
    const { data: betaCode, error: codeErr } = await supabase
      .from("beta_codes")
      .select("code, tier, duration_days, max_uses, times_used, redeemed_by")
      .eq("code", code.trim().toUpperCase())
      .maybeSingle();

    if (codeErr) {
      console.error("beta_codes lookup error:", codeErr);
      return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
    }

    if (!betaCode) {
      return new Response(JSON.stringify({ error: "Invalid invite code" }), { status: 404, headers: corsHeaders });
    }

    if (betaCode.times_used >= betaCode.max_uses) {
      return new Response(JSON.stringify({ error: "This invite code has already been used" }), { status: 409, headers: corsHeaders });
    }

    // Check if this user already redeemed this code
    if (betaCode.redeemed_by === user.id) {
      return new Response(JSON.stringify({ error: "You have already redeemed this code", already_redeemed: true }), { status: 409, headers: corsHeaders });
    }

    // Calculate expiry
    const expiryMs = Date.now() + betaCode.duration_days * 24 * 60 * 60 * 1000;
    const expiryIso = new Date(expiryMs).toISOString();
    const tier = betaCode.tier; // e.g. 'runner'

    // Upsert subscription — update existing row or insert new one
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingSub) {
      await supabase
        .from("subscriptions")
        .update({
          plan: tier,
          status: "active",
          current_period_end: expiryIso,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({
          user_id: user.id,
          plan: tier,
          status: "active",
          current_period_end: expiryIso,
          stripe_customer_id: null,
          stripe_subscription_id: null,
        });
    }

    // Mark code as redeemed
    await supabase
      .from("beta_codes")
      .update({
        times_used: betaCode.times_used + 1,
        redeemed_by: user.id,
        redeemed_at: new Date().toISOString(),
      })
      .eq("code", betaCode.code);

    return new Response(
      JSON.stringify({
        success: true,
        tier,
        expires_at: expiryIso,
        duration_days: betaCode.duration_days,
        message: `Beta access activated! You now have ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier for ${betaCode.duration_days} days.`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );

  } catch (err) {
    console.error("redeem-beta-code error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
