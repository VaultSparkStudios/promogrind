import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { recordAiUsage, requireAiAccess } from "../_shared/ai-access.ts";
import { AI_ENTITLEMENTS } from "../_shared/ai-entitlements.ts";
import { normalizeAdvisorResult } from "../_shared/advisor-result.ts";
import { ADVISOR_PRIVACY_CONTRACT_VERSION, redactAdvisorInput, sanitizeAdvisorContext } from "../_shared/advisor-privacy.ts";
import { clientKey, enforceRateLimit, getCorsHeaders, inMemoryRateLimit, json, rateLimitResponse } from "../_shared/http.ts";
import { parsePromoTextHeuristic } from "../_shared/promo-parse.ts";
import { parseAiJson, PROMO_TYPE_GUARDRAIL, SLUG_GUARDRAIL } from "../_shared/validate.ts";

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
- "positiveOutcomeProbability": number 0-1 estimating whether realized profit will be greater than zero, or null when the pasted facts do not support that probability
- "probabilityBasis": one short sentence naming the quantitative facts behind positiveOutcomeProbability, or null when the probability is null
- "opsTags": array of 1-4 short machine-friendly tags
- "assumptions": array of 0-3 concrete assumptions used in the verdict
- "missingInputs": array of 0-3 offer facts that were absent and would improve confidence
- "sensitivityTriggers": array of 1-3 specific changes that would materially change the verdict
- "evidenceGrade": one of "complete" | "partial" | "estimate"

Be concise, practical, and product-native. Focus on real cash value after modeled hedging and route the user to the best next PromoGrind calculator when possible. Opportunity score is offer attractiveness, not a probability. Never infer positiveOutcomeProbability from rating, confidence, or opportunityScore; return null unless the offer text and supplied context provide a defensible numeric basis.

${SLUG_GUARDRAIL}
${PROMO_TYPE_GUARDRAIL}`;

function streamRuleEngineResult(req: Request, corsHeaders: HeadersInit, payload: Record<string, unknown>) {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  (async () => {
    await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done", ...payload })}\n\n`));
    await writer.close();
  })();
  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      "x-accel-buffering": "no",
    },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { promoText, userContext, privacyContractVersion, personalizationConsent } = await req.json() as {
      promoText: string;
      userContext?: { bankroll?: number; books?: string[]; hitRate?: number; topPromoType?: string };
      privacyContractVersion?: number;
      personalizationConsent?: boolean;
    };

    if (!promoText || typeof promoText !== "string" || promoText.trim().length < 10) {
      return json(req, { error: "promoText must be at least 10 characters" }, 400);
    }

    const burst = inMemoryRateLimit(clientKey(req, "promo_advisor"), 4, 10_000);
    if (!burst.allowed) return rateLimitResponse(req, burst.retryAfterMs / 1000, corsHeaders);

    const access = await requireAiAccess(req, {
      ...AI_ENTITLEMENTS.promoAdvisor,
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

    if (privacyContractVersion !== ADVISOR_PRIVACY_CONTRACT_VERSION) {
      return json(req, { error: "Unsupported advisor privacy contract" }, 400);
    }

    const privacy = redactAdvisorInput(promoText);
    const sanitizedPromoText = privacy.text;
    const sanitizedUserContext = sanitizeAdvisorContext(userContext, personalizationConsent);
    const privacyReceipt = {
      contractVersion: ADVISOR_PRIVACY_CONTRACT_VERSION,
      redactions: privacy.redactions,
      redactionCount: privacy.total,
      profileIncluded: Boolean(sanitizedUserContext),
      profileFields: sanitizedUserContext ? Object.keys(sanitizedUserContext) : [],
    };
    const heuristic = parsePromoTextHeuristic(sanitizedPromoText);
    const wantsStream = req.headers.get("accept") === "text/event-stream";

    if (heuristic.clearWinner && heuristic.confidence === "high") {
      const result = { ...normalizeAdvisorResult(heuristic.result, String(heuristic.result.explanation || "")), privacyReceipt };
      recordAiUsage(access.supabase, access.user.id, "promo_advisor", {
        chars: sanitizedPromoText.length,
        tier: access.tier,
        analysis_source: "rule_engine",
        estimated_tokens_saved: 650,
        privacy_redactions: privacy.total,
        profile_context_included: Boolean(sanitizedUserContext),
      }).catch(() => {});
      if (wantsStream) {
        return streamRuleEngineResult(req, corsHeaders, {
          result,
          remaining: access.remaining,
        });
      }
      return json(req, {
        ...result,
        remaining: access.remaining,
      });
    }

    if (!ANTHROPIC_API_KEY) {
      return json(req, { error: "AI service not configured" }, 503);
    }

    let contextNote = "";
    if (sanitizedUserContext) {
      const parts: string[] = [];
      if (sanitizedUserContext.bankroll) parts.push(`bankroll $${sanitizedUserContext.bankroll}`);
      if (sanitizedUserContext.books?.length) parts.push(`active books: ${sanitizedUserContext.books.slice(0, 5).join(", ")}`);
      if (sanitizedUserContext.hitRate !== undefined) parts.push(`hit rate ${Math.round(sanitizedUserContext.hitRate * 100)}%`);
      if (sanitizedUserContext.topPromoType) parts.push(`best lane: ${sanitizedUserContext.topPromoType}`);
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
        stream: wantsStream,
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

    const remaining = access.remaining === null ? null : Math.max(0, access.remaining - 1);

    if (wantsStream && anthropicRes.body) {
      const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      (async () => {
        let fullText = "";
        let inputTokens = 0;
        let outputTokens = 0;
        const reader = anthropicRes.body!.getReader();
        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const raw = line.slice(6).trim();
              if (raw === "[DONE]") continue;
              try {
                const evt = JSON.parse(raw);
                if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
                  const text = evt.delta.text ?? "";
                  fullText += text;
                  await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "delta", text })}\n\n`));
                } else if (evt.type === "message_delta" && evt.usage) {
                  outputTokens = evt.usage.output_tokens ?? 0;
                } else if (evt.type === "message_start" && evt.message?.usage) {
                  inputTokens = evt.message.usage.input_tokens ?? 0;
                }
              } catch { /* malformed SSE line */ }
            }
          }
        } finally {
          reader.releaseLock();
        }

        const parsed = parseAiJson(fullText);

        const result = { ...normalizeAdvisorResult(parsed, fullText), privacyReceipt };
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done", result, remaining })}\n\n`));
        await writer.close();

        recordAiUsage(access.supabase, access.user.id, "promo_advisor", {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          tier: access.tier,
          privacy_redactions: privacy.total,
          profile_context_included: Boolean(sanitizedUserContext),
        }).catch(() => {});
      })();

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          "content-type": "text/event-stream",
          "cache-control": "no-cache",
          "x-accel-buffering": "no",
        },
      });
    }

    const anthropicData = await anthropicRes.json();
    const content = anthropicData.content?.[0]?.text ?? "{}";

    const parsed = parseAiJson(content);

    await recordAiUsage(access.supabase, access.user.id, "promo_advisor", {
      chars: sanitizedPromoText.length,
      tier: access.tier,
      analysis_source: "ai",
      input_tokens: anthropicData.usage?.input_tokens ?? 0,
      output_tokens: anthropicData.usage?.output_tokens ?? 0,
      privacy_redactions: privacy.total,
      profile_context_included: Boolean(sanitizedUserContext),
    });

    return json(req, {
      ...normalizeAdvisorResult(parsed, content),
      privacyReceipt,
      remaining,
    });
  } catch (err) {
    console.error("promo-advisor error:", err);
    return json(req, { error: "Internal error" }, 500);
  }
});
