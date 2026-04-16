const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};

export function parseLaunchFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

export function ensureTrailingSlash(url) {
  if (!url) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

export const CANONICAL_APP_URL = ensureTrailingSlash(
  env.VITE_CANONICAL_URL || "https://promogrind.bet/"
);

export const PROJECT_AUTH_QUERY_KEY = "auth";
export const PROJECT_AUTH_MODES = ["signin", "signup"];
export const VAULT_ACCOUNT_PORTAL_URL = "https://vaultsparkstudios.com/vault-member/";

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

export const LAUNCH_VALIDATION = {
  smokeCommand: {
    label: "Repo launch smoke",
    command: "npm run smoke:launch",
    lastKnown: "passing",
  },
  browserSmoke: {
    label: "Browser smoke",
    command: "npm run smoke:browser",
    lastKnown: "passing",
  },
  tests: {
    label: "Vitest",
    command: "npm test",
    lastKnown: "158/158 passing",
  },
  build: {
    label: "Build",
    command: "npm run build",
    lastKnown: "passing",
  },
};

export const LAUNCH_BLOCKERS = [
  {
    key: "affiliateLinks",
    label: "Affiliate links",
    status: "manual",
    detail: "Real affiliate-approved links still need to replace placeholders in src/books.js.",
  },
  {
    key: "edgeDeploy",
    label: "Edge hardening deploy",
    status: "cleared",
    detail: "Core auth-backed edge functions were redeployed on 2026-04-15 so production now matches the repo for checkout, portal, AI, gift, and beta flows.",
  },
  {
    key: "pushConfig",
    label: "Push config",
    status: "manual",
    detail: "Set VITE_VAPID_PUBLIC_KEY in the live frontend before exposing Daily Brief push publicly.",
  },
  {
    key: "edgeAuth",
    label: "Edge auth compatibility",
    status: "cleared",
    detail: "Resolved on 2026-04-15 by deploying Edge Functions with per-function verify_jwt=false config for publishable-key browser calls.",
  },
  {
    key: "stripeSmoke",
    label: "Stripe smoke test",
    status: "manual",
    detail: "Run one real checkout and customer-portal pass against the deployed app before launch.",
  },
  {
    key: "friendPass",
    label: "Friend beta pass",
    status: "manual",
    detail: "Have a friend create an account and run the core calculator flow to confirm the launch experience feels ready.",
  },
];

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

export function getValidationSignal(value = "") {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "unknown";
  if (/(fail|error|blocked|broken|timeout)/i.test(normalized)) return "failing";
  if (/(passing|pass|\d+\/\d+)/i.test(normalized)) return "passing";
  return "warning";
}

export function resolveLaunchValidation(overrides = {}) {
  const resolved = {};
  for (const [key, value] of Object.entries(LAUNCH_VALIDATION)) {
    resolved[key] = {
      ...value,
      ...(overrides[key] || {}),
      signal: getValidationSignal((overrides[key] || {}).lastKnown ?? value.lastKnown),
    };
  }
  return resolved;
}

export function getLaunchCommandCenter(input = {}) {
  const {
    configuredAffiliateCount = 0,
    configuredMonetizationCount = 0,
    totalBooks = 0,
    blockers = LAUNCH_BLOCKERS,
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

    const nextActions = [
    unresolvedBlockers.find((item) => item.key === "pushConfig"),
    unresolvedBlockers.find((item) => item.key === "stripeSmoke"),
    unresolvedBlockers.find((item) => item.key === "affiliateLinks"),
    unresolvedBlockers.find((item) => item.key === "friendPass"),
  ].filter(Boolean).slice(0, 4);

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
