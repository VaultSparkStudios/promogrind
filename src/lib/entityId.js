const counters = new Map();

function normalizeKind(kind) {
  const value = String(kind || "entity")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return value || "entity";
}

function randomHex(cryptoLike, random) {
  try {
    if (typeof cryptoLike?.getRandomValues === "function") {
      const bytes = new Uint8Array(10);
      cryptoLike.getRandomValues(bytes);
      return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
    }
  } catch {
    // Fall through to the entropy-bearing compatibility path.
  }
  const value = Math.max(0, Math.min(0.999999999999, Number(random?.() ?? Math.random())));
  return Math.floor(value * Number.MAX_SAFE_INTEGER).toString(16).padStart(14, "0");
}

/**
 * Collision-resistant browser entity identity with an inspectable type prefix.
 * Timestamps remain metadata; they are never the sole identity authority.
 */
export function createEntityId(kind, options = {}) {
  const type = normalizeKind(kind);
  const cryptoLike = options.crypto ?? globalThis.crypto;
  try {
    if (typeof cryptoLike?.randomUUID === "function") {
      return `pg-${type}-${cryptoLike.randomUUID()}`;
    }
  } catch {
    // Use the monotonic fallback below.
  }

  const now = Number.isFinite(options.now) ? Math.floor(options.now) : Date.now();
  const counterKey = `${type}:${now}`;
  const counter = (counters.get(counterKey) || 0) + 1;
  counters.set(counterKey, counter);
  if (counters.size > 256) counters.delete(counters.keys().next().value);
  return `pg-${type}-${now.toString(36)}-${counter.toString(36)}-${randomHex(cryptoLike, options.random)}`;
}

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === "object") {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = stableSort(value[key]);
      return result;
    }, {});
  }
  return value;
}

function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const byte of new TextEncoder().encode(value)) {
    hash ^= BigInt(byte);
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}

/**
 * Stable identity for repeatable imports. `occurrence` distinguishes duplicate
 * rows while keeping a second import of the same ordered file idempotent.
 */
export function createImportEntityId(kind, namespace, record, occurrence = 0) {
  const type = normalizeKind(kind);
  const source = normalizeKind(namespace || "import");
  const payload = JSON.stringify({ source, occurrence, record: stableSort(record) });
  return `pg-${type}-${source}-${fnv1a64(payload)}`;
}

export function preserveOrCreateEntityId(existing, kind, options = {}) {
  const current = String(existing ?? "").trim();
  return current || createEntityId(kind, options);
}

export function isCanonicalEntityId(value, kind = null) {
  const prefix = kind ? `pg-${normalizeKind(kind)}-` : "pg-";
  return typeof value === "string" && value.startsWith(prefix) && value.length > prefix.length + 6;
}

export function resetEntityIdStateForTests() {
  counters.clear();
}
