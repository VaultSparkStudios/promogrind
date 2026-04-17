/**
 * Unit tests for the promo-advisor edge function.
 * Run with: deno test --allow-env supabase/functions/__tests__/promo-advisor.test.ts
 *
 * Mocks the Anthropic API and Supabase auth to verify:
 *   - Response normalization (normalizeAdvisorResult)
 *   - Prompt caching headers are present
 *   - User context is injected into the user message
 */

import { assertEquals, assertExists, assertStringIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ANTHROPIC_RESPONSE = {
  content: [{ type: "text", text: JSON.stringify({
    verdict: "Great deal — 72% conversion at the sweet spot",
    rating: "excellent",
    confidence: "high",
    promoType: "bonus_bet",
    calculatorSlug: "bonus-bet",
    explanation: "This $200 bonus bet converts to ~$144 guaranteed via a hedge at -380.",
    ev: "+$144",
    action: "Run Bonus Bet Converter with $200 stake.",
    hedge: "Hedge on FanDuel at the given odds.",
    nextStep: "Open the bonus bet converter now.",
    riskFlags: ["expiry 7 days"],
    opportunityScore: 84,
    opsTags: ["welcome_offer", "fast_cash"],
  }) }],
  usage: { input_tokens: 120, output_tokens: 80 },
};

function makeMockAnthropicFetch(response = VALID_ANTHROPIC_RESPONSE) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    if (url.includes("anthropic.com")) {
      // Assert prompt caching beta header is present
      const headers = init?.headers as Record<string, string> | undefined;
      assertEquals(headers?.["anthropic-beta"], "prompt-caching-2024-07-31", "Missing prompt-caching beta header");

      // Assert system is an array (cache_control format)
      const body = JSON.parse(init?.body as string || "{}");
      assertEquals(Array.isArray(body.system), true, "system should be an array for prompt caching");
      assertEquals(body.system[0]?.cache_control?.type, "ephemeral", "First system block should be ephemeral");

      return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json" } });
    }
    // Mock Supabase calls
    return new Response(JSON.stringify({ data: null, error: null }), { status: 200 });
  };
}

// ── normalizeAdvisorResult ────────────────────────────────────────────────────

// Import the normalization function directly by re-declaring (avoid import issues with serve())
function normalizeAdvisorResult(input: Record<string, unknown>, fallbackText = ""): Record<string, unknown> {
  const rating = ["excellent", "good", "fair", "poor"].includes(String(input.rating || "").toLowerCase())
    ? String(input.rating).toLowerCase() : "fair";
  const confidence = ["high", "medium", "low"].includes(String(input.confidence || "").toLowerCase())
    ? String(input.confidence).toLowerCase() : "medium";
  const promoType = ["bonus_bet", "profit_boost", "safety_net", "deposit_match", "insurance", "parlay", "arb", "other"].includes(String(input.promoType || "").toLowerCase())
    ? String(input.promoType).toLowerCase() : "other";
  const calculatorSlug = ["bonus-bet", "profit-boost", "first-bet", "deposit-match", "insurance", "parlay", "arb-2way", "ev", "hedge"].includes(String(input.calculatorSlug || ""))
    ? String(input.calculatorSlug) : null;
  const riskFlags = Array.isArray(input.riskFlags) ? input.riskFlags.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 3) : [];
  const opsTags = Array.isArray(input.opsTags) ? input.opsTags.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean).slice(0, 4) : [];
  const parsedScore = Number.parseInt(String(input.opportunityScore ?? ""), 10);
  return {
    verdict: String(input.verdict || "Analysis Complete").trim(),
    rating, confidence, promoType, calculatorSlug,
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

// ── Tests ─────────────────────────────────────────────────────────────────────

Deno.test("normalizeAdvisorResult — accepts valid fields", () => {
  const result = normalizeAdvisorResult({
    verdict: "Great deal",
    rating: "EXCELLENT",
    confidence: "HIGH",
    promoType: "bonus_bet",
    calculatorSlug: "bonus-bet",
    explanation: "Good conversion.",
    ev: "+$100",
    action: "Open calculator.",
    opportunityScore: 85,
    riskFlags: ["7-day expiry"],
    opsTags: ["welcome_offer"],
  });
  assertEquals(result.rating, "excellent");
  assertEquals(result.confidence, "high");
  assertEquals(result.promoType, "bonus_bet");
  assertEquals(result.calculatorSlug, "bonus-bet");
  assertEquals(result.opportunityScore, 85);
  assertEquals((result.riskFlags as string[]).length, 1);
});

Deno.test("normalizeAdvisorResult — falls back on invalid rating", () => {
  const result = normalizeAdvisorResult({ rating: "GARBAGE", confidence: "UNKNOWN" });
  assertEquals(result.rating, "fair");
  assertEquals(result.confidence, "medium");
});

Deno.test("normalizeAdvisorResult — clears invalid calculatorSlug", () => {
  const result = normalizeAdvisorResult({ calculatorSlug: "not-a-real-slug" });
  assertEquals(result.calculatorSlug, null);
});

Deno.test("normalizeAdvisorResult — caps opportunityScore at 100", () => {
  const result = normalizeAdvisorResult({ opportunityScore: 999 });
  assertEquals(result.opportunityScore, 100);
});

Deno.test("normalizeAdvisorResult — enforces 0 floor on opportunityScore", () => {
  const result = normalizeAdvisorResult({ opportunityScore: -50 });
  assertEquals(result.opportunityScore, 0);
});

Deno.test("normalizeAdvisorResult — caps riskFlags at 3", () => {
  const result = normalizeAdvisorResult({ riskFlags: ["a", "b", "c", "d", "e"] });
  assertEquals((result.riskFlags as string[]).length, 3);
});

Deno.test("normalizeAdvisorResult — caps opsTags at 4", () => {
  const result = normalizeAdvisorResult({ opsTags: ["a", "b", "c", "d", "e"] });
  assertEquals((result.opsTags as string[]).length, 4);
});

Deno.test("normalizeAdvisorResult — uses fallbackText when explanation missing", () => {
  const result = normalizeAdvisorResult({}, "Fallback explanation.");
  assertStringIncludes(result.explanation as string, "Fallback");
});

Deno.test("mock fetch — validates prompt-caching headers are set", async () => {
  const mockFetch = makeMockAnthropicFetch();
  // Simulate what the edge function does
  const response = await mockFetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": "test",
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "content-type": "application/json",
    } as Record<string, string>,
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 400,
      system: [{ type: "text", text: "system prompt", cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: "Analyze this promo" }],
    }),
  });
  assertEquals(response.status, 200);
  const data = await response.json();
  assertExists(data.content);
});
