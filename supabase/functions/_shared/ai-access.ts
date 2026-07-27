import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveAiQuotaPolicy } from "./ai-policy.ts";

export type Tier = "free" | "scout" | "runner" | "closer" | "house";

export type AccessOptions = {
  feature: string;
  minTier: Tier;
  dailyLimits: Partial<Record<Tier, number>>;
  lifetimeLimits?: Partial<Record<Tier, number>>;
  trialLifetimeLimit?: number;
  corsHeaders?: HeadersInit;
};

export type AiEntitlement = Omit<AccessOptions, "corsHeaders">;

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

  const quota = resolveAiQuotaPolicy({
    tier,
    isTrial,
    dailyLimits: options.dailyLimits,
    lifetimeLimits: options.lifetimeLimits,
    trialLifetimeLimit: options.trialLifetimeLimit,
  });

  if (quota.limit === null) {
    return {
      supabase,
      user,
      tier,
      isTrial,
      limit: null,
      used: null,
      remaining: null,
      quotaWindow: quota.window,
    };
  }

  const { data: claimRows, error: claimErr } = await supabase.rpc("claim_ai_quota", {
    p_user_id: user.id,
    p_feature: options.feature,
    p_window: quota.window,
    p_window_key: quota.windowKey,
    p_limit: quota.limit,
  });
  if (claimErr) {
    console.error(`[${options.feature}] quota claim failed:`, claimErr.message);
    return {
      error: jsonResponse({ error: "Could not reserve AI usage quota" }, 503, options.corsHeaders),
      supabase,
    };
  }

  const claim = Array.isArray(claimRows) ? claimRows[0] : claimRows;
  const allowed = claim?.allowed === true;
  const used = Number.isFinite(Number(claim?.used)) ? Number(claim.used) : quota.limit;
  if (!allowed) {
    return {
      error: jsonResponse({
        error: quota.window === "lifetime" ? "Lifetime AI allowance used" : "Daily AI allowance used",
        limit: quota.limit,
        remaining: 0,
        tier,
        trial: isTrial,
        quota_window: quota.window,
      }, 429, options.corsHeaders),
      supabase,
    };
  }

  return {
    supabase,
    user,
    tier,
    isTrial,
    limit: quota.limit,
    used,
    remaining: Math.max(0, quota.limit - used),
    quotaWindow: quota.window,
  };
}

export async function recordAiUsage(
  supabase: ReturnType<typeof createClient<any>>,
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
