function safeUUID() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    // fall through to fallback
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function titleCase(value = "") {
  return String(value || "")
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

const PROMO_TYPE_ALIASES = {
  bonus: "bonus_bet",
  bonus_bet: "bonus_bet",
  free_bet: "bonus_bet",
  freebet: "bonus_bet",
  profit_boost: "profit_boost",
  odds_boost: "profit_boost",
  boost: "profit_boost",
  safety: "safety_net",
  safety_net: "safety_net",
  first_bet: "safety_net",
  insurance: "insurance",
  sgp_insurance: "insurance",
  parlay_insurance: "insurance",
  deposit_match: "deposit_match",
  reload_match: "deposit_match",
  parlay: "parlay",
  sgp: "parlay",
  arb: "arb",
  arbitrage: "arb",
  other: "other",
};

const PROMO_TYPE_LABELS = {
  bonus_bet: "Bonus Bet",
  profit_boost: "Profit Boost",
  safety_net: "Safety Net",
  deposit_match: "Deposit Match",
  insurance: "Insurance",
  parlay: "Parlay",
  arb: "Arbitrage",
  other: "Other",
};

const CALCULATOR_SLUG_ALIASES = {
  "first-bet": "first-bet",
  "bonus-bet": "bonus-bet",
  "profit-boost": "profit-boost",
  "deposit-match": "deposit-match",
  "deposit-match-calculator": "deposit-match",
  "same-game-parlay": "parlay",
  parlay: "parlay",
  insurance: "insurance",
  hedge: "hedge",
  ev: "ev",
  "arb-2way": "arb-2way",
  arb: "arb-2way",
};

const WORKFLOW_STATUS_ALIASES = {
  queued: "queued",
  ready: "ready",
  placed: "placed",
  waiting: "waiting",
  open: "waiting",
  pending: "waiting",
  settled: "settled",
  won: "settled",
  lost: "settled",
  void: "settled",
  skipped: "skipped",
};

const DEFAULT_PROMO_TYPE = "other";
const DEFAULT_WORKFLOW_STATUS = "queued";

export function normalizePromoType(value = "") {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return PROMO_TYPE_ALIASES[key] || DEFAULT_PROMO_TYPE;
}

export function formatPromoTypeLabel(value = "") {
  const normalized = normalizePromoType(value);
  return PROMO_TYPE_LABELS[normalized] || titleCase(normalized || DEFAULT_PROMO_TYPE);
}

export function normalizeCalculatorSlug(value = "") {
  const key = String(value || "").trim().toLowerCase();
  return CALCULATOR_SLUG_ALIASES[key] || key || null;
}

export function normalizeWorkflowStatus(value = "") {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "_");
  return WORKFLOW_STATUS_ALIASES[key] || DEFAULT_WORKFLOW_STATUS;
}

export function isWorkflowOpen(status) {
  const normalized = normalizeWorkflowStatus(status);
  return normalized === "queued" || normalized === "ready" || normalized === "placed" || normalized === "waiting";
}

export function normalizeRecommendation(input = {}) {
  const parsedScore = Number.parseInt(input.opportunityScore, 10);
  return {
    promoType: normalizePromoType(input.promoType),
    calculatorSlug: normalizeCalculatorSlug(input.calculatorSlug),
    bookTarget: String(input.bookTarget || input.book || "").trim(),
    opportunityScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 100)) : null,
    confidence: String(input.confidence || "").trim().toLowerCase() || null,
    opsTags: Array.isArray(input.opsTags) ? input.opsTags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
  };
}

export function normalizeWorkflowEntry(entry = {}) {
  const status = normalizeWorkflowStatus(entry.status);
  return {
    id: entry.id ?? safeUUID(),
    calculatorKey: entry.calculatorKey || normalizeCalculatorSlug(entry.calculatorSlug) || "unknown",
    calculatorSlug: normalizeCalculatorSlug(entry.calculatorSlug || entry.calculatorKey),
    calculatorLabel: entry.calculatorLabel || "Unknown calculator",
    promoType: normalizePromoType(entry.promoType),
    status,
    expectedProfit: toNumber(entry.expectedProfit),
    actualProfit: toNumber(entry.actualProfit),
    calculatorAccurate: entry.calculatorAccurate || null,
    book: String(entry.book || entry.bookTarget || "").trim(),
    skipReason: String(entry.skipReason || "").trim(),
    frictionReason: String(entry.frictionReason || "").trim(),
    actionability: entry.actionability || null,
    note: String(entry.note || "").trim(),
    source: String(entry.source || "result_feedback").trim(),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

export function summarizeWorkflows(entries = []) {
  const workflows = Array.isArray(entries) ? entries.map((entry) => normalizeWorkflowEntry(entry)) : [];
  const byStatus = new Map();
  for (const workflow of workflows) {
    const current = byStatus.get(workflow.status) || 0;
    byStatus.set(workflow.status, current + 1);
  }
  return {
    workflows,
    open: workflows.filter((workflow) => isWorkflowOpen(workflow.status)),
    waiting: workflows.filter((workflow) => workflow.status === "waiting"),
    settled: workflows.filter((workflow) => workflow.status === "settled"),
    skipped: workflows.filter((workflow) => workflow.status === "skipped"),
    byStatus,
  };
}
