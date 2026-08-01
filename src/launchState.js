import { LAUNCH_PROOFS } from "./data/launchProofs.generated.js";
import { PROJECT_STATUS_MIRROR } from "./data/projectStatus.generated.js";

const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};

export function parseLaunchFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

export function ensureTrailingSlash(url) {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

export function normalizeBasePath(path = "/") {
  const value = String(path || "/").trim();
  if (!value || value === "/") return "/";
  const withLeadingSlash = value.startsWith("/") ? value : `/${value}`;
  return ensureTrailingSlash(withLeadingSlash);
}

export function getAppPath(path = "") {
  const base = normalizeBasePath(env.VITE_APP_BASE_PATH || "/");
  const cleanPath = String(path || "").replace(/^\/+/, "");
  if (!cleanPath) return base;
  return `${base}${cleanPath}`;
}

export const CANONICAL_APP_URL = ensureTrailingSlash(
  env.VITE_CANONICAL_URL || "https://promogrind.bet/"
);
export const APP_BASE_PATH = normalizeBasePath(env.VITE_APP_BASE_PATH || "/");
export const APP_DASHBOARD_PATH = getAppPath("dashboard");

export function getAbsoluteAppUrl(path = "") {
  const targetPath = getAppPath(path);
  try {
    if (typeof window !== "undefined" && window.location?.origin) {
      return new URL(targetPath, window.location.origin).toString();
    }
    return new URL(targetPath, CANONICAL_APP_URL).toString();
  } catch {
    return `${CANONICAL_APP_URL.replace(/\/$/, "")}${targetPath}`;
  }
}

export const PROJECT_AUTH_QUERY_KEY = "auth";
export const PROJECT_AUTH_MODES = ["signin", "signup", "reset", "update-password"];

export function getProjectAuthMode(search = "") {
  const params = new URLSearchParams(
    typeof search === "string" ? search.replace(/^\?/, "") : ""
  );
  const mode = (params.get(PROJECT_AUTH_QUERY_KEY) || "").trim().toLowerCase();
  return PROJECT_AUTH_MODES.includes(mode) ? mode : null;
}

export function getProjectAuthHref(mode = "signup", currentUrl) {
  const normalizedMode = PROJECT_AUTH_MODES.includes(mode) ? mode : "signup";

  try {
    const base =
      currentUrl ||
      (typeof window !== "undefined" ? window.location.href : CANONICAL_APP_URL);
    const url = new URL(base, CANONICAL_APP_URL);
    url.searchParams.set(PROJECT_AUTH_QUERY_KEY, normalizedMode);
    return url.toString();
  } catch {
    return `${CANONICAL_APP_URL}?${PROJECT_AUTH_QUERY_KEY}=${normalizedMode}`;
  }
}
export const FEATURE_KEYS = [
  "aiScan",
  "promoAdvisor",
  "promoChat",
  "liveScanner",
  "stackBuilder",
  "aiActionPlan",
  "pushAlerts",
  "paidCheckout",
];

export const FEATURE_FLAGS = {
  aiScan: parseLaunchFlag(env.VITE_PG_FEATURE_AI_SCAN, false),
  promoAdvisor: parseLaunchFlag(env.VITE_PG_FEATURE_PROMO_ADVISOR, false),
  promoChat: parseLaunchFlag(env.VITE_PG_FEATURE_PROMO_CHAT, false),
  liveScanner: parseLaunchFlag(env.VITE_PG_FEATURE_LIVE_SCANNER, false),
  stackBuilder: parseLaunchFlag(env.VITE_PG_FEATURE_STACK_BUILDER, false),
  aiActionPlan: parseLaunchFlag(env.VITE_PG_FEATURE_AI_ACTION_PLAN, false),
  pushAlerts: parseLaunchFlag(env.VITE_PG_FEATURE_PUSH_ALERTS, false),
  paidCheckout: parseLaunchFlag(env.VITE_PG_FEATURE_PAID_CHECKOUT, false),
};

export const LAUNCH_VALIDATION = PROJECT_STATUS_MIRROR.validation;

// Launch blockers are derived exclusively from launchProofs.generated.js.
// FEATURE_INFO below is setup guidance, not evidence or release state.
export function normalizeLaunchProofs(payload = LAUNCH_PROOFS) {
  const rawProofs = payload?.proofs && typeof payload.proofs === "object" ? payload.proofs : {};
  return Object.entries(rawProofs).map(([key, proof]) => {
    const evidence = Array.isArray(proof?.receipts) ? proof.receipts : Array.isArray(proof?.evidence) ? proof.evidence : [];
    const hasCriteria = Array.isArray(proof?.criteria);
    const criteria = hasCriteria
      ? proof.criteria.filter((criterion) => criterion?.id && criterion?.label)
      : (Array.isArray(proof?.evidenceRequired) ? proof.evidenceRequired : []).map((label, index) => ({ id: `legacy-${index + 1}`, label }));
    const covered = new Set(evidence.map((receipt) => receipt?.criterionId).filter(Boolean));
    const evidenceRequired = criteria.map((criterion) => criterion.label);
    const evidenceCount = hasCriteria
      ? criteria.filter((criterion) => covered.has(criterion.id)).length
      : evidence.length;
    const missingEvidence = criteria.filter((criterion) => !covered.has(criterion.id)).map((criterion) => criterion.label);
    const persistedStatus = String(proof?.status || "pending").trim().toLowerCase();
    const status = hasCriteria && criteria.length > 0
      ? evidenceCount === criteria.length ? "complete" : evidenceCount > 0 ? "partial" : "pending"
      : persistedStatus;
    const requiredFor = Array.isArray(proof?.requiredFor) ? proof.requiredFor : [];
    return {
      key,
      label: proof?.label || key,
      status,
      blocking: proof?.blocking !== false,
      requiredFor,
      detail: proof?.details || proof?.detail || "",
      details: proof?.details || proof?.detail || "",
      nextStep: proof?.nextStep || "",
      evidenceRequired,
      evidence,
      requiredBooks: Array.isArray(proof?.requiredBooks) ? proof.requiredBooks : [],
      isComplete: status === "complete",
      isBlocking: proof?.blocking !== false && status !== "complete",
      evidenceCount,
      missingEvidence,
      requiredEvidenceCount: evidenceRequired.length,
    };
  });
}

export function getLaunchProofSummary(payload = LAUNCH_PROOFS) {
  const proofs = normalizeLaunchProofs(payload);
  const blocking = proofs.filter((proof) => proof.isBlocking);
  const complete = proofs.filter((proof) => proof.isComplete);
  const evidenceCount = proofs.reduce((sum, proof) => sum + proof.evidenceCount, 0);
  return {
    schemaVersion: payload?.schemaVersion || "1.0",
    lastUpdated: payload?.lastUpdated || null,
    total: proofs.length,
    complete: complete.length,
    pending: proofs.length - complete.length,
    blocking: blocking.length,
    evidenceCount,
    proofs,
    blockingProofs: blocking,
    completeProofs: complete,
  };
}

export function getLaunchProofCommandItems(payload = LAUNCH_PROOFS) {
  return getLaunchProofSummary(payload).proofs
    .map((proof) => ({
      key: proof.key,
      label: proof.label,
      status: proof.isComplete ? "cleared" : proof.blocking ? "manual" : "advisory",
      detail: proof.detail,
      details: proof.details,
      nextStep: proof.nextStep,
      evidenceRequired: proof.evidenceRequired,
      evidence: proof.evidence,
      evidenceCount: proof.evidenceCount,
      missingEvidence: proof.missingEvidence,
      requiredEvidenceCount: proof.requiredEvidenceCount,
      requiredFor: proof.requiredFor,
      requiredBooks: proof.requiredBooks,
    }))
    .sort((a, b) => {
      if (a.status !== b.status) {
        const rank = { manual: 0, advisory: 1, cleared: 2 };
        return (rank[a.status] ?? 3) - (rank[b.status] ?? 3);
      }
      return b.requiredEvidenceCount - a.requiredEvidenceCount;
    });
}

export const FEATURE_INFO = {
  aiScan: {
    label: "Bet Slip Scan",
    shortReason: "AI scan is still in beta while backend activation is completed.",
    setup: "Requires ANTHROPIC_API_KEY + parse-bet-slip deployment.",
  },
  promoAdvisor: {
    label: "Promo Advisor",
    shortReason: "Promo Advisor is in beta until AI backend setup is complete.",
    setup: "Requires ANTHROPIC_API_KEY + promo-advisor deployment.",
  },
  promoChat: {
    label: "PromoChat",
    shortReason: "PromoChat is in beta until AI backend setup is complete.",
    setup: "Requires ANTHROPIC_API_KEY + promo-chat deployment.",
  },
  liveScanner: {
    label: "Live Scanner",
    shortReason: "Live scanning stays beta until odds infrastructure is configured.",
    setup: "Requires ODDS_API_KEY + odds backend deployment.",
  },
  stackBuilder: {
    label: "Stack Builder",
    shortReason: "Stack Builder is in beta until AI backend setup is complete.",
    setup: "Requires ANTHROPIC_API_KEY + stack-builder deployment.",
  },
  aiActionPlan: {
    label: "AI Action Plan",
    shortReason: "AI Action Plan is in beta until AI backend setup is complete.",
    setup: "Requires ANTHROPIC_API_KEY + ai-action-plan deployment.",
  },
  pushAlerts: {
    label: "Push Alerts",
    shortReason: "Push alerts are in beta until browser push setup is complete.",
    setup: "Requires VITE_VAPID_PUBLIC_KEY + VAPID server keys + push_subscriptions migration + send-daily-brief deployment.",
  },
  paidCheckout: {
    label: "Paid Checkout",
    shortReason: "Paid checkout stays disabled until live billing is configured.",
    setup: "Requires live Stripe products + live secrets + webhook deployment + auth-compatible edge invocation.",
  },
};

export function getFeatureState(key) {
  return {
    key,
    enabled: !!FEATURE_FLAGS[key],
    ...(FEATURE_INFO[key] || { label: key, shortReason: "Feature is not enabled.", setup: "" }),
  };
}

export function getLaunchSummary() {
  const enabledCount = FEATURE_KEYS.filter((key) => FEATURE_FLAGS[key]).length;
  return {
    enabledCount,
    disabledCount: FEATURE_KEYS.length - enabledCount,
    totalCount: FEATURE_KEYS.length,
  };
}

export function parseValidationSignal(value = "") {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase();
  const base = {
    raw,
    signal: "unknown",
    observedCount: null,
    expectedCount: null,
    reason: "missing evidence",
  };

  if (!normalized) return base;
  if (/(fail|error|blocked|broken|timeout|abort|cancel)/i.test(normalized)) {
    return { ...base, signal: "failing", reason: "explicit failure marker" };
  }

  const countMatch = normalized.match(/(?:^|\D)(\d[\d,]*)\s*\/\s*(\d[\d,]*)(?:\D|$)/);
  if (countMatch) {
    const observedCount = Number.parseInt(countMatch[1].replace(/,/g, ""), 10);
    const expectedCount = Number.parseInt(countMatch[2].replace(/,/g, ""), 10);
    if (!Number.isFinite(observedCount) || !Number.isFinite(expectedCount) || expectedCount <= 0) {
      return { ...base, signal: "warning", observedCount, expectedCount, reason: "non-positive or malformed expected count" };
    }
    if (observedCount !== expectedCount) {
      return { ...base, signal: "failing", observedCount, expectedCount, reason: "observed count does not equal expected count" };
    }
    return { ...base, signal: "passing", observedCount, expectedCount, reason: "complete positive count" };
  }

  if (/\b(?:passing|passed|pass|success|successful|green)\b/i.test(normalized)) {
    return { ...base, signal: "passing", reason: "explicit uncounted pass marker" };
  }
  if (/\b(?:stale|unknown|pending|partial|skipped|unavailable|not run)\b/i.test(normalized)) {
    return { ...base, signal: "warning", reason: "non-terminal or unavailable evidence" };
  }
  return { ...base, signal: "warning", reason: "unrecognized evidence" };
}

export function getValidationSignal(value = "") {
  return parseValidationSignal(value).signal;
}

export function resolveLaunchValidation(overrides = {}) {
  const resolved = {};
  for (const [key, value] of Object.entries(LAUNCH_VALIDATION)) {
    const lastKnown = (overrides[key] || {}).lastKnown ?? value.lastKnown;
    const evidence = parseValidationSignal(lastKnown);
    resolved[key] = {
      ...value,
      ...(overrides[key] || {}),
      signal: evidence.signal,
      evidence,
    };
  }
  return resolved;
}

export function getLaunchCommandCenter(input = {}) {
  const {
    configuredAffiliateCount = 0,
    configuredMonetizationCount = 0,
    totalBooks = 0,
    blockers = getLaunchProofCommandItems(),
    validation = resolveLaunchValidation(),
  } = input;

  const validationRows = Object.values(validation);
  const validationPassingCount = validationRows.filter((row) => row.signal === "passing").length;
  const validationScore = validationRows.length ? Math.round((validationPassingCount / validationRows.length) * 100) : 0;
  const monetizationScore = totalBooks > 0 ? Math.round((configuredMonetizationCount / totalBooks) * 100) : 0;
  const affiliateScore = totalBooks > 0 ? Math.round((configuredAffiliateCount / totalBooks) * 100) : 0;
  const unresolvedBlockers = blockers.filter((blocker) => blocker.status === "manual");
  const blockerPenalty = Math.min(unresolvedBlockers.length * 8, 32);
  const featureRollout = getLaunchSummary();
  const rolloutScore = featureRollout.totalCount ? Math.round((featureRollout.enabledCount / featureRollout.totalCount) * 100) : 0;

  const readinessScore = Math.max(
    0,
    Math.round(
      validationScore * 0.35 +
      monetizationScore * 0.2 +
      affiliateScore * 0.1 +
      rolloutScore * 0.15 +
      (100 - blockerPenalty) * 0.2
    ),
  );

  const posture =
    readinessScore >= 85 ? "ready" :
    readinessScore >= 65 ? "advancing" :
    readinessScore >= 45 ? "blocked" :
    "fragile";

  const priorityOrder = ["authEmailSmoke", "stripeSmoke", "friendBeta", "affiliateLinks", "pushConfig"];
  const nextActions = unresolvedBlockers
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ap = priorityOrder.indexOf(a.item.key);
      const bp = priorityOrder.indexOf(b.item.key);
      const ar = ap === -1 ? priorityOrder.length : ap;
      const br = bp === -1 ? priorityOrder.length : bp;
      if (ar !== br) return ar - br;
      return b.item.requiredEvidenceCount - a.item.requiredEvidenceCount || a.index - b.index;
    })
    .map(({ item }) => item)
    .slice(0, 4);

  return {
    readinessScore,
    posture,
    validationScore,
    monetizationScore,
    affiliateScore,
    rolloutScore,
    validationPassingCount,
    validationTotal: validationRows.length,
    unresolvedBlockerCount: unresolvedBlockers.length,
    nextActions,
    validation,
  };
}
