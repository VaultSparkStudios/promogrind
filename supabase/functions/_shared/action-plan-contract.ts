import { validateCalculatorSlug } from "./validate.ts";

export type ActionPlanObservation = {
  evidenceRef: string;
  observationKey: string;
  book: string;
  promoLabel: string;
  promoType: string;
  market: "US" | "UK";
  observedAt: string;
  freshness: "operator-confirmed-current";
};

export type ActionPlanContext = {
  contextVersion: 1;
  evidencePolicy: "operator-confirmed-within-7-days";
  generatedAt: string;
  observations: ActionPlanObservation[];
  profileConsent: boolean;
  profile: null | {
    bankroll: number | null;
    recentRealizedProfit: number;
    ledgerCount: number;
    settledWorkflowCount: number;
    activeBooks: string[];
  };
};

const MAX_OBSERVATION_AGE_MS = 7 * 86_400_000;
const FUTURE_SKEW_MS = 5 * 60_000;
const MODES = new Set(["verify_terms", "calculate_value", "queue_review"]);

function finiteOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
function boundedText(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

export function parseActionPlanContext(input: unknown, now = Date.now()): ActionPlanContext {
  if (!input || typeof input !== "object") throw new Error("Evidence context is required");
  const body = input as Record<string, unknown>;
  if (body.contextVersion !== 1 || body.evidencePolicy !== "operator-confirmed-within-7-days") {
    throw new Error("Unsupported action-plan evidence contract");
  }
  if (!Array.isArray(body.observations) || body.observations.length < 1 || body.observations.length > 6) {
    throw new Error("One to six current operator observations are required");
  }
  const observations = body.observations.map((raw) => {
    const item = (raw || {}) as Record<string, unknown>;
    const observedAt = new Date(String(item.observedAt || ""));
    const age = now - observedAt.getTime();
    if (Number.isNaN(observedAt.getTime()) || age < -FUTURE_SKEW_MS || age > MAX_OBSERVATION_AGE_MS) {
      throw new Error("Action-plan observation is stale or invalid");
    }
    const evidenceRef = boundedText(item.evidenceRef, 240);
    const book = boundedText(item.book, 80);
    const promoLabel = boundedText(item.promoLabel, 120);
    if (!evidenceRef.startsWith("local-observation:") || !book || !promoLabel || item.freshness !== "operator-confirmed-current") {
      throw new Error("Action-plan observation lacks required evidence fields");
    }
    return {
      evidenceRef,
      observationKey: boundedText(item.observationKey, 160),
      book,
      promoLabel,
      promoType: boundedText(item.promoType, 60) || "other",
      market: item.market === "UK" ? "UK" as const : "US" as const,
      observedAt: observedAt.toISOString(),
      freshness: "operator-confirmed-current" as const,
    };
  });
  if (new Set(observations.map((item) => item.evidenceRef)).size !== observations.length) {
    throw new Error("Duplicate action-plan evidence references");
  }

  const profileConsent = body.profileConsent === true;
  if (!profileConsent && body.profile !== null && body.profile !== undefined) {
    throw new Error("Profile data supplied without explicit consent");
  }
  const rawProfile = profileConsent && body.profile && typeof body.profile === "object"
    ? body.profile as Record<string, unknown>
    : null;
  const profile = rawProfile ? {
    bankroll: finiteOrNull(rawProfile.bankroll),
    recentRealizedProfit: finiteOrNull(rawProfile.recentRealizedProfit) || 0,
    ledgerCount: Math.max(0, Math.trunc(finiteOrNull(rawProfile.ledgerCount) || 0)),
    settledWorkflowCount: Math.max(0, Math.trunc(finiteOrNull(rawProfile.settledWorkflowCount) || 0)),
    activeBooks: Array.isArray(rawProfile.activeBooks) ? rawProfile.activeBooks.map((item) => boundedText(item, 80)).filter(Boolean).slice(0, 12) : [],
  } : null;

  return {
    contextVersion: 1,
    evidencePolicy: "operator-confirmed-within-7-days",
    generatedAt: new Date(String(body.generatedAt || now)).toISOString(),
    observations,
    profileConsent,
    profile,
  };
}

export function renderActionPlanContext(context: ActionPlanContext) {
  const lines = context.observations.map((item) =>
    `- Evidence ${item.evidenceRef}: operator saw "${item.promoLabel}" at ${item.book} (${item.market}) on ${item.observedAt}. This is not proof of current eligibility or terms.`);
  if (context.profileConsent && context.profile) {
    const profile = context.profile;
    lines.push(`- Consented profile: bankroll ${profile.bankroll === null ? "not supplied" : `$${profile.bankroll}`}; recent realized P/L $${profile.recentRealizedProfit}; ${profile.ledgerCount} ledger rows; ${profile.settledWorkflowCount} settled workflows; active-book labels ${profile.activeBooks.join(", ") || "none"}.`);
  } else {
    lines.push("- No financial profile, outcome history, or book roster was consented for this request.");
  }
  return lines.join("\n");
}

const COPY = {
  verify_terms: {
    title: (e: ActionPlanObservation) => `Verify current terms — ${e.book}: ${e.promoLabel}`,
    why: "A recent local observation confirms only that the pattern was seen; eligibility, limits, odds, and terms can change.",
    nextStep: "Re-check the offer, eligibility, limits, minimum odds, and void rules in the sportsbook before acting.",
  },
  calculate_value: {
    title: (e: ActionPlanObservation) => `Calculate your value — ${e.book}: ${e.promoLabel}`,
    why: "A value estimate is only defensible after current terms and your actual stake constraints are entered.",
    nextStep: "Verify the terms first, then enter the current inputs in the matching calculator.",
  },
  queue_review: {
    title: (e: ActionPlanObservation) => `Queue an outcome review — ${e.book}: ${e.promoLabel}`,
    why: "Placed, skipped, and settled feedback turns a local observation into evidence for future planning.",
    nextStep: "After verifying and deciding, record placed or skipped; if placed, settle the realized outcome later.",
  },
};

function groundedAction(raw: Record<string, unknown>, context: ActionPlanContext, fallbackMode = "verify_terms") {
  const allowed = new Map(context.observations.map((item) => [item.evidenceRef, item]));
  const requestedRefs = Array.isArray(raw.evidenceRefs) ? raw.evidenceRefs.map(String) : [String(raw.evidenceRef || "")];
  const evidenceRef = requestedRefs.find((ref) => allowed.has(ref));
  if (!evidenceRef) return null;
  const evidence = allowed.get(evidenceRef)!;
  const requestedMode = String(raw.actionMode || fallbackMode);
  const actionMode = MODES.has(requestedMode) ? requestedMode as keyof typeof COPY : fallbackMode as keyof typeof COPY;
  const score = Math.max(0, Math.min(Number.parseInt(String(raw.opportunityScore ?? "50"), 10) || 50, 70));
  const priority = ["high", "medium", "low"].includes(String(raw.priority)) ? String(raw.priority) : "medium";
  const copy = COPY[actionMode];
  return {
    title: copy.title(evidence),
    why: copy.why,
    value: null,
    priority,
    calculatorSlug: actionMode === "calculate_value" ? validateCalculatorSlug(raw.calculatorSlug) : null,
    bookTarget: evidence.book,
    opsTags: ["operator-observed", "verify-before-act", actionMode],
    promoType: evidence.promoType,
    confidence: "medium",
    opportunityScore: score,
    nextStep: copy.nextStep,
    actionMode,
    evidenceRefs: [evidenceRef],
    requiresVerification: true,
  };
}

export function buildGroundedActionPlan(modelPlan: Record<string, unknown>, context: ActionPlanContext) {
  const requested = Array.isArray(modelPlan?.actions) ? modelPlan.actions as Record<string, unknown>[] : [];
  const actions = requested.map((action) => groundedAction(action, context)).filter(Boolean) as NonNullable<ReturnType<typeof groundedAction>>[];
  const seen = new Set(actions.map((action) => `${action.evidenceRefs[0]}:${action.actionMode}`));
  for (const observation of context.observations) {
    for (const mode of ["verify_terms", "calculate_value", "queue_review"]) {
      if (actions.length >= 3) break;
      const key = `${observation.evidenceRef}:${mode}`;
      if (seen.has(key)) continue;
      const action = groundedAction({ evidenceRef: observation.evidenceRef, actionMode: mode, priority: "medium", opportunityScore: 50 }, context, mode);
      if (action) actions.push(action);
      seen.add(key);
    }
    if (actions.length >= 3) break;
  }
  return {
    contextVersion: 1,
    analysisSource: "model",
    evidenceStatus: "operator-observed-reverify-required",
    evidencePolicy: context.evidencePolicy,
    evidenceCount: context.observations.length,
    profileIncluded: Boolean(context.profileConsent && context.profile),
    summary: `${context.observations.length} recent operator-confirmed observation${context.observations.length === 1 ? "" : "s"} ranked into a verify → calculate → review workflow. No live-offer or value claim is made.`,
    assumptions: ["Observations are self-reported and local.", "Current eligibility, terms, odds, limits, and void rules still require verification."],
    actions: actions.slice(0, 3),
  };
}
