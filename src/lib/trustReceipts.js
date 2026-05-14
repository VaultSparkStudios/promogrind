const TRUST_RECEIPTS_KEY = "pg_trust_receipts";
const TRUST_RECEIPT_DEDUPE_KEY = "pg_trust_receipt_dedupe";
const MAX_RECEIPTS = 20;

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function readTrustReceipts() {
  return readJson(TRUST_RECEIPTS_KEY, []);
}

export function clearTrustReceipts() {
  writeJson(TRUST_RECEIPTS_KEY, []);
}

export function recordTrustReceipt({
  type = "activity",
  title = "Account activity recorded",
  summary = "",
  stored = [],
  notStored = [],
  undo = "",
  dedupeKey = "",
  dedupeMs = 60 * 60 * 1000,
} = {}) {
  const now = Date.now();
  const dedupe = readJson(TRUST_RECEIPT_DEDUPE_KEY, {});
  const key = dedupeKey || `${type}:${title}`;
  if (key && dedupe[key] && now - dedupe[key] < dedupeMs) return null;

  const receipt = {
    id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    title,
    summary,
    stored: Array.isArray(stored) ? stored.slice(0, 5) : [],
    notStored: Array.isArray(notStored) ? notStored.slice(0, 5) : [],
    undo,
    createdAt: new Date(now).toISOString(),
  };
  const receipts = [receipt, ...readTrustReceipts()].slice(0, MAX_RECEIPTS);
  writeJson(TRUST_RECEIPTS_KEY, receipts);
  if (key) {
    writeJson(TRUST_RECEIPT_DEDUPE_KEY, { ...dedupe, [key]: now });
  }
  return receipt;
}

export function summarizeTrustReceipt(receipt = {}) {
  const parts = [];
  if (receipt.summary) parts.push(receipt.summary);
  if (receipt.stored?.length) parts.push(`Stored: ${receipt.stored.join(", ")}`);
  if (receipt.notStored?.length) parts.push(`Not stored: ${receipt.notStored.join(", ")}`);
  if (receipt.undo) parts.push(`Control: ${receipt.undo}`);
  return parts.join(" ");
}
