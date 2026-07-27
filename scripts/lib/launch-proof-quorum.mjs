const SOURCE_TYPES = new Set(['provider-api', 'deployment', 'automated-smoke', 'human-observation']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/;
const UNSAFE = [
  /\b(sk_live_|sk_test_|sk-ant-|ghp_|github_pat_)[A-Za-z0-9_-]+/i,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
  /(?:access|refresh|service[_-]?role)[_-]?token\s*[:=]/i,
  /password\s*[:=]/i,
  /[?&](?:token|code|access_token|refresh_token)=/i,
];

export function criteriaForProof(proof = {}) {
  if (Array.isArray(proof.criteria)) {
    return proof.criteria
      .filter((criterion) => criterion && criterion.id && criterion.label)
      .map((criterion) => ({ id: String(criterion.id), label: String(criterion.label), required: criterion.required !== false }));
  }
  return (Array.isArray(proof.evidenceRequired) ? proof.evidenceRequired : []).map((label, index) => ({
    id: stableCriterionId(label, index),
    label: String(label),
    required: true,
  }));
}

export function stableCriterionId(label, index = 0) {
  const id = String(label || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return id || `criterion-${index + 1}`;
}

export function validateReceipt(receipt, proof, { expectedTarget = null } = {}) {
  const errors = [];
  const criteria = criteriaForProof(proof);
  const criterion = criteria.find((entry) => entry.id === receipt?.criterionId);
  if (!criterion) errors.push(`unknown criterion: ${receipt?.criterionId || '(missing)'}`);
  if (!SOURCE_TYPES.has(receipt?.source)) errors.push(`unsupported source: ${receipt?.source || '(missing)'}`);
  if (!String(receipt?.target || '').trim()) errors.push('target is required');
  if (expectedTarget && receipt?.target !== expectedTarget) errors.push(`target mismatch: expected ${expectedTarget}`);
  if (!ISO_DATE.test(String(receipt?.observedAt || ''))) errors.push('observedAt must be an ISO timestamp');
  if (!String(receipt?.verifier || '').trim()) errors.push('verifier is required');
  if (!String(receipt?.detail || '').trim()) errors.push('detail is required');
  const serialized = JSON.stringify(receipt || {});
  if (UNSAFE.some((pattern) => pattern.test(serialized))) errors.push('receipt contains secret or token-shaped data');
  return { ok: errors.length === 0, errors, criterion };
}

export function evaluateProof(proof = {}, { expectedTarget = proof.target || null } = {}) {
  const criteria = criteriaForProof(proof);
  const required = criteria.filter((criterion) => criterion.required !== false);
  const receipts = Array.isArray(proof.receipts) ? proof.receipts : [];
  const validReceipts = [];
  const rejectedReceipts = [];
  const covered = new Set();

  for (const receipt of receipts) {
    const validation = validateReceipt(receipt, { ...proof, criteria }, { expectedTarget });
    if (!validation.ok) {
      rejectedReceipts.push({ receipt, errors: validation.errors });
      continue;
    }
    validReceipts.push(receipt);
    covered.add(receipt.criterionId);
  }

  const requiredCovered = required.filter((criterion) => covered.has(criterion.id));
  const complete = required.length > 0 && requiredCovered.length === required.length;
  const status = complete ? 'complete' : proof.blocking === false ? (proof.status === 'partial' ? 'partial' : 'pending') : 'pending';
  return {
    status,
    complete,
    criteria,
    requiredCount: required.length,
    coveredCount: requiredCovered.length,
    missingCriteria: required.filter((criterion) => !covered.has(criterion.id)),
    validReceipts,
    rejectedReceipts,
  };
}

export function appendReceipts(document, proofKey, receipts, { expectedTarget = null } = {}) {
  const proof = document?.proofs?.[proofKey];
  if (!proof) throw new Error(`unknown proof: ${proofKey}`);
  const existing = Array.isArray(proof.receipts) ? proof.receipts : [];
  const next = [...existing];
  for (const receipt of receipts) {
    const validation = validateReceipt(receipt, proof, { expectedTarget: expectedTarget || proof.target || null });
    if (!validation.ok) throw new Error(validation.errors.join('; '));
    const duplicate = next.some((entry) =>
      entry.criterionId === receipt.criterionId
      && entry.source === receipt.source
      && entry.target === receipt.target
      && entry.observedAt === receipt.observedAt
    );
    if (!duplicate) next.push(receipt);
  }
  proof.receipts = next;
  const evaluation = evaluateProof(proof, { expectedTarget: expectedTarget || proof.target || null });
  proof.status = evaluation.status;
  proof.lastEvaluatedAt = new Date().toISOString();
  document.schemaVersion = '2.0';
  document.lastUpdated = new Date().toISOString().slice(0, 10);
  return evaluation;
}

export function reconcileLaunchProofDocument(document) {
  const next = structuredClone(document || { proofs: {} });
  next.schemaVersion = '2.0';
  for (const proof of Object.values(next.proofs || {})) {
    proof.criteria = criteriaForProof(proof);
    delete proof.evidenceRequired;
    proof.receipts = Array.isArray(proof.receipts) ? proof.receipts : [];
    proof.status = evaluateProof(proof).status;
  }
  return next;
}

export function receiptsFromSteps(steps, { source, target, verifier, observedAt = new Date().toISOString() }) {
  return steps
    .filter((step) => step.answer === 'y' && step.criterionId)
    .map((step) => ({
      criterionId: step.criterionId,
      source,
      target,
      observedAt,
      verifier,
      detail: step.detail || step.q || `Observed ${step.id}`,
    }));
}
