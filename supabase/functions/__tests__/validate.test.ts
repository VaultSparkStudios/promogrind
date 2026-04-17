/**
 * Unit tests for _shared/validate.ts
 * Run with: deno test --allow-env supabase/functions/__tests__/validate.test.ts
 */

import {
  assertEquals,
  assertStrictEquals,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

// Import the module under test using a relative path
import {
  parseAiJson,
  sanitizeInput,
  SLUG_GUARDRAIL,
  VALID_CALCULATOR_SLUGS,
  VALID_PROMO_TYPES,
  validateCalculatorSlug,
  validateConfidence,
  validatePromoType,
  validateRating,
} from "../_shared/validate.ts";

// ── validateCalculatorSlug ─────────────────────────────────────────────────

Deno.test("validateCalculatorSlug returns valid slug unchanged", () => {
  assertStrictEquals(validateCalculatorSlug("bonus-bet"), "bonus-bet");
  assertStrictEquals(validateCalculatorSlug("arb-2way"), "arb-2way");
  assertStrictEquals(validateCalculatorSlug("kelly"), "kelly");
});

Deno.test("validateCalculatorSlug returns null for invalid slug", () => {
  assertStrictEquals(validateCalculatorSlug("made-up-calc"), null);
  assertStrictEquals(validateCalculatorSlug(""), null);
  assertStrictEquals(validateCalculatorSlug(null), null);
  assertStrictEquals(validateCalculatorSlug(undefined), null);
});

Deno.test("validateCalculatorSlug is case-insensitive", () => {
  assertStrictEquals(validateCalculatorSlug("BONUS-BET"), "bonus-bet");
  assertStrictEquals(validateCalculatorSlug("Kelly"), "kelly");
});

Deno.test("VALID_CALCULATOR_SLUGS contains expected entries", () => {
  assertEquals(VALID_CALCULATOR_SLUGS.includes("bonus-bet" as never), true);
  assertEquals(VALID_CALCULATOR_SLUGS.includes("profit-boost" as never), true);
  assertEquals(VALID_CALCULATOR_SLUGS.includes("arb-3way" as never), true);
  assertEquals(VALID_CALCULATOR_SLUGS.length >= 10, true);
});

// ── validatePromoType ──────────────────────────────────────────────────────

Deno.test("validatePromoType returns valid type unchanged", () => {
  assertStrictEquals(validatePromoType("bonus_bet"), "bonus_bet");
  assertStrictEquals(validatePromoType("profit_boost"), "profit_boost");
  assertStrictEquals(validatePromoType("arb"), "arb");
});

Deno.test("validatePromoType returns 'other' for unknown type", () => {
  assertStrictEquals(validatePromoType("mystery_type"), "other");
  assertStrictEquals(validatePromoType(""), "other");
  assertStrictEquals(validatePromoType(null), "other");
});

Deno.test("VALID_PROMO_TYPES contains expected entries", () => {
  assertEquals(VALID_PROMO_TYPES.includes("bonus_bet" as never), true);
  assertEquals(VALID_PROMO_TYPES.includes("other" as never), true);
  assertEquals(VALID_PROMO_TYPES.length >= 6, true);
});

// ── validateRating ─────────────────────────────────────────────────────────

Deno.test("validateRating returns valid rating", () => {
  assertStrictEquals(validateRating("excellent"), "excellent");
  assertStrictEquals(validateRating("poor"), "poor");
  assertStrictEquals(validateRating("GOOD"), "good");
});

Deno.test("validateRating defaults to 'fair' for unknown", () => {
  assertStrictEquals(validateRating("amazing"), "fair");
  assertStrictEquals(validateRating(null), "fair");
});

// ── validateConfidence ─────────────────────────────────────────────────────

Deno.test("validateConfidence returns valid confidence level", () => {
  assertStrictEquals(validateConfidence("high"), "high");
  assertStrictEquals(validateConfidence("LOW"), "low");
});

Deno.test("validateConfidence defaults to 'medium' for unknown", () => {
  assertStrictEquals(validateConfidence("uncertain"), "medium");
  assertStrictEquals(validateConfidence(""), "medium");
});

// ── sanitizeInput ──────────────────────────────────────────────────────────

Deno.test("sanitizeInput strips HTML tags", () => {
  assertStrictEquals(
    sanitizeInput("<b>Bet $200</b> at <em>+300</em>"),
    "Bet $200 at +300"
  );
});

Deno.test("sanitizeInput caps at maxLength", () => {
  const long = "x".repeat(5000);
  assertEquals(sanitizeInput(long, 2000).length, 2000);
});

Deno.test("sanitizeInput handles non-string input", () => {
  assertStrictEquals(sanitizeInput(null), "");
  assertStrictEquals(sanitizeInput(undefined), "");
  assertStrictEquals(sanitizeInput(42), "42");
});

// ── parseAiJson ────────────────────────────────────────────────────────────

Deno.test("parseAiJson parses clean JSON", () => {
  const result = parseAiJson('{"rating":"excellent","score":85}');
  assertEquals(result, { rating: "excellent", score: 85 });
});

Deno.test("parseAiJson strips markdown fences", () => {
  const result = parseAiJson("```json\n{\"key\":\"value\"}\n```");
  assertEquals(result, { key: "value" });
});

Deno.test("parseAiJson extracts first JSON object from mixed text", () => {
  const result = parseAiJson('Here is your analysis: {"verdict":"good","rating":"good"} — done.');
  assertEquals((result as { verdict: string }).verdict, "good");
});

Deno.test("parseAiJson returns empty object for unparseable input", () => {
  const result = parseAiJson("not json at all");
  assertEquals(typeof result, "object");
  assertEquals(Object.keys(result).length, 0);
});

// ── SLUG_GUARDRAIL ─────────────────────────────────────────────────────────

Deno.test("SLUG_GUARDRAIL string contains key calculator names", () => {
  assertEquals(SLUG_GUARDRAIL.includes("bonus-bet"), true);
  assertEquals(SLUG_GUARDRAIL.includes("arb-2way"), true);
  assertEquals(SLUG_GUARDRAIL.includes("kelly"), true);
});
