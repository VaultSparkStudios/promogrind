import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const FREE_DAILY_LIMIT = 10;

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
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AI service not configured — set ANTHROPIC_API_KEY" }),
        { status: 503, headers: corsHeaders },
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let isPro = false;

    if (authHeader) {
      const jwt = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        userId = user.id;
        const { data: sub } = await supabase
          .from("subscriptions")
          .select("plan, status")
          .eq("user_id", user.id)
          .eq("status", "active")
          .maybeSingle();
        isPro = !!sub;
        if (!isPro && user.user_metadata?.trial_start) {
          const trialEnd = new Date(user.user_metadata.trial_start).getTime() + 7 * 24 * 60 * 60 * 1000;
          isPro = Date.now() < trialEnd;
        }
      }
    }

    const { message, history = [], userContext } = await req.json() as {
      message: string;
      history?: Message[];
      userContext?: { bankroll?: number; books?: string[]; recentProfit?: number };
    };

    if (!message?.trim()) {
      return new Response(JSON.stringify({ error: "Message is required" }), { status: 400, headers: corsHeaders });
    }

    // Rate limit free users via vault_events table
    if (!isPro && userId) {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("vault_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "promo_chat")
        .gte("created_at", today + "T00:00:00Z");
      if ((count ?? 0) >= FREE_DAILY_LIMIT) {
        return new Response(JSON.stringify({
          error: "Daily limit reached",
          limit: FREE_DAILY_LIMIT,
          isPro: false,
          upgrade_message: "Upgrade to VaultSparked for unlimited AI chat.",
        }), { status: 429, headers: corsHeaders });
      }
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
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 502, headers: corsHeaders });
    }

    const aiData = await anthropicRes.json();
    const responseText = aiData.content?.[0]?.text ?? "";

    // Log usage event (non-blocking)
    if (userId) {
      supabase.from("vault_events").insert({
        user_id: userId,
        event_type: "promo_chat",
        points: 0,
        metadata: { tokens: aiData.usage?.input_tokens ?? 0 },
      }).then(() => {}).catch((e: Error) => console.error("vault_events insert error:", e));
    }

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

    // Count today's usage for remaining display
    let remaining: number | null = null;
    if (!isPro && userId) {
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await supabase
        .from("vault_events")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("event_type", "promo_chat")
        .gte("created_at", today + "T00:00:00Z");
      remaining = Math.max(0, FREE_DAILY_LIMIT - (count ?? 0));
    }

    return new Response(JSON.stringify({
      response: responseText,
      suggestions: [...new Set(suggestions)].slice(0, 3),
      isPro,
      remaining,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("promo-chat error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), { status: 500, headers: corsHeaders });
  }
});
