import { parseRealizedOutcomeValue } from "../lib/realizedOutcome.js";

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

function toProbability(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : null;
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
  const list = (value, limit = 3) => Array.isArray(value) ? value.map((item) => String(item || "").trim()).filter(Boolean).slice(0, limit) : [];
  const probabilityBasis = String(input.probabilityBasis || "").trim() || null;
  const positiveOutcomeProbability = probabilityBasis ? toProbability(input.positiveOutcomeProbability) : null;
  return {
    title: String(input.title || input.verdict || "").trim() || null,
    summary: String(input.summary || input.explanation || input.action || "").trim() || null,
    promoType: normalizePromoType(input.promoType),
    calculatorSlug: normalizeCalculatorSlug(input.calculatorSlug),
    bookTarget: String(input.bookTarget || input.book || "").trim(),
    opportunityScore: Number.isFinite(parsedScore) ? Math.max(0, Math.min(parsedScore, 100)) : null,
    positiveOutcomeProbability,
    probabilityBasis: positiveOutcomeProbability === null ? null : probabilityBasis,
    confidence: String(input.confidence || "").trim().toLowerCase() || null,
    opsTags: Array.isArray(input.opsTags) ? input.opsTags.map((tag) => String(tag || "").trim()).filter(Boolean) : [],
    assumptions: list(input.assumptions),
    missingInputs: list(input.missingInputs),
    sensitivityTriggers: list(input.sensitivityTriggers),
    evidenceGrade: ["complete", "partial", "estimate"].includes(input.evidenceGrade) ? input.evidenceGrade : null,
  };
}

export function normalizeWorkflowEntry(entry = {}) {
  const status = normalizeWorkflowStatus(entry.status);
  const recommendation = normalizeRecommendation(entry);
  const parsedActionability = Number.parseInt(entry.actionability, 10);
  const parsedExecutionMinutes = Number.parseFloat(entry.executionMinutes);
  return {
    id: entry.id ?? safeUUID(),
    calculatorKey: entry.calculatorKey || normalizeCalculatorSlug(entry.calculatorSlug) || "unknown",
    calculatorSlug: normalizeCalculatorSlug(entry.calculatorSlug || entry.calculatorKey),
    calculatorLabel: entry.calculatorLabel || "Unknown calculator",
    title: String(entry.title || recommendation.title || entry.calculatorLabel || "Workflow").trim(),
    summary: String(entry.summary || recommendation.summary || entry.note || "").trim(),
    promoType: normalizePromoType(entry.promoType),
    status,
    expectedProfit: toNumber(entry.expectedProfit),
    actualProfit: parseRealizedOutcomeValue(entry.actualProfit),
    calculatorAccurate: entry.calculatorAccurate || null,
    book: String(entry.book || entry.bookTarget || "").trim(),
    skipReason: String(entry.skipReason || "").trim(),
    frictionReason: String(entry.frictionReason || "").trim(),
    executionMinutes: Number.isFinite(parsedExecutionMinutes) ? Math.max(0, parsedExecutionMinutes) : null,
    wouldRepeat: entry.wouldRepeat === "no" ? "no" : entry.wouldRepeat === "maybe" ? "maybe" : entry.wouldRepeat === "yes" ? "yes" : null,
    confidence: recommendation.confidence,
    opportunityScore: recommendation.opportunityScore,
    positiveOutcomeProbability: recommendation.positiveOutcomeProbability,
    probabilityBasis: recommendation.probabilityBasis,
    calibrationPredictionId: entry.calibrationPredictionId ? String(entry.calibrationPredictionId).trim() : null,
    opsTags: recommendation.opsTags,
    assumptions: recommendation.assumptions,
    missingInputs: recommendation.missingInputs,
    sensitivityTriggers: recommendation.sensitivityTriggers,
    evidenceGrade: recommendation.evidenceGrade,
    actionability: Number.isFinite(parsedActionability)
      ? Math.max(0, Math.min(parsedActionability, 100))
      : recommendation.opportunityScore,
    note: String(entry.note || "").trim(),
    source: String(entry.source || "result_feedback").trim(),
    sourceId: entry.sourceId ? String(entry.sourceId).trim() : null,
    sourceUrl: entry.sourceUrl ? String(entry.sourceUrl).trim() : null,
    nextStep: String(entry.nextStep || "").trim(),
    expiresAt: entry.expiresAt || null,
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString(),
  };
}

export function upsertWorkflowEntry(entries = [], nextEntry = {}) {
  const normalized = normalizeWorkflowEntry(nextEntry);
  const index = entries.findIndex((entry) => entry?.id === normalized.id);
  if (index === -1) return [normalized, ...entries].slice(0, 250);
  const copy = [...entries];
  const existing = normalizeWorkflowEntry(copy[index]);
  const existingRank = WORKFLOW_STATUS_PRIORITY[existing.status] ?? 0;
  const nextRank = WORKFLOW_STATUS_PRIORITY[normalized.status] ?? 0;
  copy[index] = existingRank > nextRank && normalized.status === "queued"
    ? { ...normalized, ...existing }
    : resolveWorkflowStatusConflict(existing, normalized);
  return copy;
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

// ── Workflow status conflict policy ──────────────────────────────────────────
// Shared precedence for sync merge when two devices disagree on a workflow's
// status. Terminal states (settled, skipped) win over transient progress
// (queued/ready/placed/waiting) regardless of updatedAt jitter, because losing
// a settlement to a stale "placed" write is the expensive failure mode. Within
// the same tier we prefer the later updatedAt and, as a final tiebreaker, the
// more progressed status.

const WORKFLOW_STATUS_PRIORITY = {
  settled: 5,
  skipped: 4,
  waiting: 3,
  placed: 3,
  ready: 2,
  queued: 1,
};

const WORKFLOW_STATUS_TERMINAL = new Set(["settled", "skipped"]);

export function resolveWorkflowStatusConflict(localEntry, remoteEntry) {
  const local = localEntry ? normalizeWorkflowEntry(localEntry) : null;
  const remote = remoteEntry ? normalizeWorkflowEntry(remoteEntry) : null;
  if (!local) return remote;
  if (!remote) return local;

  const localTerminal = WORKFLOW_STATUS_TERMINAL.has(local.status);
  const remoteTerminal = WORKFLOW_STATUS_TERMINAL.has(remote.status);
  if (localTerminal && !remoteTerminal) return { ...remote, ...local };
  if (remoteTerminal && !localTerminal) return { ...local, ...remote };

  const localTs = Date.parse(local.updatedAt || local.createdAt || 0) || 0;
  const remoteTs = Date.parse(remote.updatedAt || remote.createdAt || 0) || 0;
  if (localTs !== remoteTs) {
    return localTs > remoteTs ? { ...remote, ...local } : { ...local, ...remote };
  }

  const localRank = WORKFLOW_STATUS_PRIORITY[local.status] ?? 0;
  const remoteRank = WORKFLOW_STATUS_PRIORITY[remote.status] ?? 0;
  return remoteRank > localRank ? { ...local, ...remote } : { ...remote, ...local };
}

export function buildOperatingActionCandidates(input = {}) {
  const {
    hasBankroll = false,
    hasCalc = false,
    affiliateReady = false,
    totalProfit = 0,
    openBets = [],
    booksComplete = 0,
    openWorkflowCount = 0,
    topWorkflow = null,
    bestBook = null,
    topPlaybook = null,
  } = input;

  return [
    !hasBankroll && {
      key: "bankroll",
      title: "Set your bankroll",
      body: "Stake sizing and action ranking need a bankroll anchor.",
      cta: "Set profile",
      slug: "dashboard",
      tone: "info",
      score: 100,
    },
    !hasCalc && {
      key: "calc",
      title: "Run your first conversion",
      body: "Start with Bonus Bet Converter and get a hedge in under a minute.",
      cta: "Open converter",
      slug: "bonus-bet",
      tone: "positive",
      score: 92,
    },
    bestBook && {
      key: "books-personalized",
      title: `Open ${bestBook.book.name} next`,
      body: `${bestBook.reason}${bestBook.stateCode ? ` in ${bestBook.stateCode}` : ""} · ${bestBook.book.detail}.`,
      cta: "Review best-fit book",
      slug: "sportsbooks",
      tone: bestBook.status === "limited" ? "watch" : "positive",
      score: 90 + Math.min((bestBook.book.bonus || 0) / 200, 8),
    },
    booksComplete === 0 && {
      key: "books",
      title: "Pick your first book",
      body: "Mark your books and start with the best welcome offer.",
      cta: "Open tracker",
      slug: "sportsbooks",
      tone: "watch",
      score: 84,
    },
    topWorkflow && {
      key: "workflow-focus",
      title: topWorkflow.title || "Advance highest-value workflow",
      body:
        topWorkflow.scoreSummary ||
        topWorkflow.nextStep ||
        topWorkflow.summary ||
        `Best current workflow is ${String(topWorkflow.status || "queued").replace(/_/g, " ")} with score ${topWorkflow.score}.`,
      cta: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "Open Track" : "Open workflow",
      slug: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "track" : (topWorkflow.calculatorSlug || "track"),
      tone: (topWorkflow.score || 0) >= 90 ? "positive" : "watch",
      score: (topWorkflow.score || 0) + 2,
    },
    openWorkflowCount > 0 && {
      key: "workflows",
      title: "Advance workflows",
      body: `${openWorkflowCount} workflow${openWorkflowCount === 1 ? "" : "s"} still need follow-through.`,
      cta: "Open Track",
      slug: "track",
      tone: "watch",
      score: 88 + Math.min(openWorkflowCount, 4),
    },
    openBets.length > 0 && {
      key: "open",
      title: "Close open bets",
      body: `${openBets.length} open bet${openBets.length === 1 ? "" : "s"} still need settlement.`,
      cta: "Review bets",
      slug: "bet-tracker",
      tone: "watch",
      score: 80 + Math.min(openBets.length, 5),
    },
    topPlaybook?.applicable && {
      key: `playbook:${topPlaybook.playbook.id}`,
      title: `Try: ${topPlaybook.playbook.name}`,
      body: topPlaybook.playbook.summary,
      cta: "Run playbook",
      slug: topPlaybook.playbook.steps?.[0]?.calculatorSlug || "dashboard",
      tone: topPlaybook.playbook.tone || "positive",
      score: Math.round(60 + Math.max(0, topPlaybook.fitScore - 50) * 0.6),
      playbookId: topPlaybook.playbook.id,
    },
    !affiliateReady && {
      key: "affiliate",
      title: "Revenue setup incomplete",
      body: "Referral links are still placeholders, so outbound clicks are not monetized yet.",
      cta: "Review links",
      slug: "sportsbooks",
      tone: "risk",
      score: 48,
    },
    {
      key: "scale",
      title: "Scale the loop",
      body: `You have extracted ${totalProfit >= 0 ? "$" + totalProfit.toFixed(2) : "-$" + Math.abs(totalProfit).toFixed(2)}. Add another book and log the next promo.`,
      cta: "Find next promo",
      slug: "daily-brief",
      tone: "positive",
      score: 24,
    },
  ].filter(Boolean);
}

function normalizeDecisionTone(value = "") {
  const tone = String(value || "").trim().toLowerCase();
  return tone || "neutral";
}

export function selectOperatingDecision(input = {}) {
  const {
    actionCandidates = [],
    topWorkflow = null,
    driftAlerts = [],
    nextActions = [],
    openWorkflowCount = 0,
    waitingWorkflowCount = 0,
    readinessScore = null,
    posture = null,
  } = input;

  const candidates = Array.isArray(actionCandidates)
    ? [...actionCandidates].filter(Boolean).sort((a, b) => (b.score || 0) - (a.score || 0))
    : [];
  const preferredAction = candidates[0] || null;
  const primaryAlert = Array.isArray(driftAlerts) ? driftAlerts[0] || null : null;
  const primaryBlocker = Array.isArray(nextActions) ? nextActions[0] || null : null;

  const isPlaybookCandidate = String(preferredAction?.key || "").startsWith("playbook:");
  let decision = preferredAction
    ? {
        key: preferredAction.key || "action",
        title: preferredAction.title || "Recommended action",
        body: preferredAction.body || "",
        cta: preferredAction.cta || null,
        slug: preferredAction.slug || null,
        tone: normalizeDecisionTone(preferredAction.tone),
        reason: preferredAction.key || "action",
        priority: preferredAction.score >= 90 ? "high" : "medium",
        score: preferredAction.score ?? null,
        focus: {
          type: isPlaybookCandidate ? "playbook" : "action",
          title: preferredAction.title || "Recommended action",
          detail: preferredAction.body || "",
          status: preferredAction.tone || "neutral",
          score: preferredAction.score ?? null,
          ...(preferredAction.playbookId ? { playbookId: preferredAction.playbookId } : {}),
        },
      }
    : {
        key: "idle",
        title: "Keep the loop moving.",
        body: "PromoGrind has signal, but not one dominant move yet.",
        cta: null,
        slug: null,
        tone: "neutral",
        reason: "idle",
        priority: "medium",
        score: null,
      focus: null,
    };

  if (primaryAlert?.direction === "negative") {
    decision = {
      key: "drift-alert",
      title: `Drift check: ${primaryAlert.label}`,
      body: primaryAlert.summary || "One promo lane is underperforming and needs review.",
      cta: "Review drift",
      slug: "track",
      tone: "watch",
      reason: "cold_lane",
      priority: "high",
      score: Math.round(Math.abs(primaryAlert.averageDrift || 0)),
      focus: {
        type: "drift_alert",
        title: primaryAlert.label,
        detail: primaryAlert.summary || "",
        status: primaryAlert.severity || "watch",
        score: Math.round(Math.abs(primaryAlert.averageDrift || 0)),
      },
    };
  } else if (topWorkflow && (!preferredAction || preferredAction.key === "workflow-focus" || (topWorkflow.score || 0) >= ((preferredAction.score || 0) - 3))) {
    decision = {
      key: "workflow-focus",
      title: topWorkflow.title || "Advance top workflow",
      body:
        topWorkflow.scoreSummary ||
        topWorkflow.nextStep ||
        topWorkflow.summary ||
        `${String(topWorkflow.status || "queued").replace(/_/g, " ")} workflow needs attention.`,
      cta: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "Open Track" : "Open workflow",
      slug: topWorkflow.status === "waiting" || topWorkflow.status === "placed" ? "track" : (topWorkflow.calculatorSlug || "track"),
      tone: (topWorkflow.score || 0) >= 90 ? "positive" : "watch",
      reason: "top_workflow",
      priority: topWorkflow.status === "ready" ? "high" : "medium",
      score: topWorkflow.score ?? null,
      focus: {
        type: "workflow",
        title: topWorkflow.title || "Top workflow",
        detail:
          topWorkflow.scoreSummary ||
          topWorkflow.nextStep ||
          topWorkflow.summary ||
          `${String(topWorkflow.status || "queued").replace(/_/g, " ")} workflow needs attention.`,
        status: topWorkflow.status || "queued",
        score: topWorkflow.score ?? null,
      },
    };
  } else if (!preferredAction && primaryBlocker) {
    decision = {
      key: "launch-blocker",
      title: primaryBlocker.label || primaryBlocker.title || "Resolve the next launch blocker",
      body: primaryBlocker.detail || "One manual blocker is still gating the next proof point.",
      cta: null,
      slug: null,
      tone: "watch",
      reason: "launch_blocker",
      priority: "high",
      score: null,
      focus: {
        type: "launch_blocker",
        title: primaryBlocker.label || primaryBlocker.title || "Launch blocker",
        detail: primaryBlocker.detail || "",
        status: primaryBlocker.status || "manual",
        score: null,
      },
    };
  }

  return {
    ...decision,
    followUps: [
      openWorkflowCount > 1 ? `${openWorkflowCount} workflows are still open.` : null,
      waitingWorkflowCount > 0 ? `${waitingWorkflowCount} workflows are waiting for settlement.` : null,
      Number.isFinite(readinessScore) ? `Launch posture is ${posture || "unknown"} at ${readinessScore}/100.` : null,
    ].filter(Boolean),
  };
}
