import { PROMO_SCHED } from "../data/promoSchedule.js";
import { normalizePromoType } from "../promograph/index.js";
import { getPromoFreshness, normalizePromoObservations, promoObservationKey } from "../lib/promoObservations.js";

export const ACTION_PLAN_CONTEXT_VERSION = 1;

function finite(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function observationRef(key, observedAt) {
  return `local-observation:${key}:${String(observedAt).replace(/[^0-9TZ.-]/g, "")}`;
}

export function buildActionPlanContext({ observations, appData = {}, includeProfile = false, bankroll = null, now = new Date() } = {}) {
  const normalized = normalizePromoObservations(observations);
  const current = PROMO_SCHED.flatMap((promo) => {
    const key = promoObservationKey(promo);
    const observation = normalized[key];
    const freshness = getPromoFreshness(promo, normalized, now);
    if (!observation || observation.status !== "confirmed" || freshness.needsVerification) return [];
    return [{
      evidenceRef: observationRef(key, observation.observedAt),
      observationKey: key,
      book: promo.book,
      promoLabel: promo.promo,
      promoType: normalizePromoType(promo.promo),
      market: promo.market,
      observedAt: observation.observedAt,
      freshness: "operator-confirmed-current",
    }];
  }).slice(0, 6);

  const context = {
    contextVersion: ACTION_PLAN_CONTEXT_VERSION,
    evidencePolicy: "operator-confirmed-within-7-days",
    generatedAt: new Date(now).toISOString(),
    observations: current,
    profileConsent: Boolean(includeProfile),
    profile: null,
  };

  if (includeProfile) {
    const ledger = Array.isArray(appData?.ledger) ? appData.ledger : [];
    const feedback = Array.isArray(appData?.resultFeedback) ? appData.resultFeedback : [];
    const settled = feedback.filter((entry) => entry?.status === "settled");
    const bankrollValue = finite(bankroll ?? appData?.bankroll);
    const profile = {
      bankroll: bankrollValue,
      recentRealizedProfit: Number(ledger.slice(-10).reduce((sum, entry) => sum + (finite(entry?.profit) || 0), 0).toFixed(2)),
      ledgerCount: ledger.length,
      settledWorkflowCount: settled.length,
      activeBooks: Object.entries(appData?.done || {}).filter(([, done]) => Boolean(done)).map(([book]) => book).slice(0, 12),
    };
    context.profile = profile;
  }
  return context;
}

export function canInvokeActionPlanModel(context) {
  return context?.contextVersion === ACTION_PLAN_CONTEXT_VERSION
    && Array.isArray(context?.observations)
    && context.observations.length > 0;
}

export function buildVerificationFirstPlan(context = {}) {
  return {
    contextVersion: ACTION_PLAN_CONTEXT_VERSION,
    analysisSource: "rule_engine",
    evidenceStatus: "verification-required",
    evidencePolicy: context.evidencePolicy || "operator-confirmed-within-7-days",
    evidenceCount: 0,
    profileIncluded: false,
    summary: "No current operator-confirmed promo observations are available, so no model was called and no sportsbook action is recommended.",
    assumptions: ["Historical patterns are not live offers.", "Eligibility, limits, odds, and terms must be checked in the sportsbook."],
    actions: [
      { title: "Open the verification queue", why: "Start with unverified or stale historical patterns; they are prompts to check, not offers.", priority: "high", calculatorSlug: null, bookTarget: null, promoType: "other", confidence: "low", opportunityScore: 0, nextStep: "Open Promo Calendar and inspect what is actually visible in your sportsbook.", evidenceRefs: [], requiresVerification: true, actionMode: "verify_terms" },
      { title: "Record what you actually see", why: "A Seen or Not seen observation creates the evidence boundary a grounded plan needs.", priority: "high", calculatorSlug: null, bookTarget: null, promoType: "other", confidence: "low", opportunityScore: 0, nextStep: "Mark the pattern Seen or Not seen with the local observation controls.", evidenceRefs: [], requiresVerification: true, actionMode: "record_observation" },
      { title: "Generate after evidence exists", why: "The model remains off until at least one operator-confirmed observation is current.", priority: "medium", calculatorSlug: null, bookTarget: null, promoType: "other", confidence: "low", opportunityScore: 0, nextStep: "Return here after recording a current observation.", evidenceRefs: [], requiresVerification: true, actionMode: "regenerate" },
    ],
  };
}

export function validateGroundedActionPlan(plan, context) {
  if (!plan || plan.contextVersion !== ACTION_PLAN_CONTEXT_VERSION || plan.analysisSource !== "model") {
    throw new Error("Action plan returned an unsupported evidence contract.");
  }
  const evidence = new Map((context?.observations || []).map((item) => [item.evidenceRef, item]));
  const actions = Array.isArray(plan.actions) ? plan.actions : [];
  for (const action of actions) {
    if (!Array.isArray(action.evidenceRefs) || !action.evidenceRefs.length) throw new Error("Action plan contains an ungrounded action.");
    if (action.evidenceRefs.some((ref) => !evidence.has(ref))) throw new Error("Action plan cites unknown evidence.");
    if (action.requiresVerification !== true) throw new Error("Action plan omitted the verify-before-act gate.");
    if (action.value !== null && action.value !== undefined) throw new Error("Action plan returned an unsupported value claim.");
    if (action.bookTarget && !action.evidenceRefs.some((ref) => evidence.get(ref)?.book === action.bookTarget)) {
      throw new Error("Action plan targets a sportsbook not supported by its evidence.");
    }
  }
  if (!actions.length) throw new Error("Action plan returned no grounded actions.");
  return plan;
}
