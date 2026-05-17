const LOCAL_DATA_KEYS = [
  { key: "pg_app_data", label: "Operator data", kind: "core" },
  { key: "pg_trust_receipts", label: "Trust receipts", kind: "trust" },
  { key: "pg_missions", label: "Mission progress", kind: "engagement" },
  { key: "pg_currency", label: "Currency preference", kind: "preference" },
  { key: "pg_theme", label: "Theme preference", kind: "preference" },
  { key: "pg_compact_mode", label: "Compact mode", kind: "preference" },
  { key: "pg_bankroll", label: "Bankroll preference", kind: "operator" },
  { key: "pg_trust_receipt_dedupe", label: "Receipt dedupe cache", kind: "trust" },
];

const PREFIXES = [
  { prefix: "pg_used_", label: "Calculator mission flags", kind: "engagement" },
  { prefix: "pg_advisor_", label: "Advisor mission flags", kind: "engagement" },
  { prefix: "pg_insights_", label: "Insights mission flags", kind: "engagement" },
  { prefix: "pg_brief_", label: "Brief mission flags", kind: "engagement" },
  { prefix: "pg_book_", label: "Book mission flags", kind: "engagement" },
];

function safeStorage(storage = globalThis.localStorage) {
  return storage || null;
}

function readRaw(storage, key) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function listStorageKeys(storage) {
  const keys = [];
  try {
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) keys.push(key);
    }
  } catch {}
  return keys;
}

function classifyKey(key) {
  const direct = LOCAL_DATA_KEYS.find((entry) => entry.key === key);
  if (direct) return direct;
  const prefixed = PREFIXES.find((entry) => key.startsWith(entry.prefix));
  if (prefixed) return { key, label: prefixed.label, kind: prefixed.kind };
  return null;
}

export function getLocalDataInventory(storageArg) {
  const storage = safeStorage(storageArg);
  if (!storage) return { generatedAt: new Date().toISOString(), items: [], totalBytes: 0 };

  const trackedKeys = new Set([
    ...LOCAL_DATA_KEYS.map((entry) => entry.key),
    ...listStorageKeys(storage).filter((key) => PREFIXES.some((entry) => key.startsWith(entry.prefix))),
  ]);

  const items = [...trackedKeys]
    .map((key) => {
      const meta = classifyKey(key);
      if (!meta) return null;
      const raw = readRaw(storage, key);
      if (raw === null) return null;
      return {
        key,
        label: meta.label,
        kind: meta.kind,
        bytes: raw.length,
        present: true,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));

  return {
    generatedAt: new Date().toISOString(),
    items,
    totalBytes: items.reduce((sum, item) => sum + item.bytes, 0),
  };
}

export function buildLocalDataExport(storageArg) {
  const storage = safeStorage(storageArg);
  const inventory = getLocalDataInventory(storage);
  const data = {};
  for (const item of inventory.items) {
    data[item.key] = readRaw(storage, item.key);
  }
  return {
    product: "PromoGrind",
    type: "local-data-export",
    generatedAt: inventory.generatedAt,
    summary: {
      itemCount: inventory.items.length,
      totalBytes: inventory.totalBytes,
      kinds: inventory.items.reduce((counts, item) => {
        counts[item.kind] = (counts[item.kind] || 0) + 1;
        return counts;
      }, {}),
    },
    inventory: inventory.items,
    data,
  };
}

export function clearLocalPromoGrindData(storageArg, { includePreferences = false } = {}) {
  const storage = safeStorage(storageArg);
  if (!storage) return { cleared: [], skipped: [] };
  const inventory = getLocalDataInventory(storage);
  const cleared = [];
  const skipped = [];

  for (const item of inventory.items) {
    if (!includePreferences && item.kind === "preference") {
      skipped.push(item.key);
      continue;
    }
    try {
      storage.removeItem(item.key);
      cleared.push(item.key);
    } catch {}
  }
  return { cleared, skipped };
}

export function describeDataControlState(storageArg) {
  const inventory = getLocalDataInventory(storageArg);
  const hasData = inventory.items.length > 0;
  const coreItems = inventory.items.filter((item) => item.kind === "core" || item.kind === "operator").length;
  return {
    ...inventory,
    hasData,
    coreItems,
    label: hasData
      ? `${inventory.items.length} local item${inventory.items.length === 1 ? "" : "s"} ready`
      : "No local PromoGrind data found",
  };
}
