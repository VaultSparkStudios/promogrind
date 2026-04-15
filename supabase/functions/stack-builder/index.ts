/**
 * PromoGrind — Stack Builder Edge Function
 *
 * Given a user's bankroll and available book promos, uses Claude to generate
 * an optimal 3-book promo sequence with guaranteed extraction amounts.
 *
 * POST /functions/v1/stack-builder
 * Body: { bankroll: number, booksAvailable: string[], goal?: string }
 * Auth: Bearer <access_token> (VaultSparked only)
 *
 * Deploy: supabase functions deploy stack-builder
 * Secret: ANTHROPIC_API_KEY
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, rateLimitResponse } from "../_shared/http.ts";

// Current promos by book — update these as promos rotate
const PROMO_DATABASE = [
  { book: "DraftKings",  type: "bonus_bet",     value: 200, roiPct: 72, minBankroll: 300,  detail: "Bet $5 → $200 bonus bets",              recurring: false },
  { book: "DraftKings",  type: "profit_boost",  value: 15,  roiPct: 95, minBankroll: 100,  detail: "25% profit boost up to $15 (daily)",     recurring: true  },
  { book: "FanDuel",     type: "bonus_bet",     value: 300, roiPct: 70, minBankroll: 400,  detail: "Up to $300/day bet reset for 10 days",   recurring: false },
  { book: "FanDuel",     type: "profit_boost",  value: 10,  roiPct: 95, minBankroll: 100,  detail: "20% profit boost up to $10 (daily)",     recurring: true  },
  { book: "BetMGM",      type: "bonus_bet",     value: 1500,roiPct: 68, minBankroll: 2000, detail: "Up to $1,500 first bet safety net",       recurring: false },
  { book: "BetMGM",      type: "deposit_match", value: 100, roiPct: 80, minBankroll: 500,  detail: "25% deposit match up to $100 (weekly)",  recurring: true  },
  { book: "Caesars",     type: "profit_boost",  value: 25,  roiPct: 95, minBankroll: 100,  detail: "100% profit boost token up to $25",       recurring: true  },
  { book: "bet365",      type: "bonus_bet",     value: 365, roiPct: 70, minBankroll: 500,  detail: "Bet $10 → $365 bonus bets",               recurring: false },
  { book: "ESPN BET",    type: "bonus_bet",     value: 200, roiPct: 72, minBankroll: 300,  detail: "Bet $5 → $200 bonus bets",                recurring: false },
  { book: "BetRivers",   type: "bonus_bet",     value: 500, roiPct: 70, minBankroll: 700,  detail: "Up to $500 second chance bet",            recurring: false },
];

serve(async (req) => {
  const CORS = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const burst = inMemoryRateLimit(clientKey(req, "stack_builder"), 2, 30_000);
    if (!burst.allowed) return rateLimitResponse(req, burst.retryAfterMs / 1000, CORS);

    const access = await requireAiAccess(req, {
      feature: "stack_builder",
      minTier: "closer",
      dailyLimits: { closer: 5, house: 20 },
      corsHeaders: CORS,
    });
    if (access.error) return access.error;

    const durableLimit = await enforceRateLimit({
      req,
      supabase: access.supabase,
      userId: access.user.id,
      feature: "stack_builder",
      limit: 3,
      windowSeconds: 600,
      corsHeaders: CORS,
    });
    if (durableLimit) return durableLimit;

    const { bankroll, booksAvailable = [], goal = "maximize guaranteed extraction" } = await req.json();

    if (!bankroll || bankroll < 100) {
      return new Response(JSON.stringify({ error: "Minimum $100 bankroll required" }), {
        status: 400, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 503, headers: { ...CORS, "Content-Type": "application/json" },
      });
    }

    // Filter promos to available books + bankroll constraints
    const eligible = PROMO_DATABASE.filter(p =>
      p.minBankroll <= bankroll &&
      (booksAvailable.length === 0 || booksAvailable.includes(p.book))
    );

    const promoContext = eligible.map(p =>
      `- ${p.book} | ${p.type} | Value: $${p.value} | ROI: ${p.roiPct}% | ${p.detail} | Recurring: ${p.recurring}`
    ).join("\n");

    const systemPrompt = `You are a sports betting promo optimization expert. Given a bankroll and list of available sportsbook promos, you create an optimal extraction sequence to maximize guaranteed profit.

Rules:
- Always recommend hedging (using bonus bets or profit boosts with a hedge on the opposing outcome at another book)
- Prioritize welcome bonuses first (one-time), then recurring daily promos
- Consider bankroll constraints (hedge amounts require real cash)
- Be specific with dollar amounts based on the bankroll provided
- Keep recommendations actionable, not vague
- Tone: confident math, no gambling encouragement, educational framing

Available promos for this user (bankroll: $${bankroll}):
${promoContext}

Goal: ${goal}`;

    const userPrompt = `My bankroll is $${bankroll}. Based on the available promos, give me:
1. My optimal 3-step promo stack for this week
2. Estimated guaranteed extraction for each step
3. Total guaranteed extraction this week
4. Order of operations (what to do first)

Be specific with dollar amounts. Format as a clean structured response.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await response.json();
    const aiText = data.content?.[0]?.text || "Unable to generate plan.";

    // Parse estimated total from AI response (best-effort)
    const totalMatch = aiText.match(/\$(\d[\d,]*)\s*(?:total|guaranteed|weekly)/i);
    const estimatedTotal = totalMatch ? parseInt(totalMatch[1].replace(/,/g, "")) : null;

    await recordAiUsage(access.supabase, access.user.id, "stack_builder", {
      tier: access.tier,
      bankroll,
      booksAvailable: booksAvailable.slice(0, 12),
      promoCount: eligible.length,
    });

    return new Response(
      JSON.stringify({
        plan: aiText,
        bankroll,
        estimatedTotal,
        booksUsed: [...new Set(eligible.map(p => p.book))].slice(0, 5),
        promoCount: eligible.length,
        generatedAt: new Date().toISOString(),
        remaining: access.remaining === null ? null : Math.max(0, access.remaining - 1),
      }),
      { headers: { ...CORS, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
