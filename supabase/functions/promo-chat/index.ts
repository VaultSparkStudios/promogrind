import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { getCorsHeaders, json } from "../_shared/http.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";

const SYSTEM_PROMPT = `You are PromoGrind's AI assistant — an expert in sports betting promo optimization, bonus bet conversion, arbitrage betting, and expected value (EV) strategy.

You help users:
- Convert bonus bets to cash profit using optimal hedging strategy
- Find and evaluate arbitrage opportunities across sportsbooks
- Understand profit boost mechanics and calculate true EV
- Optimize their promo hunter strategy across multiple books
- Navigate sportsbook-specific rules, rollover requirements, and promo terms
- Size bets correctly using Kelly Criterion and bankroll management principles

Keep responses concise and practical (3–6 sentences max). When discussing calculations, explain the math simply and recommend PromoGrind's free calculators for exact numbers.

You do NOT give specific game picks, score predictions, or general gambling advice beyond promo/EV optimization strategy.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ANTHROPIC_API_KEY) {
      return json(req, { error: "AI service not configured — set ANTHROPIC_API_KEY" }, 503);
    }

    const access = await requireAiAccess(req, {
      feature: "promo_chat",
      minTier: "scout",
      dailyLimits: { scout: 20, runner: 50, closer: Infinity, house: Infinity },
      corsHeaders,
    });
    if (access.error) return access.error;

    const { message, history = [], userContext } = await req.json() as {
      message: string;
      history?: Message[];
      userContext?: { bankroll?: number; books?: string[]; recentProfit?: number };
    };

    if (!message?.trim()) {
      return json(req, { error: "Message is required" }, 400);
    }

    // Build context note from user profile
    let contextNote = "";
    if (userContext) {
      const parts: string[] = [];
      if (userContext.bankroll) parts.push(`bankroll: $${userContext.bankroll}`);
      if (userContext.books?.length) parts.push(`active books: ${userContext.books.slice(0, 5).join(", ")}`);
      if (userContext.recentProfit !== undefined) parts.push(`recent 30-day P/L: $${userContext.recentProfit.toFixed(2)}`);
      if (parts.length) contextNote = `\n\nUser context: ${parts.join(" | ")}`;
    }

    const trimmedHistory = history.slice(-10);
    const messages = [
      ...trimmedHistory.map((m: Message) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: SYSTEM_PROMPT + contextNote,
        messages,
      }),
    });

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text();
      console.error("Anthropic error:", err);
      return json(req, { error: "AI service error" }, 502);
    }

    const aiData = await anthropicRes.json();
    const responseText = aiData.content?.[0]?.text ?? "";

    await recordAiUsage(access.supabase, access.user.id, "promo_chat", {
      input_tokens: aiData.usage?.input_tokens ?? 0,
      output_tokens: aiData.usage?.output_tokens ?? 0,
      tier: access.tier,
    });

    // Suggest relevant calculators based on message content
    const combined = (message + responseText).toLowerCase();
    const suggestions: string[] = [];
    if (combined.includes("bonus bet") || combined.includes("free bet")) suggestions.push("bonus-bet");
    if (combined.includes("arbitrage") || (combined.includes("arb") && !combined.includes("carbon"))) suggestions.push("arb-2way");
    if (combined.includes("profit boost") || combined.includes("odds boost")) suggestions.push("profit-boost");
    if (combined.includes("kelly") || combined.includes("bankroll siz")) suggestions.push("kelly");
    if (combined.includes("expected value") || /\bev\b/.test(combined)) suggestions.push("ev");
    if (combined.includes("parlay")) suggestions.push("parlay");
    if (combined.includes("hedge")) suggestions.push("hedge");

    return json(req, {
      message: responseText,
      response: responseText,
      suggestions: [...new Set(suggestions)].slice(0, 3),
      tier: access.tier,
      remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1),
    });

  } catch (err) {
    console.error("promo-chat error:", err);
    return json(req, { error: "Internal server error" }, 500);
  }
});
