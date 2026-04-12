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
  env.VITE_CANONICAL_URL || "https://promogrind.com/"
);

export const FREE_VAULT_MEMBERSHIP_URL = "https://vaultsparkstudios.com/vault-member/";
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
    lastKnown: "new",
  },
  tests: {
    label: "Vitest",
    command: "npm test",
    lastKnown: "75/75 passing",
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
    key: "searchConsole",
    label: "Search Console",
    status: "manual",
    detail: "Sitemap submission is still pending for discovery activation.",
  },
  {
    key: "anthropic",
    label: "ANTHROPIC activation",
    status: "manual",
    detail: "AI surfaces stay beta-gated until the secret is set and functions are deployed.",
  },
  {
    key: "browserSmoke",
    label: "Browser smoke coverage",
    status: "repo",
    detail: "A browser-facing smoke script now exists and should be run alongside build/test before launch work.",
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
    setup: "Requires VAPID keys + push_subscriptions migration + send-daily-brief deployment.",
  },
  paidCheckout: {
    label: "Paid Checkout",
    shortReason: "Paid checkout stays disabled until live billing is configured.",
    setup: "Requires live Stripe products + live secrets + webhook deployment.",
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
