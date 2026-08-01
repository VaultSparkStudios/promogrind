import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { AI_ENTITLEMENTS } from "../_shared/ai-entitlements.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, rateLimitResponse } from "../_shared/http.ts";
import { parseAiJson, PROMO_TYPE_GUARDRAIL, SLUG_GUARDRAIL } from "../_shared/validate.ts";
import { buildGroundedActionPlan, parseActionPlanContext, renderActionPlanContext } from "../_shared/action-plan-contract.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const ACTION_PLAN_SYSTEM = `You rank evidence-bound PromoGrind workflow steps. Always respond with valid JSON only. Never invent a sportsbook, offer, eligibility fact, value, payout, terms, odds, or live availability. Use only evidenceRef values supplied by the user context. An observation proves only that the operator recently saw a pattern; it does not prove current terms. Return exactly 3 ranked items with this schema: { "actions": [{ "evidenceRef": string, "actionMode": "verify_terms"|"calculate_value"|"queue_review", "priority": "high"|"medium"|"low", "calculatorSlug": string|null, "opportunityScore": number }] }

${SLUG_GUARDRAIL}
${PROMO_TYPE_GUARDRAIL}`;

serve(async (req) => {
  const CORS = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const burst = inMemoryRateLimit(clientKey(req, "ai_action_plan"), 2, 30_000);
    if (!burst.allowed) return rateLimitResponse(req, burst.retryAfterMs / 1000, CORS);

    const access = await requireAiAccess(req, {
      ...AI_ENTITLEMENTS.aiActionPlan,
      corsHeaders: CORS,
    });
    if (access.error) return access.error;

    const durableLimit = await enforceRateLimit({
      req,
      supabase: access.supabase,
      userId: access.user.id,
      feature: "ai_action_plan",
      limit: 2,
      windowSeconds: 3600,
      corsHeaders: CORS,
    });
    if (durableLimit) return durableLimit;

    const context = parseActionPlanContext(await req.json());
    const userPrompt = `Rank three verification workflow steps using only cited evidence references.\n\nEvidence context:\n${renderActionPlanContext(context)}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: [{ type: "text", text: ACTION_PLAN_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${err}`);
    }

    const claude = await response.json();
    const raw = claude.content?.[0]?.text ?? "{}";

    const plan = parseAiJson(raw);

    await recordAiUsage(access.supabase, access.user.id, "ai_action_plan", {
      tier: access.tier,
      observationCount: context.observations.length,
      profileIncluded: Boolean(context.profileConsent && context.profile),
    });

    const normalizedPlan = buildGroundedActionPlan(plan as Record<string, unknown>, context);

    return new Response(JSON.stringify({
      ...normalizedPlan,
      usage: claude.usage || null,
      remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1),
    }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
