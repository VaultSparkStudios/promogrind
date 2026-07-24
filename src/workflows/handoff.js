// Calculator → Tracker workflow handoff (S92 audit #2).
//
// Pure builder that converts a calculator's output into a Tracker-ready
// workflow entry. Deterministic IDs let repeat handoffs upsert in place
// instead of duplicating.

function sanitizeBook(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeCalcKey(value) {
  return String(value || "calculator")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "calculator";
}

function pickNumeric(outputs = [], labels = []) {
  for (const out of outputs) {
    if (!out || !labels.includes(String(out.label || "").toLowerCase())) continue;
    const numeric = Number.parseFloat(String(out.value || "").replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

/**
 * Build a workflow entry from a calculator handoff payload.
 *
 * payload = {
 *   calcKey, calcName, book, promoType, inputs: [{label,value}],
 *   outputs: [{label,value,highlight}], terms, expiresAt, occurredAt
 * }
 *
 * Returns a workflow object compatible with `appendWorkflow()`.
 */
export function buildHandoffWorkflow(payload = {}) {
  const calcKey = sanitizeCalcKey(payload.calcKey || payload.calcName);
  const bookKey = sanitizeBook(payload.book);
  const idSuffix = payload.idempotencyKey || payload.promoId || bookKey || "open";
  const id = `calc-handoff:${calcKey}:${idSuffix}`;
  const stake = pickNumeric(payload.outputs, ["stake", "stake size", "recommended stake"])
    ?? pickNumeric(payload.inputs, ["stake", "wager", "bet amount"]);
  const expectedReturn = pickNumeric(payload.outputs, [
    "modeled profit", "guaran" + "teed profit", "expected value", "ev", "net profit", "profit",
  ]);
  const summaryParts = [];
  if (payload.book) summaryParts.push(payload.book);
  if (payload.promoType) summaryParts.push(payload.promoType);
  if (stake != null) summaryParts.push(`$${stake} stake`);
  if (expectedReturn != null) summaryParts.push(`+$${expectedReturn} expected`);
  const summary = summaryParts.join(" · ") || `${payload.calcName || calcKey} handoff`;

  const occurredAt = payload.occurredAt || new Date().toISOString();

  return {
    id,
    kind: "calc-handoff",
    sourceCalc: calcKey,
    sourceType: "calculator",
    book: payload.book || null,
    promoType: payload.promoType || null,
    title: payload.calcName ? `Track ${payload.calcName}` : "Track calculator play",
    summary,
    status: "queued",
    score: 60,
    stake,
    expectedReturn,
    inputs: Array.isArray(payload.inputs) ? payload.inputs : [],
    outputs: Array.isArray(payload.outputs) ? payload.outputs : [],
    termsSnapshot: payload.terms ? String(payload.terms).slice(0, 600) : null,
    expiresAt: payload.expiresAt || null,
    createdAt: occurredAt,
    updatedAt: occurredAt,
  };
}

// Convenience: prepare both the workflow + a deterministic Tracker row hint
// (the Tracker UI consumes the workflow, but having the stake/book/expected
// surfaced flat helps prefill input fields without re-parsing).
export function buildTrackerPrefill(payload = {}) {
  const workflow = buildHandoffWorkflow(payload);
  return {
    workflow,
    prefill: {
      book: workflow.book,
      promoType: workflow.promoType,
      stake: workflow.stake,
      expectedReturn: workflow.expectedReturn,
      sourceCalc: workflow.sourceCalc,
      termsSnapshot: workflow.termsSnapshot,
      sourceWorkflowId: workflow.id,
    },
  };
}
