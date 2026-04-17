import { normalizeWorkflowEntry, normalizePromoType, formatPromoTypeLabel } from "../promograph/index.js";

export const PLAYBOOKS = [
  {
    id: "bonus-bet-convert",
    name: "Bonus Bet Conversion",
    summary: "Convert free/bonus bets into guaranteed cash via a hedge on a second book.",
    promoTypes: ["bonus_bet"],
    bankrollMin: 200,
    steps: [
      { calculatorSlug: "bonus-bet", title: "Run Bonus Bet Converter", note: "Pick a +400 or better favorite to maximize conversion rate." },
      { calculatorSlug: "hedge", title: "Lock the hedge", note: "Place the hedge on a book you already hold before the leg settles." },
    ],
    tone: "positive",
  },
  {
    id: "profit-boost-stack",
    name: "Profit Boost Stack",
    summary: "Deploy profit/odds boosts on hedgeable favorites for realized edge.",
    promoTypes: ["profit_boost"],
    bankrollMin: 150,
    steps: [
      { calculatorSlug: "profit-boost", title: "Size the boost", note: "Boosts on -150 to +200 lines convert best into realized EV." },
      { calculatorSlug: "hedge", title: "Hedge the boosted leg", note: "Lock the edge on a separate book before settlement." },
    ],
    tone: "positive",
  },
  {
    id: "first-bet-safety",
    name: "First-Bet Safety Net",
    summary: "Treat first-bet refund offers as matched risk-free attempts.",
    promoTypes: ["safety_net"],
    bankrollMin: 500,
    steps: [
      { calculatorSlug: "first-bet", title: "Size the first bet", note: "Stake to the promo cap on a +200 to +350 line for best refund EV." },
      { calculatorSlug: "bonus-bet", title: "Convert the refund if it loses", note: "Any bonus-bet refund should be hedged promptly." },
    ],
    tone: "watch",
  },
  {
    id: "deposit-match-build",
    name: "Deposit Match Build",
    summary: "New-book deposit match deployed gradually for best rollover EV.",
    promoTypes: ["deposit_match"],
    bankrollMin: 1000,
    steps: [
      { calculatorSlug: "deposit-match", title: "Compute match + rollover", note: "Prefer the lowest-rollover product per dollar matched." },
      { calculatorSlug: "parlay", title: "Low-vig rollover", note: "Grind rollover through close-to-pinnacle pricing, not correlated parlays." },
    ],
    tone: "watch",
  },
];

function toNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function matchPlaybooks(appData = {}, context = {}) {
  const bankroll = toNumber(context.bankroll ?? appData.bankroll);
  const doneMap = appData.done || {};
  const activeBooks = Object.entries(doneMap).filter(([, done]) => !!done).map(([book]) => book);
  const workflowPromoTypes = new Set(
    (Array.isArray(appData.workflowInbox) ? appData.workflowInbox : [])
      .map((wf) => normalizePromoType(wf?.promoType))
      .filter(Boolean),
  );

  const matches = PLAYBOOKS.map((playbook) => {
    const reasons = [];
    let fitScore = 60;

    const bankrollOk = bankroll === null || playbook.bankrollMin == null || bankroll >= playbook.bankrollMin;
    if (bankrollOk) {
      reasons.push({ tone: "positive", text: bankroll === null ? "bankroll unset" : `bankroll ≥ $${playbook.bankrollMin}` });
      if (bankroll !== null && playbook.bankrollMin != null && bankroll >= playbook.bankrollMin * 2) fitScore += 10;
    } else {
      fitScore -= 30;
      reasons.push({ tone: "risk", text: `needs $${playbook.bankrollMin} bankroll` });
    }

    if (activeBooks.length >= 2) {
      fitScore += 15;
      reasons.push({ tone: "positive", text: `${activeBooks.length} active books` });
    } else if (activeBooks.length === 1) {
      reasons.push({ tone: "watch", text: "one active book" });
    } else {
      fitScore -= 20;
      reasons.push({ tone: "risk", text: "no active books" });
    }

    const overlap = playbook.promoTypes.some((type) => workflowPromoTypes.has(type));
    if (overlap) {
      fitScore += 20;
      reasons.push({ tone: "positive", text: `matches open ${formatPromoTypeLabel(playbook.promoTypes[0])} work` });
    }

    return { playbook, fitScore: Math.max(0, Math.min(100, fitScore)), reasons, applicable: bankrollOk && activeBooks.length > 0 };
  }).sort((a, b) => b.fitScore - a.fitScore);

  return { matches, top: matches.filter((m) => m.applicable).slice(0, 3) };
}

export function playbookToWorkflows(playbook, context = {}) {
  if (!playbook || !Array.isArray(playbook.steps)) return [];
  const now = new Date().toISOString();
  const promoType = playbook.promoTypes?.[0] || "other";
  return playbook.steps.map((step, index) => normalizeWorkflowEntry({
    id: `playbook-${playbook.id}-${Date.now()}-${index}`,
    title: step.title,
    summary: step.note,
    note: step.note,
    calculatorSlug: step.calculatorSlug,
    calculatorKey: step.calculatorSlug || `playbook-${playbook.id}`,
    calculatorLabel: playbook.name,
    promoType,
    status: index === 0 ? "ready" : "queued",
    source: `playbook:${playbook.id}`,
    book: context.book || "",
    opsTags: ["playbook", playbook.id],
    createdAt: now,
    updatedAt: now,
  }));
}
