import { validateCalculatorSlug, validateConfidence, validatePromoType, validateRating } from "./validate.ts";

function boundedList(value: unknown, limit = 3) {
  return Array.isArray(value)
    ? value.map((item) => String(item || "").trim().slice(0, 180)).filter(Boolean).slice(0, limit)
    : [];
}

export function normalizeAdvisorResult(input: Record<string, unknown>, fallbackText = "") {
  const parsedScore = Number.parseInt(String(input.opportunityScore ?? ""), 10);
  const parsedProbability = Number.parseFloat(String(input.positiveOutcomeProbability ?? ""));
  const probabilityBasis = String(input.probabilityBasis ?? "").trim().slice(0, 240);
  const positiveOutcomeProbability = probabilityBasis && Number.isFinite(parsedProbability) && parsedProbability >= 0 && parsedProbability <= 1
    ? parsedProbability
    : null;
  const missingInputs = boundedList(input.missingInputs);
  const evidenceGrade = ["complete", "partial", "estimate"].includes(String(input.evidenceGrade || "").toLowerCase())
    ? String(input.evidenceGrade).toLowerCase()
    : missingInputs.length ? "partial" : "estimate";
  return {
    receiptVersion: 3,
    verdict: String(input.verdict || "Analysis Complete").trim(),
    rating: validateRating(input.rating),
    confidence: validateConfidence(input.confidence),
    promoType: validatePromoType(input.promoType),
    calculatorSlug: validateCalculatorSlug(input.calculatorSlug),
    explanation: String(input.explanation || fallbackText || "Analysis complete.").trim(),
    ev: input.ev ?? null,
    action: input.action ? String(input.action).trim() : null,
    hedge: input.hedge ? String(input.hedge).trim() : null,
    nextStep: input.nextStep ? String(input.nextStep).trim() : null,
    riskFlags: boundedList(input.riskFlags),
    opportunityScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 100)) : 50,
    positiveOutcomeProbability,
    probabilityBasis: positiveOutcomeProbability === null ? null : probabilityBasis,
    opsTags: boundedList(input.opsTags, 4).map((tag) => tag.toLowerCase()),
    assumptions: boundedList(input.assumptions),
    missingInputs,
    sensitivityTriggers: boundedList(input.sensitivityTriggers ?? input.whatWouldChange),
    evidenceGrade,
    analysisSource: input.analysisSource ? String(input.analysisSource).trim() : "ai",
  };
}
