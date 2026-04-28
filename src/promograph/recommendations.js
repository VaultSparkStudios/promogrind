import { normalizeRecommendation, normalizeWorkflowEntry } from "./index.js";

export function recommendationToWorkflow(recommendation = {}, context = {}) {
  const normalized = normalizeRecommendation(recommendation);
  const now = context.now instanceof Date ? context.now.toISOString() : (context.now || new Date().toISOString());
  return normalizeWorkflowEntry({
    id: context.id,
    title: context.title || normalized.title || context.calculatorLabel || "Workflow",
    summary: context.summary || normalized.summary || "",
    status: context.status || "queued",
    calculatorSlug: normalized.calculatorSlug,
    calculatorKey: context.calculatorKey || normalized.calculatorSlug || context.source || "recommendation",
    calculatorLabel: context.calculatorLabel || "Recommendation",
    promoType: normalized.promoType,
    bookTarget: normalized.bookTarget,
    book: normalized.bookTarget,
    source: context.source || "recommendation",
    confidence: normalized.confidence,
    opportunityScore: normalized.opportunityScore,
    actionability: context.actionability ?? normalized.opportunityScore,
    nextStep: context.nextStep || "",
    note: context.note || "",
    opsTags: normalized.opsTags,
    sourceId: context.sourceId,
    sourceUrl: context.sourceUrl,
    expectedProfit: context.expectedProfit,
    expiresAt: context.expiresAt,
    createdAt: context.createdAt || now,
    updatedAt: context.updatedAt || now,
  });
}
