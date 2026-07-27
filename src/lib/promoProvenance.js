// Local promo integrity chain (v2).
//
// This chain detects accidental edits and broken linkage in the current local
// ledger. It is self-attested: browser code has no private signing authority,
// so the receipt must never be described as independent authenticity proof.

const RECEIPT_LEDGER_KEY = "pg_promo_integrity_ledger_v2";
const PROVENANCE_VERSION = 2;
const DOMAIN = "promogrind-local-integrity-v2:";

function b64urlEncode(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function digest(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return b64urlEncode(new Uint8Array(bytes));
}

function readChain(storage) {
  try {
    const value = JSON.parse((storage || globalThis.localStorage).getItem(RECEIPT_LEDGER_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeChain(storage, chain) {
  try { (storage || globalThis.localStorage).setItem(RECEIPT_LEDGER_KEY, JSON.stringify(chain.slice(-500))); } catch {}
}

function buildPayload(receipt, previousReceiptHash, now) {
  return {
    version: PROVENANCE_VERSION,
    attestation: "self-attested",
    occurredAt: receipt.occurredAt || new Date(now).toISOString(),
    book: receipt.book || null,
    promoType: receipt.promoType || null,
    termsHash: receipt.termsHash || null,
    decision: receipt.decision || null,
    stake: Number.isFinite(Number.parseFloat(receipt.stake)) ? Number.parseFloat(receipt.stake) : null,
    settledProfit: Number.isFinite(Number.parseFloat(receipt.settledProfit)) ? Number.parseFloat(receipt.settledProfit) : null,
    previousReceiptHash,
  };
}

const PRIVATE_FIELDS = ["email", "name", "userId", "phone", "address", "ssn"];
function assertZeroPii(payload) {
  const json = JSON.stringify(payload).toLowerCase();
  for (const field of PRIVATE_FIELDS) {
    if (json.includes(`"${field.toLowerCase()}"`)) throw new Error(`integrity payload contains PII field: ${field}`);
  }
}

export async function appendReceipt(receipt, { storage, now = Date.now() } = {}) {
  const chain = readChain(storage);
  const previousReceiptHash = chain.at(-1)?.hash || null;
  const payload = buildPayload(receipt, previousReceiptHash, now);
  assertZeroPii(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const checksum = await digest(`${DOMAIN}${payloadB64}`);
  const hash = await digest(`${DOMAIN}${previousReceiptHash || "head"}.${payloadB64}.${checksum}`);
  const entry = { contract: "self-attested-local-integrity", payload, payloadB64, checksum, hash };
  chain.push(entry);
  writeChain(storage, chain);
  return entry;
}

export async function verifyChain({ storage } = {}) {
  const chain = readChain(storage);
  let previousReceiptHash = null;
  for (let index = 0; index < chain.length; index++) {
    const entry = chain[index];
    if (!entry || entry.contract !== "self-attested-local-integrity" || !entry.payloadB64 || !entry.checksum || !entry.hash) {
      return { ok: false, brokenAt: index, reason: "format" };
    }
    if (entry.payload?.version !== PROVENANCE_VERSION || entry.payload?.attestation !== "self-attested") {
      return { ok: false, brokenAt: index, reason: "version" };
    }
    if (entry.payload.previousReceiptHash !== previousReceiptHash) return { ok: false, brokenAt: index, reason: "link" };
    const checksum = await digest(`${DOMAIN}${entry.payloadB64}`);
    if (checksum !== entry.checksum) return { ok: false, brokenAt: index, reason: "checksum" };
    const hash = await digest(`${DOMAIN}${previousReceiptHash || "head"}.${entry.payloadB64}.${entry.checksum}`);
    if (hash !== entry.hash) return { ok: false, brokenAt: index, reason: "hash" };
    previousReceiptHash = entry.hash;
  }
  return { ok: true, length: chain.length, attestation: "self-attested", integrity: "checksum-chain" };
}

export function readReceipts({ storage } = {}) { return readChain(storage); }
export function clearReceipts({ storage } = {}) { writeChain(storage, []); }
export function exportReceiptForVerification(entry) {
  if (!entry || !entry.payloadB64 || !entry.checksum || !entry.hash) return null;
  return {
    version: PROVENANCE_VERSION,
    attestation: "self-attested",
    integrity: "sha256-checksum-chain",
    payloadB64: entry.payloadB64,
    checksum: entry.checksum,
    hash: entry.hash,
  };
}
