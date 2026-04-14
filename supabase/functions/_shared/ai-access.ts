import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export type Tier = "free" | "scout" | "runner" | "closer" | "house";

type AccessOptions = {
  feature: string;
  minTier: Tier;
  dailyLimits: Partial<Record<Tier, number>>;
  corsHeaders?: HeadersInit;
};

const TIER_RANK: Record<Tier, number> = {
  free: 0,
  scout: 1,
  runner: 2,
  closer: 3,
  house: 4,
};

const PLAN_TIER: Record<string, Tier> = {
  scout: "scout",
  grinder: "scout",
  concierge: "scout",
  runner: "runner",
  pro: "runner",
  sharp: "runner",
  closer: "closer",
  vault_sparked: "closer",
  house: "house",
  agency: "house",
};

export function jsonResponse(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export function createServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
}

function trialActive(user: { user_metadata?: Record<string, unknown> }) {
  const trialStart = user.user_metadata?.trial_start;
  if (!trialStart || typeof trialStart !== "string") return false;
  const trialEnd = new Date(trialStart).getTime() + 7 * 24 * 60 * 60 * 1000;
  return Date.now() < trialEnd;
}

function periodActive(periodEnd?: string | null) {
  return !periodEnd || new Date(periodEnd).getTime() > Date.now();
}

function planToTier(plan?: string | null): Tier {
  if (!plan) return "free";
  return PLAN_TIER[plan] ?? "free";
}

export async function requireAiAccess(req: Request, options: AccessOptions) {
  const supabase = createServiceClient();
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401, options.corsHeaders), supabase };
  }

  const jwt = authHeader.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabase.auth.getUser(jwt);
  if (authErr || !user) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401, options.corsHeaders), supabase };
  }

  let tier: Tier = "free";
  const isTrial = trialActive(user);
  if (isTrial) {
    tier = "closer";
  } else {
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subErr) {
      console.error(`[${options.feature}] subscription lookup failed:`, subErr.message);
      return { error: jsonResponse({ error: "Could not verify subscription" }, 500, options.corsHeaders), supabase };
    }

    if (sub?.status === "active" && periodActive(sub.current_period_end)) {
      tier = planToTier(sub.plan);
    }
  }

  if (TIER_RANK[tier] < TIER_RANK[options.minTier]) {
    return {
      error: jsonResponse({
        error: `${options.minTier} tier required`,
        required_tier: options.minTier,
        current_tier: tier,
      }, 403, options.corsHeaders),
      supabase,
    };
  }

  const limit = options.dailyLimits[tier] ?? options.dailyLimits.free ?? 0;
  if (Number.isFinite(limit)) {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error: countErr } = await supabase
      .from("vault_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", options.feature)
      .gte("created_at", `${today}T00:00:00Z`);

    if (countErr) {
      console.error(`[${options.feature}] quota lookup failed:`, countErr.message);
      return { error: jsonResponse({ error: "Could not verify usage quota" }, 500, options.corsHeaders), supabase };
    }

    const used = count ?? 0;
    if (used >= limit) {
      return {
        error: jsonResponse({
          error: "Daily limit reached",
          limit,
          remaining: 0,
          tier,
        }, 429, options.corsHeaders),
        supabase,
      };
    }

    return { supabase, user, tier, limit, used, remaining: Math.max(0, limit - used) };
  }

  return { supabase, user, tier, limit: null, used: null, remaining: null };
}

export async function recordAiUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  feature: string,
  metadata: Record<string, unknown> = {},
) {
  const { error } = await supabase.from("vault_events").insert({
    user_id: userId,
    event_type: feature,
    points: 0,
    metadata,
  });
  if (error) console.error(`[${feature}] usage insert failed:`, error.message);
}
