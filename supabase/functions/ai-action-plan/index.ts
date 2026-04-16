import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, rateLimitResponse } from "../_shared/http.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

function normalizeAction(action: Record<string, unknown> = {}) {
  const confidence = ["high", "medium", "low"].includes(String(action.confidence || "").toLowerCase())
    ? String(action.confidence).toLowerCase()
    : "medium";
  const promoType = ["bonus_bet", "profit_boost", "safety_net", "deposit_match", "insurance", "parlay", "arb", "other"].includes(String(action.promoType || "").toLowerCase())
    ? String(action.promoType).toLowerCase()
    : "other";
  const calculatorSlug = ["bonus-bet", "profit-boost", "first-bet", "deposit-match", "insurance", "parlay", "arb-2way", "ev", "hedge"].includes(String(action.calculatorSlug || ""))
    ? String(action.calculatorSlug)
    : null;
  const parsedScore = Number.parseInt(String(action.opportunityScore ?? ""), 10);
  return {
    title: String(action.title || "Action").trim(),
    why: String(action.why || "").trim(),
    value: action.value ? String(action.value).trim() : null,
    priority: String(action.priority || "medium").trim().toLowerCase(),
    calculatorSlug,
    bookTarget: action.bookTarget ? String(action.bookTarget).trim() : null,
    opsTags: Array.isArray(action.opsTags) ? action.opsTags.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean).slice(0, 4) : [],
    promoType,
    confidence,
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
      feature: "ai_action_plan",
      minTier: "runner",
      dailyLimits: { runner: 1, closer: 1, house: 3 },
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
    const { bankroll = "1000", booksComplete = 0, recentProfit = "0", ledgerCount = 0 } = body;

    const bankrollNum = parseFloat(bankroll) || 1000;
    const tier = bankrollNum < 1000 ? "under $1,000 (focus on welcome promos)" :
                 bankrollNum < 3000 ? "$1,000–$3,000 (recurring promos + small arbs)" :
                 "over $3,000 (live scanner + multi-book stacking)";

    const prompt = `You are PromoGrind's AI assistant. Generate a personalized weekly action plan for a sports betting promo hunter.

User context:
- Bankroll: $${bankroll} (tier: ${tier})
- Sportsbooks completed: ${booksComplete}
- Recent P/L (last 10 tracked entries): $${recentProfit}
- Total entries logged: ${ledgerCount}

Generate exactly 3 specific, actionable items appropriate for their bankroll tier. Reference real sportsbook promotion types (deposit match, bonus bet, profit boost, reload, SGP insurance, etc.).

Respond with JSON only — no markdown, no explanation outside the JSON:
{
  "summary": "One sentence overview of their week's best opportunity.",
  "actions": [
    { "title": "Specific action title", "why": "1-2 sentence explanation of why this is the right move for them right now", "value": "Est. $X–$Y", "priority": "high", "calculatorSlug": "bonus-bet", "bookTarget": "DraftKings", "opsTags": ["welcome_offer", "fast_cash"], "promoType": "bonus_bet", "confidence": "high", "opportunityScore": 86, "nextStep": "Open the bonus bet converter." },
    { "title": "Specific action title", "why": "1-2 sentence explanation", "value": "Est. $X–$Y", "priority": "medium", "calculatorSlug": "profit-boost", "bookTarget": "FanDuel", "opsTags": ["reload", "watch"], "promoType": "profit_boost", "confidence": "medium", "opportunityScore": 73, "nextStep": "Check the current odds before the boost expires." },
    { "title": "Specific action title", "why": "1-2 sentence explanation", "value": "Est. $X", "priority": "medium", "calculatorSlug": "hedge", "bookTarget": "Caesars", "opsTags": ["cleanup"], "promoType": "arb", "confidence": "medium", "opportunityScore": 65, "nextStep": "Settle yesterday's workflow before adding more exposure." }
  ]
}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${err}`);
    }

    const claude = await response.json();
    const raw = claude.content?.[0]?.text ?? "{}";

    let plan;
    try {
      plan = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      plan = match ? JSON.parse(match[0]) : { summary: "Unable to parse plan.", actions: [] };
    }

    await recordAiUsage(access.supabase, access.user.id, "ai_action_plan", {
      tier: access.tier,
      bankroll: String(bankroll).slice(0, 24),
      ledgerCount,
    });

    const normalizedPlan = {
      summary: String(plan?.summary || "Weekly plan generated.").trim(),
      actions: Array.isArray(plan?.actions) ? plan.actions.map((action: Record<string, unknown>) => normalizeAction(action)) : [],
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
