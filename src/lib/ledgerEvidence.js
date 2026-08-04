import { resolveRealizedOutcome } from "./realizedOutcome.js";

export const LEDGER_QUARANTINE_KEY = "_ledgerQuarantine";

function text(value) {
  return String(value ?? "").trim();
}

export function ledgerMergeKey(entry = {}, index = 0) {
  if (entry?.id !== undefined && entry?.id !== null && entry.id !== "") return String(entry.id);
  return [entry?.date, entry?.book, entry?.type, entry?.profit]
    .map((value) => value || "")
    .join("|") + "|" + index;
}

export function syntheticLedgerReason(entry = {}) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const id = text(entry.id).toLowerCase();
  const notes = text(entry.notes).toLowerCase();
  const kind = text(entry.evidenceKind || entry.kind || entry.source).toLowerCase();
  if (entry.synthetic === true || entry.demo === true) return "explicit-synthetic";
  if (kind === "demo" || kind === "synthetic" || kind === "sample") return "synthetic-kind";
  if (id === "ledger-demo" || id.startsWith("ledger-demo-")) return "legacy-demo-id";
  if (notes.startsWith("demo entry") || notes.startsWith("sample entry")) return "legacy-demo-note";
  return null;
}

export function classifyLedgerEntries(entries = []) {
  const evidenceRows = [];
  const malformedRows = [];
  const syntheticRows = [];
  (Array.isArray(entries) ? entries : []).forEach((entry, index) => {
    const syntheticReason = syntheticLedgerReason(entry);
    if (syntheticReason) {
      syntheticRows.push({ entry, index, key: ledgerMergeKey(entry, index), reason: syntheticReason });
      return;
    }
    const outcome = resolveRealizedOutcome(entry);
    if (outcome.state !== "resolved") {
      malformedRows.push({ entry, index, key: ledgerMergeKey(entry, index), reason: outcome.state });
      return;
    }
    evidenceRows.push({ entry, index, key: ledgerMergeKey(entry, index), value: outcome.value });
  });
  return {
    evidenceRows,
    malformedRows,
    syntheticRows,
    visibleRows: [...evidenceRows, ...malformedRows]
      .sort((a, b) => a.index - b.index)
      .map((row) => row.entry),
  };
}

export function ledgerEvidenceEntries(entries = []) {
  return classifyLedgerEntries(entries).evidenceRows.map((row) => row.entry);
}

export function summarizeLedgerEvidence(entries = [], now = new Date()) {
  const classified = classifyLedgerEntries(entries);
  const today = now.toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const totalProfit = classified.evidenceRows.reduce((sum, row) => sum + row.value, 0);
  const todayProfit = classified.evidenceRows
    .filter((row) => text(row.entry.date) === today)
    .reduce((sum, row) => sum + row.value, 0);
  const monthProfit = classified.evidenceRows
    .filter((row) => text(row.entry.date).startsWith(month))
    .reduce((sum, row) => sum + row.value, 0);
  return {
    ...classified,
    evidenceCount: classified.evidenceRows.length,
    malformedCount: classified.malformedRows.length,
    syntheticCount: classified.syntheticRows.length,
    totalProfit,
    todayProfit,
    monthProfit,
  };
}

function quarantineRecord(row, now) {
  return {
    key: row.key,
    reason: row.reason,
    quarantinedAt: new Date(now).toISOString(),
    entry: row.entry,
  };
}

export function quarantineLedgerData(input = {}, now = Date.now()) {
  const data = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const classified = classifyLedgerEntries(data.ledger);
  const existing = Array.isArray(data[LEDGER_QUARANTINE_KEY]) ? data[LEDGER_QUARANTINE_KEY] : [];
  const quarantine = new Map();
  existing.forEach((record, index) => {
    const entry = record?.entry && typeof record.entry === "object" ? record.entry : record;
    const key = text(record?.key) || ledgerMergeKey(entry, index);
    quarantine.set(key, {
      key,
      reason: text(record?.reason) || syntheticLedgerReason(entry) || "previously-quarantined",
      quarantinedAt: text(record?.quarantinedAt) || new Date(now).toISOString(),
      entry,
    });
  });
  classified.syntheticRows.forEach((row) => {
    if (!quarantine.has(row.key)) quarantine.set(row.key, quarantineRecord(row, now));
  });

  const tombstones = {
    ...(data._tombstones && typeof data._tombstones === "object" ? data._tombstones : {}),
    ledger: {
      ...(data._tombstones?.ledger && typeof data._tombstones.ledger === "object" ? data._tombstones.ledger : {}),
    },
  };
  classified.syntheticRows.forEach((row) => {
    tombstones.ledger[row.key] = Math.max(Number(tombstones.ledger[row.key]) || 0, now);
  });

  const cleanLedger = classified.visibleRows;
  const quarantineRows = [...quarantine.values()];
  const hasLedger = Array.isArray(data.ledger);
  const hasQuarantine = Object.prototype.hasOwnProperty.call(data, LEDGER_QUARANTINE_KEY);
  const hasTombstones = data._tombstones && typeof data._tombstones === "object";
  const changed = classified.syntheticRows.length > 0
    || cleanLedger.length !== (hasLedger ? data.ledger.length : 0)
    || quarantineRows.length !== existing.length;
  const next = { ...data };
  if (hasLedger || classified.syntheticRows.length) next.ledger = cleanLedger;
  if (hasQuarantine || quarantineRows.length) next[LEDGER_QUARANTINE_KEY] = quarantineRows;
  if (hasTombstones || classified.syntheticRows.length) next._tombstones = tombstones;
  return {
    changed,
    added: classified.syntheticRows.length,
    data: next,
  };
}
