// Promo provenance receipts (S92 audit #9).
//
// Every settled promo emits a tamper-evident receipt that links:
//   promo terms snapshot → user decision → execution proof → settle
//   outcome → P&L. Receipts chain via previousReceiptHash so any
//   middle-edit breaks the chain.
//
// Signed with the same HMAC infrastructure as operatorPassport so a
// public verifier can confirm authenticity without learning anything
// private about the operator.

const RECEIPT_LEDGER_KEY = "pg_promo_provenance_ledger";
const PROVENANCE_VERSION = 1;
const PROVENANCE_KEY_ID = "pg-provenance-v1";

function b64urlEncode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((str.length + 3) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function importKey(secret) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  return subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

async function hashPayload(data) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(digest));
}

async function signString(secret, data) {
  const key = await importKey(secret);
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

async function verifyString(secret, data, signature) {
  const key = await importKey(secret);
  const sig = b64urlDecode(signature);
  return globalThis.crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data));
}

function readChain(storage) {
  try {
    return JSON.parse((storage || globalThis.localStorage).getItem(RECEIPT_LEDGER_KEY) || "[]") || [];
  } catch {
    return [];
  }
}

function writeChain(storage, chain) {
  try {
    (storage || globalThis.localStorage).setItem(RECEIPT_LEDGER_KEY, JSON.stringify(chain.slice(-500)));
  } catch {
    // ignore
  }
}

// Zero-PII payload — strip any identifier the operator hasn't opted to share.
function buildPayload(receipt, prevHash, now) {
  return {
    version: PROVENANCE_VERSION,
    occurredAt: receipt.occurredAt || now,
    book: receipt.book || null,
    promoType: receipt.promoType || null,
    termsHash: receipt.termsHash || null,
    decision: receipt.decision || null,        // 'executed' | 'skipped'
    stake: Number.isFinite(Number.parseFloat(receipt.stake)) ? Number.parseFloat(receipt.stake) : null,
    settledProfit: Number.isFinite(Number.parseFloat(receipt.settledProfit)) ? Number.parseFloat(receipt.settledProfit) : null,
    previousReceiptHash: prevHash,
  };
}

const PRIVATE_FIELDS = ["email", "name", "userId", "phone", "address", "ssn"];

function assertZeroPii(payload) {
  const json = JSON.stringify(payload).toLowerCase();
  for (const field of PRIVATE_FIELDS) {
    if (json.includes(`"${field}"`)) {
      throw new Error(`provenance payload contains PII field: ${field}`);
    }
  }
}

/**
 * Append a new receipt to the chain. Returns the signed receipt with
 * hash + signature + the previous hash that anchors it in the chain.
 */
export async function appendReceipt(receipt, { secret = PROVENANCE_KEY_ID, storage, now = Date.now() } = {}) {
  const chain = readChain(storage);
  const prev = chain[chain.length - 1] || null;
  const prevHash = prev?.hash || null;

  const payload = buildPayload(receipt, prevHash, now);
  assertZeroPii(payload);
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(payloadJson));
  const signature = await signString(secret, payloadB64);
  const hash = await hashPayload(`${payloadB64}.${signature}`);

  const entry = {
    payload,
    payloadB64,
    signature,
    hash,
  };
  chain.push(entry);
  writeChain(storage, chain);
  return entry;
}

/**
 * Verify the entire chain. Returns { ok, brokenAt } — brokenAt indicates
 * the first chain index where signature or hash linkage failed.
 */
export async function verifyChain({ secret = PROVENANCE_KEY_ID, storage } = {}) {
  const chain = readChain(storage);
  let prevHash = null;
  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (!entry || !entry.payloadB64 || !entry.signature) {
      return { ok: false, brokenAt: i, reason: "format" };
    }
    const sigOk = await verifyString(secret, entry.payloadB64, entry.signature);
    if (!sigOk) return { ok: false, brokenAt: i, reason: "signature" };
    if (entry.payload?.previousReceiptHash !== prevHash) {
      return { ok: false, brokenAt: i, reason: "link" };
    }
    const recomputed = await hashPayload(`${entry.payloadB64}.${entry.signature}`);
    if (recomputed !== entry.hash) return { ok: false, brokenAt: i, reason: "hash" };
    prevHash = entry.hash;
  }
  return { ok: true, length: chain.length };
}

export function readReceipts({ storage } = {}) {
  return readChain(storage);
}

export function clearReceipts({ storage } = {}) {
  writeChain(storage, []);
}

/**
 * Build the public-shareable verifier payload for a single receipt index.
 * The verifier endpoint can recompute the hash and verify the signature
 * against the public key id to confirm authenticity.
 */
export function exportReceiptForVerification(entry) {
  if (!entry || !entry.payloadB64 || !entry.signature) return null;
  return {
    keyId: PROVENANCE_KEY_ID,
    version: PROVENANCE_VERSION,
    payloadB64: entry.payloadB64,
    signature: entry.signature,
    hash: entry.hash,
  };
}
