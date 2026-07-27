export const CAPABILITY_ORDER = Object.freeze(['cloudflareHeaders', 'brevoDomain', 'supabaseProject', 'stripeAccount', 'captureConfig']);
export const CAPABILITY_CONTRACTS = Object.freeze({
  cloudflareHeaders: { label: 'Cloudflare response-header rules', target: 'promogrind.bet' },
  brevoDomain: { label: 'Brevo sender-domain authentication', target: 'promogrind.bet' },
  supabaseProject: { label: 'PromoGrind Supabase project access', target: 'fjnpzjjyhnpmunfoycrp' },
  stripeAccount: { label: 'Stripe account mode', target: 'live' },
  captureConfig: { label: 'Production capture configuration', target: 'https://promogrind.bet/js/pg-capture.js' },
});
const STATES = new Set(['missing', 'present', 'authenticated', 'authorized']);
export const CAPABILITY_RECEIPT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
export function capabilityResult(id, input = {}) {
  const contract = CAPABILITY_CONTRACTS[id];
  if (!contract) throw new Error(`Unknown launch capability: ${id}`);
  const state = STATES.has(input.state) ? input.state : 'missing';
  return { id, label: contract.label, target: contract.target, state, ready: state === 'authorized' && input.targetMatch !== false, targetMatch: input.targetMatch ?? null, httpStatus: Number.isInteger(input.httpStatus) ? input.httpStatus : null, reason: String(input.reason || ''), checkedAt: input.checkedAt || new Date().toISOString() };
}
export function summarizeCapabilities(results) {
  const rows = CAPABILITY_ORDER.map((id) => results.find((row) => row.id === id) || capabilityResult(id));
  return { total: rows.length, ready: rows.filter((row) => row.ready).length, missing: rows.filter((row) => row.state === 'missing').length, presentOnly: rows.filter((row) => row.state === 'present').length, authenticatedOnly: rows.filter((row) => row.state === 'authenticated').length, unauthorized: rows.filter((row) => !row.ready && row.state !== 'missing').length };
}
export function buildCapabilityReceipt(results, checkedAt = new Date().toISOString()) {
  const normalized = CAPABILITY_ORDER.map((id) => { const row = results.find((entry) => entry.id === id); return row ? capabilityResult(id, { ...row, checkedAt: row.checkedAt || checkedAt }) : capabilityResult(id, { checkedAt }); });
  return { schemaVersion: 1, checkedAt, project: 'promogrind', summary: summarizeCapabilities(normalized), capabilities: normalized };
}

export function assessCapabilityReceipt(receipt, now = Date.now()) {
  const checked = Date.parse(receipt?.checkedAt || '');
  const ageMs = Number.isFinite(checked) ? Math.max(0, now - checked) : Number.POSITIVE_INFINITY;
  const fresh = ageMs <= CAPABILITY_RECEIPT_MAX_AGE_MS;
  return { available: Array.isArray(receipt?.capabilities), fresh, ageMs, trustedReady: fresh ? Number(receipt?.summary?.ready || 0) : 0 };
}
