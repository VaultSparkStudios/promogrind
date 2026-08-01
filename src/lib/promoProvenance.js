// Local decision-evidence chain (v3).
//
// This is a tamper-evident, self-attested browser ledger. It links the source
// calculation/observation to each workflow transition without storing freeform
// notes or personal identifiers. It proves local continuity, not independent
// authenticity, sportsbook execution, or outcome truth.

const RECEIPT_LEDGER_KEY = "pg_promo_integrity_ledger_v3";
const PROVENANCE_VERSION = 3;
const DOMAIN = "promogrind-local-decision-evidence-v3:";
const EVENT_TYPES = new Set(["queued", "placed", "skipped", "settled", "revised"]);
const PRIVATE_FIELDS = ["email", "name", "userId", "phone", "address", "ssn", "note"];

function b64urlEncode(bytes) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      if (value[key] !== undefined) result[key] = stable(value[key]);
      return result;
    }, {});
  }
  return value;
}

function encodePayload(value) {
  return b64urlEncode(new TextEncoder().encode(JSON.stringify(stable(value))));
}

async function digest(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("WebCrypto unavailable");
  const bytes = await subtle.digest("SHA-256", new TextEncoder().encode(value));
  return b64urlEncode(new Uint8Array(bytes));
}

async function evidenceRef(value, domain) {
  if (typeof value === "string" && /^[a-z0-9-]+:[A-Za-z0-9_-]{8,}$/i.test(value)) return value;
  if (value === null || value === undefined || value === "") return null;
  return `sha256:${await digest(`${DOMAIN}${domain}:${JSON.stringify(stable(value))}`)}`;
}

function storageFor(storage) {
  return storage || globalThis.localStorage;
}

function readChain(storage) {
  try {
    const value = JSON.parse(storageFor(storage).getItem(RECEIPT_LEDGER_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeChain(storage, chain) {
  try {
    storageFor(storage).setItem(RECEIPT_LEDGER_KEY, JSON.stringify(chain.slice(-500)));
    return true;
  } catch {
    return false;
  }
}

function finiteNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function assertZeroPii(payload) {
  const json = JSON.stringify(payload).toLowerCase();
  for (const field of PRIVATE_FIELDS) {
    if (json.includes(`"${field.toLowerCase()}"`)) throw new Error(`decision-evidence payload contains private field: ${field}`);
  }
}

async function buildPayload(receipt, chain, now) {
  const workflowId = String(receipt.workflowId || receipt.id || "").trim();
  if (!workflowId) throw new Error("workflowId is required for decision evidence");
  const eventType = String(receipt.eventType || receipt.status || receipt.decision || "revised").toLowerCase();
  if (!EVENT_TYPES.has(eventType)) throw new Error(`unsupported decision-evidence event: ${eventType}`);
  const priorWorkflowEntry = [...chain].reverse().find((entry) => entry?.payload?.workflowId === workflowId);
  const occurredAt = receipt.occurredAt || new Date(now).toISOString();
  const sourceEvidence = receipt.sourceEvidence || {
    calculatorKey: receipt.calculatorKey || null,
    promoType: receipt.promoType || null,
    expectedProfit: finiteNumber(receipt.expectedProfit),
    termsHash: receipt.termsHash || null,
  };
  return {
    version: PROVENANCE_VERSION,
    attestation: "self-attested",
    scope: "local-decision-continuity",
    workflowId,
    eventType,
    occurredAt,
    idempotencyKey: receipt.idempotencyKey || `${workflowId}:${eventType}:${occurredAt}`,
    sourceEvidenceRef: await evidenceRef(receipt.sourceEvidenceRef || sourceEvidence, "source"),
    operatorContextRef: await evidenceRef(receipt.privateNote || receipt.note, "operator-context"),
    calculatorKey: receipt.calculatorKey || null,
    promoType: receipt.promoType || null,
    book: receipt.book || null,
    expectedProfit: finiteNumber(receipt.expectedProfit ?? receipt.stake),
    realizedProfit: finiteNumber(receipt.realizedProfit ?? receipt.actualProfit ?? receipt.settledProfit),
    reasonCode: receipt.reasonCode || receipt.skipReason || receipt.frictionReason || null,
    repeatIntent: ["yes", "maybe", "no"].includes(receipt.repeatIntent || receipt.wouldRepeat) ? (receipt.repeatIntent || receipt.wouldRepeat) : null,
    executionMinutes: finiteNumber(receipt.executionMinutes),
    previousReceiptHash: chain.at(-1)?.hash || null,
    workflowPreviousHash: priorWorkflowEntry?.hash || null,
  };
}

let appendQueue = Promise.resolve();
let ledgerGeneration = 0;

async function appendInternal(receipt, { storage, now = Date.now() } = {}, generation = ledgerGeneration) {
  const chain = readChain(storage);
  const payload = await buildPayload(receipt, chain, now);
  const duplicate = chain.find((entry) => entry?.payload?.idempotencyKey === payload.idempotencyKey);
  if (duplicate) return duplicate;
  assertZeroPii(payload);
  const payloadB64 = encodePayload(payload);
  const checksum = await digest(`${DOMAIN}${payloadB64}`);
  const hash = await digest(`${DOMAIN}${payload.previousReceiptHash || "head"}.${payloadB64}.${checksum}`);
  const entry = { contract: "self-attested-local-decision-evidence", payload, payloadB64, checksum, hash };
  if (generation !== ledgerGeneration) throw new Error("decision-evidence append superseded by clear");
  chain.push(entry);
  if (!writeChain(storage, chain)) throw new Error("decision-evidence storage unavailable");
  return entry;
}

export function appendDecisionEvidence(receipt, options = {}) {
  const generation = ledgerGeneration;
  const operation = appendQueue.then(() => appendInternal(receipt, options, generation));
  appendQueue = operation.catch(() => {});
  return operation;
}

// Backward-compatible API name; callers receive the stronger v3 contract.
export function appendReceipt(receipt, options = {}) {
  return appendDecisionEvidence(receipt, options);
}

export async function verifyChain({ storage } = {}) {
  const chain = readChain(storage);
  let previousReceiptHash = null;
  const workflowHeads = new Map();
  for (let index = 0; index < chain.length; index += 1) {
    const entry = chain[index];
    if (!entry || entry.contract !== "self-attested-local-decision-evidence" || !entry.payloadB64 || !entry.checksum || !entry.hash) {
      return { ok: false, brokenAt: index, reason: "format" };
    }
    const payload = entry.payload;
    if (payload?.version !== PROVENANCE_VERSION || payload?.attestation !== "self-attested" || !EVENT_TYPES.has(payload?.eventType)) {
      return { ok: false, brokenAt: index, reason: "version" };
    }
    if (payload.previousReceiptHash !== previousReceiptHash) return { ok: false, brokenAt: index, reason: "global-link" };
    if ((payload.workflowPreviousHash || null) !== (workflowHeads.get(payload.workflowId) || null)) {
      return { ok: false, brokenAt: index, reason: "workflow-link" };
    }
    if (encodePayload(payload) !== entry.payloadB64) return { ok: false, brokenAt: index, reason: "payload-mismatch" };
    const checksum = await digest(`${DOMAIN}${entry.payloadB64}`);
    if (checksum !== entry.checksum) return { ok: false, brokenAt: index, reason: "checksum" };
    const hash = await digest(`${DOMAIN}${previousReceiptHash || "head"}.${entry.payloadB64}.${entry.checksum}`);
    if (hash !== entry.hash) return { ok: false, brokenAt: index, reason: "hash" };
    previousReceiptHash = entry.hash;
    workflowHeads.set(payload.workflowId, entry.hash);
  }
  return {
    ok: true,
    length: chain.length,
    workflows: workflowHeads.size,
    attestation: "self-attested",
    integrity: "sha256-global-and-workflow-checksum-chain",
  };
}

export function readReceipts({ storage } = {}) { return readChain(storage); }
export function clearReceipts({ storage } = {}) {
  ledgerGeneration += 1;
  appendQueue = Promise.resolve();
  return writeChain(storage, []);
}

export function exportReceiptForVerification(entry) {
  if (!entry || !entry.payloadB64 || !entry.checksum || !entry.hash) return null;
  return {
    version: PROVENANCE_VERSION,
    attestation: "self-attested",
    scope: "local-decision-continuity",
    integrity: "sha256-global-and-workflow-checksum-chain",
    payloadB64: entry.payloadB64,
    checksum: entry.checksum,
    hash: entry.hash,
  };
}

export const DECISION_EVIDENCE_STORAGE_KEY = RECEIPT_LEDGER_KEY;
