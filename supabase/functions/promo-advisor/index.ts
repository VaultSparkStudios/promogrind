import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, json, rateLimitResponse } from "../_shared/http.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are a sports betting promo analyst for PromoGrind. A user will paste sportsbook promotion text or T&Cs. Analyze it and return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
- "verdict": short punchy rating string
- "rating": one of "excellent" | "good" | "fair" | "poor"
- "confidence": one of "high" | "medium" | "low"
- "promoType": one of "bonus_bet" | "profit_boost" | "safety_net" | "deposit_match" | "insurance" | "parlay" | "arb" | "other"
- "calculatorSlug": one of "bonus-bet" | "profit-boost" | "first-bet" | "deposit-match" | "insurance" | "parlay" | "arb-2way" | "ev" | "hedge" | null
- "explanation": 2-3 plain English sentences — is it worth claiming, key conditions, conversion strategy
- "ev": estimated expected value as a percentage or dollar range
- "action": recommended action in 1 sentence
- "hedge": brief hedge strategy if applicable, or null
- "nextStep": one short imperative next step
- "riskFlags": array of short risk strings (0-3 items)
- "opportunityScore": integer 0-100
- "opsTags": array of 1-4 short machine-friendly tags

Be concise, practical, and product-native. Focus on real cash value after optimal hedging and route the user to the best next PromoGrind calculator when possible.`;

function normalizeAdvisorResult(input: Record<string, unknown>, fallbackText = "") {
  const rating = ["excellent", "good", "fair", "poor"].includes(String(input.rating || "").toLowerCase())
    ? String(input.rating).toLowerCase()
    : "fair";
  const confidence = ["high", "medium", "low"].includes(String(input.confidence || "").toLowerCase())
    ? String(input.confidence).toLowerCase()
    : "medium";
  const promoType = ["bonus_bet", "profit_boost", "safety_net", "deposit_match", "insurance", "parlay", "arb", "other"].includes(String(input.promoType || "").toLowerCase())
    ? String(input.promoType).toLowerCase()
    : "other";
  const calculatorSlug = ["bonus-bet", "profit-boost", "first-bet", "deposit-match", "insurance", "parlay", "arb-2way", "ev", "hedge"].includes(String(input.calculatorSlug || ""))
    ? String(input.calculatorSlug)
    : null;
  const riskFlags = Array.isArray(input.riskFlags) ? input.riskFlags.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : [];
  const opsTags = Array.isArray(input.opsTags) ? input.opsTags.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean).slice(0, 4) : [];
  const parsedScore = Number.parseInt(String(input.opportunityScore ?? ""), 10);

  return {
    verdict: String(input.verdict || "Analysis Complete").trim(),
    rating,
    confidence,
    promoType,
    calculatorSlug,
    explanation: String(input.explanation || fallbackText || "Analysis complete.").trim(),
    ev: input.ev ?? null,
    action: input.action ? String(input.action).trim() : null,
    hedge: input.hedge ? String(input.hedge).trim() : null,
    nextStep: input.nextStep ? String(input.nextStep).trim() : null,
    riskFlags,
    opportunityScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 100)) : 50,
    opsTags,
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { promoText, userContext } = await req.json() as {
      promoText: string;
      userContext?: { bankroll?: number; books?: string[]; hitRate?: number; topPromoType?: string };
    };

    if (!promoText || typeof promoText !== "string" || promoText.trim().length < 10) {
      return json(req, { error: "promoText must be at least 10 characters" }, 400);
    }

    if (!ANTHROPIC_API_KEY) {
      return json(req, { error: "AI service not configured" }, 503);
    }

    const burst = inMemoryRateLimit(clientKey(req, "promo_advisor"), 4, 10_000);
    if (!burst.allowed) return rateLimitResponse(req, burst.retryAfterMs / 1000, corsHeaders);

    const access = await requireAiAccess(req, {
      feature: "promo_advisor",
      minTier: "free",
      dailyLimits: { free: 3, scout: 10, runner: Infinity, closer: Infinity, house: Infinity },
      corsHeaders,
    });
    if (access.error) return access.error;

    const durableLimit = await enforceRateLimit({
      req,
      supabase: access.supabase,
      userId: access.user.id,
      feature: "promo_advisor",
      limit: 6,
      windowSeconds: 300,
      corsHeaders,
    });
    if (durableLimit) return durableLimit;

    const sanitizedPromoText = promoText.replace(/<[^>]*>/g, "").trim().slice(0, 2000);

    let contextNote = "";
    if (userContext) {
      const parts: string[] = [];
      if (userContext.bankroll) parts.push(`bankroll $${userContext.bankroll}`);
      if (userContext.books?.length) parts.push(`active books: ${userContext.books.slice(0, 5).join(", ")}`);
      if (userContext.hitRate !== undefined) parts.push(`hit rate ${Math.round(userContext.hitRate * 100)}%`);
      if (userContext.topPromoType) parts.push(`best lane: ${userContext.topPromoType}`);
      if (parts.length) contextNote = `\n\nUser profile: ${parts.join(" | ")}`;
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [
          { role: "user", content: `Analyze this sportsbook promo:${contextNote}\n\n${sanitizedPromoText}` },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", errText);
      return json(req, { error: "AI analysis failed" }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const content = anthropicData.content?.[0]?.text ?? "{}";

    let parsed;
    try {
      const cleaned = content.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {};
    }

    await recordAiUsage(access.supabase, access.user.id, "promo_advisor", {
      chars: sanitizedPromoText.length,
      tier: access.tier,
    });

    return json(req, {
      ...normalizeAdvisorResult(parsed, content),
      remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1),
    });
  } catch (err) {
    console.error("promo-advisor error:", err);
    return json(req, { error: "Internal error" }, 500);
  }
});
