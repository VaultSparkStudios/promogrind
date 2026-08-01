export const REALIZED_OUTCOME_FIELDS = Object.freeze([
  "actualProfit",
  "profit",
  "netProfit",
  "outcome",
]);

const COMPLETE_NUMBER = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;

/**
 * Parse a signed realized value without accepting numeric-looking garbage.
 * Currency symbols, grouping commas, surrounding whitespace, and accounting
 * parentheses are supported because the outcome UI is intentionally human
 * friendly. Missing and invalid remain null; a real zero remains 0.
 */
export function parseRealizedOutcomeValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? (Object.is(value, -0) ? 0 : value) : null;
  if (typeof value !== "string") return null;

  let normalized = value.trim();
  if (!normalized) return null;
  const accountingNegative = /^\(.*\)$/.test(normalized);
  if (accountingNegative) normalized = normalized.slice(1, -1).trim();
  normalized = normalized.replace(/[$£€¥,\s]/g, "");
  if (!COMPLETE_NUMBER.test(normalized)) return null;

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return null;
  const signed = accountingNegative ? -Math.abs(parsed) : parsed;
  return Object.is(signed, -0) ? 0 : signed;
}

/**
 * Resolve the canonical realized outcome with explicit provenance.
 * An invalid higher-authority field fails closed instead of silently falling
 * back to an older alias that may describe a different event.
 */
export function resolveRealizedOutcome(entry = {}) {
  if (!entry || typeof entry !== "object") {
    return { state: "missing", value: null, field: null, authority: null };
  }

  for (const field of REALIZED_OUTCOME_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(entry, field)) continue;
    const raw = entry[field];
    if (raw === null || raw === undefined || (typeof raw === "string" && !raw.trim())) continue;
    const value = parseRealizedOutcomeValue(raw);
    if (value === null) {
      return {
        state: "invalid",
        value: null,
        field,
        authority: field === "actualProfit" ? "actual" : "legacy",
      };
    }
    return {
      state: "resolved",
      value,
      field,
      authority: field === "actualProfit" ? "actual" : "legacy",
    };
  }

  return { state: "missing", value: null, field: null, authority: null };
}

export function realizedOutcomeValue(entry, fallback = 0) {
  const resolved = resolveRealizedOutcome(entry);
  return resolved.state === "resolved" ? resolved.value : fallback;
}

export function hasRealizedOutcome(entry) {
  return resolveRealizedOutcome(entry).state === "resolved";
}
