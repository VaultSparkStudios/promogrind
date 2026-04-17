/**
 * Shared AI response validation for PromoGrind edge functions.
 * Centralizes slug/type whitelists and normalizes AI output fields.
 */

export const VALID_CALCULATOR_SLUGS = [
  "bonus-bet",
  "profit-boost",
  "first-bet",
  "deposit-match",
  "insurance",
  "parlay",
  "arb-2way",
  "arb-3way",
  "no-vig",
  "ev",
  "kelly",
  "hedge",
  "teaser",
  "sgp",
  "hold",
] as const;

export type CalculatorSlug = typeof VALID_CALCULATOR_SLUGS[number];

export const VALID_PROMO_TYPES = [
  "bonus_bet",
  "profit_boost",
  "safety_net",
  "deposit_match",
  "insurance",
  "parlay",
  "arb",
  "other",
] as const;

export type PromoType = typeof VALID_PROMO_TYPES[number];

/** One-line slug list for system prompt injection. */
export const SLUG_GUARDRAIL = `Valid calculatorSlug values (use null if none match): ${VALID_CALCULATOR_SLUGS.join(" | ")}`;

/** One-line promo type list for system prompt injection. */
export const PROMO_TYPE_GUARDRAIL = `Valid promoType values: ${VALID_PROMO_TYPES.join(" | ")}`;

export function validateCalculatorSlug(raw: unknown): CalculatorSlug | null {
  const s = String(raw || "").toLowerCase().trim();
  return (VALID_CALCULATOR_SLUGS as readonly string[]).includes(s) ? (s as CalculatorSlug) : null;
}

export function validatePromoType(raw: unknown): PromoType {
  const s = String(raw || "").toLowerCase().trim();
  return (VALID_PROMO_TYPES as readonly string[]).includes(s) ? (s as PromoType) : "other";
}

export function validateConfidence(raw: unknown): "high" | "medium" | "low" {
  const s = String(raw || "").toLowerCase();
  return (["high", "medium", "low"] as const).includes(s as "high" | "medium" | "low")
    ? (s as "high" | "medium" | "low")
    : "medium";
}

export function validateRating(raw: unknown): "excellent" | "good" | "fair" | "poor" {
  const s = String(raw || "").toLowerCase();
  return (["excellent", "good", "fair", "poor"] as const).includes(s as "excellent" | "good" | "fair" | "poor")
    ? (s as "excellent" | "good" | "fair" | "poor")
    : "fair";
}

/** Strip tags, cap length, return clean text. */
export function sanitizeInput(text: unknown, maxLength = 2000): string {
  return String(text || "").replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}

/** Parse Claude JSON output tolerantly — strips markdown fences, extracts first {...}. */
export function parseAiJson(raw: string): Record<string, unknown> {
  const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return {};
  }
}
