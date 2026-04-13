import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";

// Maps billing plan nicknames → stored plan names
const PLAN_NAME_MAP: Record<string, string> = {
  scout_monthly:  "scout",
  scout_annual:   "scout",
  runner_monthly: "runner",
  runner_annual:  "runner",
  closer_monthly: "closer",
  closer_annual:  "closer",
  house:          "house",
  monthly:        "pro",
  annual:         "pro",
  agency:         "agency",
};

/** Minimal Stripe webhook signature verification (HMAC-SHA256) */
async function verifyStripeSignature(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(",").map(p => p.split("=")));
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    const signed = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
    const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
    return computed === signature;
  } catch {
    return false;
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const payload = await req.text();
    const sig = req.headers.get("stripe-signature") ?? "";

    // Verify signature if secret is configured
    if (WEBHOOK_SECRET) {
      const valid = await verifyStripeSignature(payload, sig, WEBHOOK_SECRET);
      if (!valid) {
        console.error("[stripe-webhook] Invalid signature");
        return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
      }
    }

    const event = JSON.parse(payload);
    console.log(`[stripe-webhook] ${event.type} — ${event.id}`);

    // ── checkout.session.completed ─────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.client_reference_id;
      const subscriptionId = session.subscription;

      if (!userId || !subscriptionId) {
        console.warn("[stripe-webhook] Missing user_id or subscription_id in checkout session");
        return new Response("ok", { headers: corsHeaders });
      }

      // Fetch subscription from Stripe to get plan details
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      const sub = await subRes.json();

      const billingPlan = sub.metadata?.billing_plan ?? sub.metadata?.plan ?? "runner_monthly";
      const planName = PLAN_NAME_MAP[billingPlan] ?? billingPlan;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: session.customer ?? null,
          plan: planName,
          billing_plan: billingPlan,
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) console.error("[stripe-webhook] upsert error:", error.message);
      else console.log(`[stripe-webhook] Activated ${planName} for user ${userId}`);
    }

    // ── invoice.paid ───────────────────────────────────────────────────────
    if (event.type === "invoice.paid") {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;
      if (!subscriptionId) return new Response("ok", { headers: corsHeaders });

      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
      const subRes = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
        headers: { "Authorization": `Bearer ${stripeKey}` },
      });
      const sub = await subRes.json();
      const userId = sub.metadata?.user_id;
      if (!userId) return new Response("ok", { headers: corsHeaders });

      const billingPlan = sub.metadata?.billing_plan ?? sub.metadata?.plan ?? "runner_monthly";
      const planName = PLAN_NAME_MAP[billingPlan] ?? billingPlan;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          stripe_subscription_id: subscriptionId,
          stripe_customer_id: sub.customer ?? null,
          plan: planName,
          billing_plan: billingPlan,
          status: "active",
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      if (error) console.error("[stripe-webhook] renewal upsert error:", error.message);
      else console.log(`[stripe-webhook] Renewed ${planName} for user ${userId}`);
    }

    // ── customer.subscription.deleted ─────────────────────────────────────
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (!userId) return new Response("ok", { headers: corsHeaders });

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) console.error("[stripe-webhook] cancel error:", error.message);
      else console.log(`[stripe-webhook] Cancelled subscription for user ${userId}`);
    }

    // ── customer.subscription.updated ─────────────────────────────────────
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (!userId) return new Response("ok", { headers: corsHeaders });

      const billingPlan = sub.metadata?.billing_plan ?? sub.metadata?.plan ?? "";
      const planName = PLAN_NAME_MAP[billingPlan] ?? billingPlan;
      const periodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null;

      const { error } = await supabase
        .from("subscriptions")
        .update({
          plan: planName || undefined,
          billing_plan: billingPlan || undefined,
          status: sub.status === "active" ? "active" : sub.status,
          current_period_end: periodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) console.error("[stripe-webhook] update error:", error.message);
      else console.log(`[stripe-webhook] Updated subscription for user ${userId} → ${planName}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[stripe-webhook] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
