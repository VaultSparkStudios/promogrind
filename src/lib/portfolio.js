function toNumber(value) {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function confidenceToProb(confidence) {
  if (confidence === "high") return 0.82;
  if (confidence === "medium") return 0.65;
  if (confidence === "low") return 0.45;
  return 0.60;
}

function explicitAdvisorProbability(workflow) {
  if (workflow?.source !== "promo_advisor") return null;
  if (workflow.advisorPosture !== "act" || !String(workflow.probabilityBasis || "").trim()) return null;
  const probability = Number.parseFloat(workflow.positiveOutcomeProbability);
  return Number.isFinite(probability) && probability > 0 && probability < 1 ? probability : null;
}

function kellyFraction(p, b) {
  if (b <= 0 || p <= 0 || p >= 1) return 0;
  const q = 1 - p;
  const f = (p * b - q) / b;
  return Math.max(0, f);
}

const MAX_SINGLE_FRACTION = 0.35;
const MIN_EV_THRESHOLD = 2;

export function buildPortfolioAllocation(workflows = [], bankroll = 0) {
  const bank = toNumber(bankroll) ?? 0;
  if (bank <= 0 || !workflows.length) return { allocations: [], totalEv: 0, totalAllocated: 0 };

  const candidates = workflows
    .filter((wf) => {
      const ev = toNumber(wf.expectedProfit);
      const advisorEligible = wf.source !== "promo_advisor" || explicitAdvisorProbability(wf) !== null;
      return (
        ["ready", "queued"].includes(wf.status || "") &&
        ev !== null &&
        ev >= MIN_EV_THRESHOLD &&
        advisorEligible
      );
    })
    .map((wf) => {
      const ev = toNumber(wf.expectedProfit) ?? 0;
      const score = Math.max(0, Math.min(100, Number(wf.opportunityScore || wf.score || 50)));
      const advisorProbability = explicitAdvisorProbability(wf);
      const p = advisorProbability ?? Math.min(0.92, confidenceToProb(wf.confidence) * (0.7 + (score / 100) * 0.3));
      // Implied "odds" b: treating ev as the profit on a nominal $100 stake equivalent
      // b = ev / 100 — scales Kelly fraction to reasonable bet sizes
      const b = ev / 100;
      const raw = kellyFraction(p, b);
      // Cap per-position at MAX_SINGLE_FRACTION of bankroll
      const capped = Math.min(raw, MAX_SINGLE_FRACTION);
      return { wf, ev, p, b, raw, kelly: capped };
    })
    .filter((c) => c.kelly > 0)
    .sort((a, b) => b.kelly - a.kelly);

  if (!candidates.length) return { allocations: [], totalEv: 0, totalAllocated: 0 };

  // Scale down if sum of kelly fractions exceeds 1 (full bankroll)
  const sumKelly = candidates.reduce((s, c) => s + c.kelly, 0);
  const scaleFactor = sumKelly > 1 ? 1 / sumKelly : 1;

  let remaining = bank;
  const allocations = [];
  let totalEv = 0;

  for (const c of candidates) {
    if (remaining <= 0) break;
    const fraction = c.kelly * scaleFactor;
    const rawAlloc = Math.round(fraction * bank * 100) / 100;
    const allocate = Math.min(rawAlloc, remaining);
    if (allocate < 1) continue;

    const projectedEv = (allocate / 100) * c.ev;
    totalEv += projectedEv;
    remaining -= allocate;

    const promoType = c.wf.promoType || c.wf.calculatorSlug || "promo";
    const book = c.wf.book ? ` @ ${c.wf.book}` : "";
    allocations.push({
      workflowId: c.wf.id,
      title: c.wf.title || promoType,
      calculatorSlug: c.wf.calculatorSlug || null,
      book: c.wf.book || null,
      allocate,
      ev: Math.round(projectedEv * 100) / 100,
      kelly: Math.round(c.kelly * 1000) / 1000,
      confidence: c.wf.confidence || "medium",
      reason: c.wf.source === "promo_advisor"
        ? `${Math.round(c.p * 100)}% explicit modeled basis${book} · est. $${c.ev.toFixed(0)} EV`
        : `${Math.round(c.p * 100)}% confidence${book} · est. $${c.ev.toFixed(0)} EV`,
    });
  }

  return {
    allocations,
    totalEv: Math.round(totalEv * 100) / 100,
    totalAllocated: Math.round((bank - remaining) * 100) / 100,
    bankroll: bank,
  };
}
