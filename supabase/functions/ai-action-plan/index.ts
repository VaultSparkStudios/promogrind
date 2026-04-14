import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: "AI service not configured" }), {
        status: 503,
        headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const access = await requireAiAccess(req, {
      feature: "ai_action_plan",
      minTier: "runner",
      dailyLimits: { runner: 1, closer: 1, house: 3 },
      corsHeaders: CORS,
    });
    if (access.error) return access.error;

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
    { "title": "Specific action title", "why": "1-2 sentence explanation of why this is the right move for them right now", "value": "Est. $X–$Y" },
    { "title": "Specific action title", "why": "1-2 sentence explanation", "value": "Est. $X–$Y" },
    { "title": "Specific action title", "why": "1-2 sentence explanation", "value": "Est. $X" }
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

    return new Response(JSON.stringify({ ...plan, remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1) }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
