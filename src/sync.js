/**
 * PromoGrind — Cloud Sync
 *
 * Wraps localStorage with Supabase-backed persistence.
 * - Authenticated users: data syncs to promogrind_data table (cross-device)
 * - Unauthenticated / Supabase unavailable: falls back to localStorage only
 *
 * Usage (drop-in replacement for storage.js):
 *   import { loadData, saveData } from './sync.js';
 */

import { supabase } from './auth.js';
import { recordTrustReceipt } from './lib/trustReceipts.js';
import { _appendWorkflowHistory, _loadRemoteEntityData, _saveEntityState, _saveWorkflowEntities } from './lib/sync-workflows.js';
import { normalizeWorkflowEntry, resolveWorkflowStatusConflict } from './promograph/index.js';
import { enqueueWrite as _queueEnqueue, getQueueDepthSync, loadQueue as _queueLoad, saveQueue as _queueSave } from './lib/sync-queue.js';

const LOCAL_KEY = 'promo_engine_v3';
const LEDGER_STATE_TABLE = 'ledger_state';
const TRACKER_STATE_TABLE = 'tracker_state';
const WORKFLOW_STATE_TABLE = 'workflow_state';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';
const WORKFLOW_BLOB_KEYS = ['workflowInbox', 'workflowHistory'];
const TRACKER_BLOB_KEYS = ['resultFeedback', 'promoValueHistory', 'journal', 'oddsCompare'];
const ENTITY_KEYS = [
  'ledger',
  'bets',
  'resultFeedback',
  'workflowInbox',
  'workflowHistory',
  'done',
  'bookExpiry',
  'promoValueHistory',
  'journal',
  'oddsCompare',
];

// ── Load ──────────────────────────────────────────────────────────────────────
// Returns the most up-to-date data: remote if newer, local otherwise.
// Migrates local data to remote on first authenticated load.

export async function loadData() {
  const local = _loadLocal();

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch { /* offline or misconfigured — use local */ }

  if (!session) return local;

  try {
    await _flushQueue(session.user.id);
    const remoteEntityData = await _loadRemoteEntityData(session.user.id);
    const { data: row } = await supabase
      .from('promogrind_data')
      .select('ledger, tracker, updated_at')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!row) {
      // First cloud load — push local data up
      await _saveRemote(session.user.id, local);
      return local;
    }

    const enrichedRow = {
      ...row,
      tracker: {
        ..._stripTrackerCompat(row.tracker),
        ...remoteEntityData,
        _entities: {
          ...(_stripTrackerCompat(row.tracker)._entities || {}),
          ...(remoteEntityData._entities || {}),
        },
      },
      ledger: Array.isArray(remoteEntityData.ledger) ? remoteEntityData.ledger : row.ledger,
    };

    const remoteTs = new Date(enrichedRow.updated_at).getTime();
    const localTs  = local._updated ?? 0;

    if (remoteTs >= localTs) {
      const merged = _mergeEntityAware(local, enrichedRow);
      _saveLocal(merged);
      if (_shouldCompactLegacyBlob(row.tracker, remoteEntityData)) {
        _saveRemote(session.user.id, merged).catch(() => {});
      }
      return merged;
    }

    // Local is newer — push up
    await _saveRemote(session.user.id, local);
    return local;

  } catch {
    return local; // any Supabase error → fall back to local
  }
}

// ── Save ──────────────────────────────────────────────────────────────────────
// Writes to localStorage immediately; syncs to Supabase in background.

export async function saveData(data) {
  const stamped = _stampData(data);
  _saveLocal(stamped);

  let session = null;
  try {
    const { data: sd } = await supabase.auth.getSession();
    session = sd.session;
  } catch { /* offline */ }

  if (session) {
    try {
      await _saveRemote(session.user.id, stamped);
      await _flushQueue(session.user.id);
      recordTrustReceipt({
        type: "sync",
        title: "Cloud sync updated",
        summary: "PromoGrind saved your latest tracker, ledger, and workflow state for this account.",
        stored: ["tracker state", "ledger state", "workflow state"],
        notStored: ["sportsbook passwords", "payment card details"],
        undo: "Clear local data or contact account help for remote deletion.",
        dedupeKey: "sync:remote-save",
      });
    } catch (error) {
      await _enqueueWrite(stamped);
      recordTrustReceipt({
        type: "sync",
        title: "Offline sync queued",
        summary: "PromoGrind saved changes locally and queued them for cloud sync when the connection recovers.",
        stored: ["local tracker update", "offline sync queue"],
        notStored: ["new remote write yet"],
        undo: "Reconnect to flush the queue or clear local data before reconnecting.",
        dedupeKey: "sync:queued",
      });
      throw error;
    }
  }
}

// ── Internals ─────────────────────────────────────────────────────────────────

function _loadLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}; }
  catch { return {}; }
}

function _saveLocal(data) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(data)); }
  catch {}
}

export function readSyncDiagnostics() {
  const queueDepth = getQueueDepthSync();
  return {
    queueDepth,
    hasPendingWrites: queueDepth > 0,
  };
}

/** Flush any queued offline writes. Safe to call on reconnect — no-ops if queue is empty. */
export async function triggerQueueFlush() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return;
    await _flushQueue(session.user.id);
  } catch { /* best-effort */ }
}

async function _saveRemote(userId, data) {
  const trackerStateSaved = await _saveEntityState(userId, data).then(() => true).catch(() => false);
  const workflowStateSaved = await _saveWorkflowEntities(userId, data).then(() => true).catch(() => false);
  // Store ledger in its own column; tracker stays as a compatibility mirror while entity-backed tables become canonical.
  const { ledger } = data;
  const trackerBlob = _buildLegacyBlobTracker(data, { trackerStateSaved, workflowStateSaved });
  await supabase.from('promogrind_data').upsert({
    user_id:    userId,
    ledger:     ledger   ?? [],
    tracker:    trackerBlob,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

function _stampData(data) {
  const previous = _loadLocal();
  const now = Date.now();
  const next = _normalizeSyncDomains(previous, { ...data, _updated: now }, now);
  next.workflowHistory = _appendWorkflowHistory(previous, next, now);
  next._entities = _buildEntityMeta(previous, next, now);
  return next;
}

function _buildEntityMeta(previous = {}, next = {}, now = Date.now()) {
  const previousMeta = previous._entities && typeof previous._entities === 'object' ? previous._entities : {};
  const meta = { ...previousMeta };
  for (const key of ENTITY_KEYS) {
    const prevValue = JSON.stringify(previous?.[key] ?? null);
    const nextValue = JSON.stringify(next?.[key] ?? null);
    if (prevValue !== nextValue) meta[key] = now;
  }
  return meta;
}

function _normalizeTracker(tracker) {
  return tracker && typeof tracker === 'object' && !Array.isArray(tracker) ? tracker : {};
}

function _stripTrackerCompat(tracker) {
  const normalized = _normalizeTracker(tracker);
  const { _compat, ...rest } = normalized;
  return rest;
}

function _shouldCompactLegacyBlob(tracker, remoteEntityData = {}) {
  const normalized = _normalizeTracker(tracker);
  const compatMode = normalized._compat?.blobMode || 'full';
  if (compatMode === 'compact') return false;
  const hasEntityBackedData =
    Array.isArray(remoteEntityData.ledger) ||
    Array.isArray(remoteEntityData.workflowInbox) ||
    Array.isArray(remoteEntityData.workflowHistory) ||
    Object.keys(remoteEntityData._entities || {}).length > 0;
  return hasEntityBackedData;
}

function _numericTimestamp(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function _entryKey(entry = {}, kind, index = 0) {
  if (kind !== 'history' && entry?.id !== undefined && entry?.id !== null && entry.id !== '') return String(entry.id);
  if (kind === 'history' && entry?.eventKey) return entry.eventKey;
  const parts = kind === 'ledger'
    ? [entry?.date, entry?.book, entry?.type, entry?.profit]
    : kind === 'journal'
      ? [entry?.date, entry?.book, entry?.type, entry?.profit]
      : kind === 'oddsCompare'
        ? [entry?.event, JSON.stringify(entry?.odds || {})]
    : kind === 'history'
      ? [entry?.workflowId, entry?.status, entry?.eventAt]
      : [entry?.title, entry?.calculatorSlug || entry?.calculatorKey, entry?.createdAt];
  return `${parts.map((value) => value || '').join('|')}|${index}`;
}

function _entryTime(entry = {}, kind) {
  if (kind === 'ledger') return _numericTimestamp(entry?.updatedAt || entry?.date);
  if (kind === 'journal') return _numericTimestamp(entry?.updatedAt || entry?.createdAt || entry?.date);
  if (kind === 'oddsCompare') return _numericTimestamp(entry?.updatedAt || entry?.createdAt);
  if (kind === 'history') return _numericTimestamp(entry?.eventAt);
  return Math.max(_numericTimestamp(entry?.updatedAt), _numericTimestamp(entry?.createdAt));
}

function _preferNewerEntry(existing, incoming, kind) {
  if (kind === 'workflow') {
    return resolveWorkflowStatusConflict(existing, incoming);
  }
  const existingTs = _entryTime(existing, kind);
  const incomingTs = _entryTime(incoming, kind);
  if (incomingTs >= existingTs) return { ...existing, ...incoming };
  return { ...incoming, ...existing };
}

function _mergeCollection(localEntries, remoteEntries, { kind, normalize = (entry) => entry, limit = null } = {}) {
  const merged = new Map();
  const applyEntries = (entries = []) => {
    entries.forEach((rawEntry, index) => {
      const entry = normalize(rawEntry);
      const key = _entryKey(entry, kind, index);
      const existing = merged.get(key);
      merged.set(key, existing ? _preferNewerEntry(existing, entry, kind) : entry);
    });
  };

  applyEntries(remoteEntries);
  applyEntries(localEntries);

  const values = [...merged.values()];
  return limit ? values.slice(0, limit) : values;
}

function _normalizeJournalEntries(previousEntries = [], nextEntries = [], now = Date.now()) {
  const previousById = new Map(
    (Array.isArray(previousEntries) ? previousEntries : [])
      .filter((entry) => entry?.id !== undefined && entry?.id !== null)
      .map((entry) => [String(entry.id), entry]),
  );
  const isoNow = new Date(now).toISOString();
  return (Array.isArray(nextEntries) ? nextEntries : []).map((entry, index) => {
    const previousEntry = entry?.id !== undefined && entry?.id !== null ? previousById.get(String(entry.id)) : null;
    const id = entry?.id ?? previousEntry?.id ?? `journal-${now}-${index}`;
    return {
      ...entry,
      id,
      createdAt: entry?.createdAt || previousEntry?.createdAt || isoNow,
      updatedAt: entry?.updatedAt || previousEntry?.updatedAt || isoNow,
    };
  });
}

function _normalizeOddsCompareRows(previousRows = [], nextRows = [], now = Date.now()) {
  const priorRows = Array.isArray(previousRows) ? previousRows : [];
  const isoNow = new Date(now).toISOString();
  return (Array.isArray(nextRows) ? nextRows : []).map((row, index) => {
    const previousRow = priorRows[index];
    const id = row?.id || previousRow?.id || `odds-compare-${now}-${index}`;
    const normalizedOdds = row?.odds && typeof row.odds === 'object' && !Array.isArray(row.odds) ? row.odds : {};
    const previousComparable = previousRow
      ? JSON.stringify({ event: previousRow.event || '', odds: previousRow.odds || {} })
      : null;
    const nextComparable = JSON.stringify({ event: row?.event || '', odds: normalizedOdds });
    const changed = !previousRow || previousComparable !== nextComparable;
    return {
      ...row,
      id,
      odds: normalizedOdds,
      createdAt: row?.createdAt || previousRow?.createdAt || isoNow,
      updatedAt: changed ? isoNow : (row?.updatedAt || previousRow?.updatedAt || isoNow),
    };
  });
}

function _mergePromoValueHistory(localHistory = {}, remoteHistory = {}) {
  const local = localHistory && typeof localHistory === 'object' && !Array.isArray(localHistory) ? localHistory : {};
  const remote = remoteHistory && typeof remoteHistory === 'object' && !Array.isArray(remoteHistory) ? remoteHistory : {};
  const merged = {};

  for (const key of new Set([...Object.keys(remote), ...Object.keys(local)])) {
    const values = new Map();
    const applyEntries = (entries = []) => {
      entries.forEach((entry, index) => {
        if (!entry || typeof entry !== 'object') return;
        const entryKey = entry.date || `index-${index}`;
        values.set(entryKey, entry);
      });
    };

    applyEntries(remote[key]);
    applyEntries(local[key]);

    merged[key] = [...values.values()]
      .sort((a, b) => String(a?.date || '').localeCompare(String(b?.date || '')))
      .slice(-6);
  }

  return merged;
}

function _normalizeSyncDomains(previous = {}, next = {}, now = Date.now()) {
  return {
    ...next,
    journal: _normalizeJournalEntries(previous.journal, next.journal, now),
    oddsCompare: _normalizeOddsCompareRows(previous.oddsCompare, next.oddsCompare, now),
    promoValueHistory: _mergePromoValueHistory(next.promoValueHistory, {}),
  };
}

function _mergeEntityAware(local, row) {
  const trackerData = _stripTrackerCompat(row.tracker);
  const remote = {
    ...trackerData,
    ledger: row.ledger ?? [],
    _updated: new Date(row.updated_at).getTime(),
  };
  const localMeta = local._entities && typeof local._entities === 'object' ? local._entities : {};
  const remoteMeta = trackerData._entities && typeof trackerData._entities === 'object' ? trackerData._entities : {};
  const base = remote._updated >= (local._updated ?? 0) ? { ...local, ...remote } : { ...remote, ...local };
  const mergedMeta = { ...remoteMeta, ...localMeta };
  for (const key of new Set([...Object.keys(remoteMeta), ...Object.keys(localMeta)])) {
    mergedMeta[key] = Math.max(_numericTimestamp(remoteMeta[key]), _numericTimestamp(localMeta[key]));
  }

  base.ledger = _mergeCollection(local.ledger, remote.ledger, { kind: 'ledger' });
  base.workflowInbox = _mergeCollection(local.workflowInbox, remote.workflowInbox, { kind: 'workflow', normalize: normalizeWorkflowEntry, limit: 250 });
  base.resultFeedback = _mergeCollection(local.resultFeedback, remote.resultFeedback, { kind: 'workflow', normalize: normalizeWorkflowEntry, limit: 250 });
  base.workflowHistory = _mergeCollection(local.workflowHistory, remote.workflowHistory, { kind: 'history', limit: 500 });
  base.journal = _mergeCollection(local.journal, remote.journal, { kind: 'journal', normalize: (entry) => entry, limit: 500 });
  base.oddsCompare = _mergeCollection(local.oddsCompare, remote.oddsCompare, { kind: 'oddsCompare', normalize: (entry) => entry, limit: 100 });
  base.promoValueHistory = _mergePromoValueHistory(local.promoValueHistory, remote.promoValueHistory);

  for (const key of ENTITY_KEYS) {
    const localStamp = Number(localMeta[key] || 0);
    const remoteStamp = Number(remoteMeta[key] || 0);
    if (
      key === 'ledger' ||
      key === 'workflowInbox' ||
      key === 'resultFeedback' ||
      key === 'workflowHistory' ||
      key === 'journal' ||
      key === 'oddsCompare' ||
      key === 'promoValueHistory'
    ) {
      mergedMeta[key] = Math.max(localStamp, remoteStamp);
      continue;
    }
    if (localStamp > remoteStamp) {
      base[key] = local[key];
    } else if (remoteStamp > localStamp) {
      base[key] = remote[key];
    }
  }

  base._updated = Math.max(remote._updated || 0, local._updated || 0);
  base._entities = mergedMeta;
  return base;
}

async function _loadQueue() {
  try { return await _queueLoad(); } catch { return []; }
}

async function _saveQueue(queue) {
  try { await _queueSave(queue); } catch { /* mirror keeps state */ }
}

function _buildLegacyBlobTracker(data = {}, { trackerStateSaved = false, workflowStateSaved = false } = {}) {
  const {
    ledger,
    _updated,
    _entities,
    ...rest
  } = data || {};
  const reducedKeys = [
    ...(workflowStateSaved ? WORKFLOW_BLOB_KEYS : []),
    ...(trackerStateSaved ? TRACKER_BLOB_KEYS : []),
  ];
  const tracker = { ...rest };
  for (const key of reducedKeys) delete tracker[key];
  tracker._compat = {
    blobMode: reducedKeys.length ? 'compact' : 'full',
    reducedKeys,
    trackerStateSaved,
    workflowStateSaved,
    updatedAt: new Date().toISOString(),
  };
  return tracker;
}

async function _enqueueWrite(data) {
  try { await _queueEnqueue({ data }); } catch { /* mirror is the fallback */ }
}

async function _flushQueue(userId) {
  const queue = await _loadQueue();
  if (!queue.length) return;
  const remaining = [];
  let failed = false;
  for (const item of queue) {
    if (failed) { remaining.push(item); continue; }
    try {
      await _saveRemote(userId, item.data);
    } catch {
      remaining.push(item);
      failed = true;
    }
  }
  await _saveQueue(remaining);
}
