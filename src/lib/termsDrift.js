const STORAGE_KEY = "pg:termsDrift:v1";

// Tiny sync SHA-256-like hash (FNV-1a 64-bit folded) — deterministic, no crypto dep.
// We are not protecting against adversaries here; we just need stable diff detection.
function hashText(text) {
  const s = String(text || "").trim();
  if (!s) return "0";
  let h1 = 0xcbf29ce4;
  let h2 = 0x84222325;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x01000193) >>> 0;
  }
  return `${h1.toString(16).padStart(8, "0")}${h2.toString(16).padStart(8, "0")}`;
}

function readStore(storage) {
  if (!storage) return {};
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(storage, store) {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* noop */
  }
}

/**
 * Record a promo's terms hash. Returns:
 *   { status: "new" | "unchanged" | "drift", prevHash, currentHash, firstSeen, lastSeen, version }
 * - "new":       first time we have seen this promoId
 * - "unchanged": hash matches the last recorded hash
 * - "drift":     hash changed → terms have silently been updated
 *
 * Caller is responsible for surfacing drift in UI and trust receipts.
 */
export function recordTermsSnapshot({ promoId, termsText, storage, now } = {}) {
  if (!promoId) return { status: "new", prevHash: null, currentHash: null, version: 0 };
  const ts = Number.isFinite(now) ? now : (now instanceof Date ? now.getTime() : Date.now());
  const currentHash = hashText(termsText);
  const store = readStore(storage);
  const prior = store[promoId];

  if (!prior) {
    const entry = { firstSeen: ts, lastSeen: ts, hash: currentHash, version: 1, history: [] };
    store[promoId] = entry;
    writeStore(storage, store);
    return { status: "new", prevHash: null, currentHash, firstSeen: ts, lastSeen: ts, version: 1 };
  }

  if (prior.hash === currentHash) {
    prior.lastSeen = ts;
    writeStore(storage, store);
    return { status: "unchanged", prevHash: prior.hash, currentHash, firstSeen: prior.firstSeen, lastSeen: ts, version: prior.version };
  }

  // Drift detected — push prior to history, update.
  const history = Array.isArray(prior.history) ? prior.history.slice(-9) : [];
  history.push({ hash: prior.hash, replacedAt: ts });
  const updated = {
    firstSeen: prior.firstSeen,
    lastSeen: ts,
    hash: currentHash,
    version: (prior.version || 1) + 1,
    history,
  };
  store[promoId] = updated;
  writeStore(storage, store);
  return {
    status: "drift",
    prevHash: prior.hash,
    currentHash,
    firstSeen: prior.firstSeen,
    lastSeen: ts,
    version: updated.version,
  };
}

export function listDriftedPromos(storage) {
  const store = readStore(storage);
  return Object.entries(store)
    .filter(([, v]) => Array.isArray(v.history) && v.history.length > 0)
    .map(([promoId, v]) => ({ promoId, version: v.version, lastSeen: v.lastSeen, changes: v.history.length }));
}

export function _internal_hashText(text) {
  return hashText(text);
}
