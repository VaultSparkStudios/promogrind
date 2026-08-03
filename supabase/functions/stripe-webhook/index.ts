import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { isStripeId, parseStripeEvent, verifyStripeWebhook } from "../_shared/stripe-boundary.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Content-Type": "application/json",
};

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_SECRET = Deno.env.get("STRIPE_SECRET_KEY") ?? "";

const PLAN_NAME_MAP: Record<string, string> = {
  scout_monthly: "scout",
  scout_annual: "scout",
  runner_monthly: "runner",
  runner_annual: "runner",
  closer_monthly: "closer",
  closer_annual: "closer",
  house: "house",
  monthly: "pro",
  annual: "pro",
  agency: "agency",
};

function response(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function userId(value: unknown): string | null {
  return typeof value === "string" && /^[A-Za-z0-9-]{6,128}$/.test(value) ? value : null;
}

function planFrom(subscription: Record<string, unknown>): { billingPlan: string; planName: string } {
  const metadata = subscription.metadata as Record<string, unknown> | undefined;
  const billingPlan = metadata?.billing_plan ?? metadata?.plan;
  if (typeof billingPlan !== "string" || !PLAN_NAME_MAP[billingPlan]) throw new Error("Stripe subscription has no recognized billing plan");
  return { billingPlan, planName: PLAN_NAME_MAP[billingPlan] };
}

function periodEnd(subscription: Record<string, unknown>): string | null {
  const value = Number(subscription.current_period_end);
  return Number.isFinite(value) && value > 0 ? new Date(value * 1000).toISOString() : null;
}

async function fetchSubscription(subscriptionId: unknown): Promise<Record<string, unknown>> {
  if (!isStripeId(subscriptionId, "sub")) throw new Error("Malformed Stripe subscription ID");
  if (!STRIPE_SECRET) throw new Error("Stripe API secret is not configured");
  const result = await fetch(`https://api.stripe.com/v1/subscriptions/${subscriptionId}`, {
    headers: { "Authorization": `Bearer ${STRIPE_SECRET}` },
  });
  const body = await result.json().catch(() => null);
  if (!result.ok || !body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`Stripe subscription lookup failed (${result.status})`);
  }
  return body as Record<string, unknown>;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return response({ error: "Content-Type must be application/json" }, 415);
  }
  if (!WEBHOOK_SECRET) {
    console.error("[stripe-webhook] signature secret missing; refusing ingress");
    return response({ error: "Webhook verification unavailable" }, 503);
  }

  const payload = await req.text();
  const signature = await verifyStripeWebhook({
    payload,
    header: req.headers.get("stripe-signature") ?? "",
    secret: WEBHOOK_SECRET,
  });
  if (!signature.ok) {
    console.error(`[stripe-webhook] rejected signature: ${signature.reason}`);
    return response({ error: "Invalid signature" }, 400);
  }
  const parsed = parseStripeEvent(payload);
  if (!parsed.ok) return response({ error: parsed.error }, 400);
  const event = parsed.event;
  const object = event.data.object;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    console.log(`[stripe-webhook] verified ${event.type} (${event.id})`);

    if (event.type === "checkout.session.completed") {
      const owner = userId(object.client_reference_id);
      const subscriptionId = object.subscription;
      if (!owner || !isStripeId(subscriptionId, "sub")) throw new Error("Checkout session lacks bounded ownership metadata");
      const subscription = await fetchSubscription(subscriptionId);
      const plan = planFrom(subscription);
      const customer = isStripeId(object.customer, "cus") ? object.customer : null;
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: owner,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customer,
        plan: plan.planName,
        billing_plan: plan.billingPlan,
        status: "active",
        current_period_end: periodEnd(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw new Error(`Subscription activation persistence failed: ${error.message}`);
    }

    if (event.type === "invoice.paid") {
      const subscription = await fetchSubscription(object.subscription);
      const metadata = subscription.metadata as Record<string, unknown> | undefined;
      const owner = userId(metadata?.user_id);
      const subscriptionId = subscription.id;
      if (!owner || !isStripeId(subscriptionId, "sub")) throw new Error("Invoice subscription lacks bounded ownership metadata");
      const plan = planFrom(subscription);
      const customer = isStripeId(subscription.customer, "cus") ? subscription.customer : null;
      const { error } = await supabase.from("subscriptions").upsert({
        user_id: owner,
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customer,
        plan: plan.planName,
        billing_plan: plan.billingPlan,
        status: "active",
        current_period_end: periodEnd(subscription),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });
      if (error) throw new Error(`Subscription renewal persistence failed: ${error.message}`);
    }

    if (event.type === "customer.subscription.deleted") {
      const metadata = object.metadata as Record<string, unknown> | undefined;
      const owner = userId(metadata?.user_id);
      if (!owner) throw new Error("Deleted subscription lacks bounded ownership metadata");
      const { error } = await supabase.from("subscriptions").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("user_id", owner);
      if (error) throw new Error(`Subscription cancellation persistence failed: ${error.message}`);
    }

    if (event.type === "customer.subscription.updated") {
      const metadata = object.metadata as Record<string, unknown> | undefined;
      const owner = userId(metadata?.user_id);
      if (!owner) throw new Error("Updated subscription lacks bounded ownership metadata");
      const plan = planFrom(object);
      const rawStatus = typeof object.status === "string" && /^[a-z_]{3,30}$/.test(object.status) ? object.status : "incomplete";
      const { error } = await supabase.from("subscriptions").update({
        plan: plan.planName,
        billing_plan: plan.billingPlan,
        status: rawStatus,
        current_period_end: periodEnd(object),
        updated_at: new Date().toISOString(),
      }).eq("user_id", owner);
      if (error) throw new Error(`Subscription update persistence failed: ${error.message}`);
    }

    return response({ received: true, event_id: event.id, verification: "hmac-sha256+timestamp" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown handler failure";
    console.error(`[stripe-webhook] ${event.id} failed: ${message}`);
    return response({ error: "Webhook processing failed", event_id: event.id }, 500);
  }
});
