import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: CORS });
    }

    // Check pro/trial status
    const isTrial = user.user_metadata?.trial_start &&
      new Date(user.user_metadata.trial_start).getTime() + 7 * 24 * 60 * 60 * 1000 > Date.now();
    const { data: sub } = await supabase.from("subscriptions")
      .select("plan, status, current_period_end")
      .eq("user_id", user.id)
      .maybeSingle();
    const isPro = isTrial || (sub?.status === "active" && (sub.plan === "pro" || sub.plan === "vault_sparked"));
    if (!isPro) {
      return new Response(JSON.stringify({ error: "VaultSparked required" }), { status: 403, headers: CORS });
    }

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

    return new Response(JSON.stringify(plan), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
