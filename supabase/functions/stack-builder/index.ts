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
import { parseAiJson, SLUG_GUARDRAIL, validateCalculatorSlug } from "../_shared/validate.ts";

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

Goal: ${goal}

${SLUG_GUARDRAIL}`;

    const userPrompt = `My bankroll is $${bankroll}. Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "summary": "one-sentence overview of the plan",
  "estimatedTotal": <number — total guaranteed extraction in dollars>,
  "steps": [
    { "order": 1, "book": "BookName", "promoType": "bonus_bet", "value": <number>, "action": "one-sentence action", "calculatorSlug": "bonus-bet|profit-boost|first-bet|null", "hedgeRequired": true|false }
  ],
  "assumptions": ["assumption 1", "assumption 2"]
}
Steps should be in execution order (welcome bonuses first, then recurring). Be specific with dollar amounts.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${err}`);
    }

    const claudeData = await response.json();
    const raw = claudeData.content?.[0]?.text ?? "{}";
    const plan = parseAiJson(raw);

    const normalizedSteps = Array.isArray(plan.steps)
      ? (plan.steps as Record<string, unknown>[]).map((s) => ({
          order: Number(s.order) || 1,
          book: String(s.book || "").trim(),
          promoType: String(s.promoType || "other"),
          value: Number(s.value) || 0,
          action: String(s.action || "").trim(),
          calculatorSlug: validateCalculatorSlug(s.calculatorSlug),
          hedgeRequired: !!s.hedgeRequired,
        }))
      : [];

    const estimatedTotal = Number.isFinite(Number(plan.estimatedTotal))
      ? Number(plan.estimatedTotal)
      : null;

    await recordAiUsage(access.supabase, access.user.id, "stack_builder", {
      tier: access.tier,
      bankroll,
      booksAvailable: booksAvailable.slice(0, 12),
      promoCount: eligible.length,
    });

    return new Response(
      JSON.stringify({
        summary: String(plan.summary || "Optimal promo stack generated.").trim(),
        steps: normalizedSteps,
        assumptions: Array.isArray(plan.assumptions)
          ? (plan.assumptions as unknown[]).map((a) => String(a || "").trim()).filter(Boolean).slice(0, 3)
          : [],
        bankroll,
        estimatedTotal,
        booksUsed: [...new Set(normalizedSteps.map((s) => s.book))].filter(Boolean).slice(0, 5),
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
