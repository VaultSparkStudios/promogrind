import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { getCorsHeaders, json } from "../_shared/http.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are a sports betting promo analyst for PromoGrind. A user will paste sportsbook promotion text or T&Cs. Analyze it and return ONLY a valid JSON object (no markdown, no code blocks) with these exact fields:
- "verdict": short punchy rating string (e.g., "Excellent Value", "Good Deal", "Mediocre Offer", "Skip This One")
- "rating": one of "excellent" | "good" | "fair" | "poor"
- "explanation": 2-3 plain English sentences — is it worth claiming, key conditions, conversion strategy
- "ev": estimated expected value as a percentage or dollar range (e.g., "+68% EV", "$80-130 cash equivalent", "~$140 guaranteed")
- "action": recommended action in 1 sentence (e.g., "Claim and hedge immediately on FanDuel at -140 or better")
- "hedge": brief hedge strategy if applicable (e.g., "Bet opposite at -150 to lock $82"), or null if not applicable

Be concise and actionable. Focus on the real cash value after optimal hedging.`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { promoText } = await req.json();

    if (!promoText || typeof promoText !== "string" || promoText.trim().length < 10) {
      return json(req, { error: "promoText must be at least 10 characters" }, 400);
    }

    if (!ANTHROPIC_API_KEY) {
      return json(req, { error: "AI service not configured" }, 503);
    }

    const access = await requireAiAccess(req, {
      feature: "promo_advisor",
      minTier: "free",
      dailyLimits: { free: 3, scout: 10, runner: Infinity, closer: Infinity, house: Infinity },
      corsHeaders,
    });
    if (access.error) return access.error;

    const sanitizedPromoText = promoText.replace(/<[^>]*>/g, "").trim().slice(0, 2000);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        system: SYSTEM_PROMPT,
        messages: [
          { role: "user", content: `Analyze this sportsbook promo:\n\n${sanitizedPromoText}` },
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
      parsed = {
        verdict: "Analysis Complete",
        rating: "fair",
        explanation: content,
        ev: null,
        action: null,
        hedge: null,
      };
    }

    await recordAiUsage(access.supabase, access.user.id, "promo_advisor", {
      chars: sanitizedPromoText.length,
      tier: access.tier,
    });

    return json(req, { ...parsed, remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1) });
  } catch (err) {
    console.error("promo-advisor error:", err);
    return json(req, { error: "Internal error" }, 500);
  }
});
