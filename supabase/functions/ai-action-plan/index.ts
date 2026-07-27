import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { AI_ENTITLEMENTS } from "../_shared/ai-entitlements.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, rateLimitResponse } from "../_shared/http.ts";
import { parseAiJson, PROMO_TYPE_GUARDRAIL, SLUG_GUARDRAIL, validateCalculatorSlug, validateConfidence, validatePromoType } from "../_shared/validate.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const ACTION_PLAN_SYSTEM = `You are PromoGrind's AI assistant. Generate personalized weekly action plans for sports betting promo hunters. Always respond with valid JSON only — no markdown, no explanation outside the JSON. Reference real sportsbook promotion types (deposit match, bonus bet, profit boost, reload, SGP insurance, etc.). Return exactly 3 specific, actionable items appropriate for the user's bankroll tier with this schema: { "summary": string, "assumptions": string[], "actions": [{ "title": string, "why": string, "value": string, "priority": "high"|"medium"|"low", "calculatorSlug": string|null, "bookTarget": string|null, "opsTags": string[], "promoType": string, "confidence": "high"|"medium"|"low", "opportunityScore": number, "nextStep": string }] }

${SLUG_GUARDRAIL}
${PROMO_TYPE_GUARDRAIL}`;

function normalizeAction(action: Record<string, unknown> = {}) {
  const parsedScore = Number.parseInt(String(action.opportunityScore ?? ""), 10);
  return {
    title: String(action.title || "Action").trim(),
    why: String(action.why || "").trim(),
    value: action.value ? String(action.value).trim() : null,
    priority: String(action.priority || "medium").trim().toLowerCase(),
    calculatorSlug: validateCalculatorSlug(action.calculatorSlug),
    bookTarget: action.bookTarget ? String(action.bookTarget).trim() : null,
    opsTags: Array.isArray(action.opsTags) ? action.opsTags.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean).slice(0, 4) : [],
    promoType: validatePromoType(action.promoType),
    confidence: validateConfidence(action.confidence),
    nextStep: action.nextStep ? String(action.nextStep).trim() : null,
    opportunityScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 100)) : 60,
  };
}

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

    const body = await req.json();
    const {
      bankroll = "1000",
      booksComplete = 0,
      recentProfit = "0",
      ledgerCount = 0,
      activeBooks = [] as string[],
      topPromoType = null as string | null,
      hitRate = null as number | null,
    } = body;

    const bankrollNum = parseFloat(bankroll) || 1000;
    const tier = bankrollNum < 1000 ? "under $1,000 (focus on welcome promos)" :
                 bankrollNum < 3000 ? "$1,000–$3,000 (recurring promos + small arbs)" :
                 "over $3,000 (live scanner + multi-book stacking)";

    const contextLines: string[] = [
      `- Bankroll: $${bankroll} (tier: ${tier})`,
      `- Sportsbooks completed: ${booksComplete}`,
      `- Recent P/L (last 10 tracked entries): $${recentProfit}`,
      `- Total entries logged: ${ledgerCount}`,
    ];
    if (Array.isArray(activeBooks) && activeBooks.length > 0) {
      contextLines.push(`- Active books: ${activeBooks.slice(0, 6).join(", ")}`);
    }
    if (topPromoType) contextLines.push(`- Strongest promo lane: ${topPromoType}`);
    if (hitRate !== null && hitRate !== undefined) contextLines.push(`- Historical hit rate: ${Math.round(Number(hitRate))}%`);

    const userPrompt = `Generate a personalized weekly action plan.\n\nUser context:\n${contextLines.join("\n")}`;

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
      bankroll: String(bankroll).slice(0, 24),
      ledgerCount,
    });

    const normalizedPlan = {
      summary: String(plan?.summary || "Weekly plan generated.").trim(),
      assumptions: Array.isArray(plan?.assumptions) ? (plan.assumptions as unknown[]).map((a) => String(a || "").trim()).filter(Boolean).slice(0, 3) : [],
      actions: Array.isArray(plan?.actions) ? (plan.actions as Record<string, unknown>[]).map((action) => normalizeAction(action)) : [],
    };

    return new Response(JSON.stringify({ ...normalizedPlan, remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
