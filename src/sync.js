/**
 * PromoGrind — Cloud Sync
 *
 * Wraps localStorage with Supabase-backed persistence.
 * - Authenticated users: data syncs to promogrind_data table (cross-device)
 * - Unauthenticated / Supabase unavailable: falls back to localStorage only
 *
 * Usage (drop-in replacement for storage.js):
 *   import { loadData, saveData, fireVaultEvent } from './sync.js';
 */

import { supabase } from './auth.js';
import { normalizeWorkflowEntry } from './promograph/index.js';

const LOCAL_KEY = 'promo_engine_v3';
const QUEUE_KEY = 'pg_sync_queue';
const LEDGER_STATE_TABLE = 'ledger_state';
const TRACKER_STATE_TABLE = 'tracker_state';
const WORKFLOW_STATE_TABLE = 'workflow_state';
const WORKFLOW_HISTORY_TABLE = 'workflow_history';
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
        ..._normalizeTracker(row.tracker),
        ...remoteEntityData,
        _entities: {
          ...(_normalizeTracker(row.tracker)._entities || {}),
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
    } catch (error) {
      _enqueueWrite(stamped);
      throw error;
    }
  }
}

// ── Vault Event ───────────────────────────────────────────────────────────────
// Awards vault points and unlocks achievements server-side.
// Points schedule:
//   first_calculation  → 5 pts
//   calculation        → 1 pt  (subsequent)
//   ledger_entry       → 2 pts
//   daily_login        → 3 pts

const _fired = new Set(); // dedupe within a single page session

export async function fireVaultEvent(eventType, points, metadata = {}) {
  // Dedupe milestone events within the same page session
  const dedupeKey = `${eventType}_${JSON.stringify(metadata)}`;
  if (_fired.has(dedupeKey)) return;
  _fired.add(dedupeKey);

  let session = null;
  try {
    const { data } = await supabase.auth.getSession();
    session = data.session;
  } catch { return; }

  if (!session) return;

  try {
    await supabase.rpc('award_vault_points', {
      p_user_id:    session.user.id,
      p_event_type: eventType,
      p_points:     points,
      p_metadata:   metadata,
    });
  } catch { /* non-critical — don't surface errors to the user */ }
}

// ── Shortcuts for common events ───────────────────────────────────────────────

let _calcCount = 0;
export function onCalculation(calculatorName) {
  _calcCount++;
  const isFirst = _calcCount === 1;
  fireVaultEvent('calculation', isFirst ? 5 : 1, { calculator: calculatorName, count: _calcCount });
}

export function onLedgerEntry() {
  fireVaultEvent('ledger_entry', 2);
}

export function onDailyLogin() {
  // Only fires once per calendar day (dedupe by date key)
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem('_pg_login_day') === today) return;
  localStorage.setItem('_pg_login_day', today);
  fireVaultEvent('daily_login', 3);
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

async function _saveRemote(userId, data) {
  // Store ledger in its own column; all other appData fields go into tracker as a JSONB object
  const { ledger, _updated, ...rest } = data;
  await supabase.from('promogrind_data').upsert({
    user_id:    userId,
    ledger:     ledger   ?? [],
    tracker:    rest,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
  await _saveEntityState(userId, data).catch(() => {});
  await _saveWorkflowEntities(userId, data).catch(() => {});
}

function _stampData(data) {
  const previous = _loadLocal();
  const now = Date.now();
  const next = { ...data, _updated: now };
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

function _mergeEntityAware(local, row) {
  const trackerData = _normalizeTracker(row.tracker);
  const remote = {
    ...trackerData,
    ledger: row.ledger ?? [],
    _updated: new Date(row.updated_at).getTime(),
  };
  const localMeta = local._entities && typeof local._entities === 'object' ? local._entities : {};
  const remoteMeta = trackerData._entities && typeof trackerData._entities === 'object' ? trackerData._entities : {};
  const base = remote._updated >= (local._updated ?? 0) ? { ...local, ...remote } : { ...remote, ...local };

  for (const key of ENTITY_KEYS) {
    const localStamp = Number(localMeta[key] || 0);
    const remoteStamp = Number(remoteMeta[key] || 0);
    if (localStamp > remoteStamp) {
      base[key] = local[key];
    } else if (remoteStamp > localStamp) {
      base[key] = remote[key];
    }
  }

  base._updated = Math.max(remote._updated || 0, local._updated || 0);
  base._entities = { ...remoteMeta, ...localMeta };
  return base;
}

function _loadQueue() {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function _saveQueue(queue) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch {}
}

function _enqueueWrite(data) {
  const queue = _loadQueue();
  queue.push({ data, queuedAt: Date.now() });
  _saveQueue(queue.slice(-20));
}

async function _flushQueue(userId) {
  const queue = _loadQueue();
  if (!queue.length) return;
  const remaining = [];
  for (const item of queue) {
    try {
      await _saveRemote(userId, item.data);
    } catch {
      remaining.push(item);
      break;
    }
  }
  _saveQueue(remaining);
}

function _getTrackerState(data = {}) {
  const {
    ledger,
    _updated,
    _entities,
    workflowInbox,
    workflowHistory,
    ...tracker
  } = data || {};
  return tracker;
}

function _getCombinedWorkflows(data = {}) {
  return [
    ...(Array.isArray(data.workflowInbox) ? data.workflowInbox : []),
    ...(Array.isArray(data.resultFeedback) ? data.resultFeedback : []),
  ].map((entry) => normalizeWorkflowEntry(entry));
}

function _appendWorkflowHistory(previous = {}, next = {}, now = Date.now()) {
  const history = Array.isArray(previous.workflowHistory) ? [...previous.workflowHistory] : [];
  const existing = new Set(history.map((entry) => entry.eventKey));
  const previousMap = new Map(_getCombinedWorkflows(previous).map((workflow) => [workflow.id, workflow]));
  const nextWorkflows = _getCombinedWorkflows(next);

  for (const workflow of nextWorkflows) {
    const prev = previousMap.get(workflow.id);
    const eventAt = workflow.updatedAt || workflow.createdAt || new Date(now).toISOString();
    const eventKey = `${workflow.id}:${workflow.status}:${eventAt}`;
    if (existing.has(eventKey)) continue;

    const changed =
      !prev ||
      prev.status !== workflow.status ||
      prev.updatedAt !== workflow.updatedAt ||
      prev.actualProfit !== workflow.actualProfit ||
      prev.note !== workflow.note ||
      prev.skipReason !== workflow.skipReason ||
      prev.frictionReason !== workflow.frictionReason;

    if (!changed) continue;

    history.unshift({
      eventKey,
      workflowId: workflow.id,
      fromStatus: prev?.status || null,
      status: workflow.status,
      source: workflow.source || 'result_feedback',
      title: workflow.title || workflow.calculatorLabel,
      calculatorSlug: workflow.calculatorSlug,
      promoType: workflow.promoType,
      book: workflow.book,
      expectedProfit: workflow.expectedProfit,
      actualProfit: workflow.actualProfit,
      eventAt,
    });
    existing.add(eventKey);
  }

  return history.slice(0, 500);
}

async function _loadRemoteEntityData(userId) {
  const result = {};
  const entityMeta = {};

  try {
    const { data, error } = await supabase.from(LEDGER_STATE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    if (!error && data && Array.isArray(data.ledger)) {
      result.ledger = data.ledger;
      entityMeta.ledger = new Date(data.updated_at || 0).getTime();
    }
  } catch {}

  try {
    const { data, error } = await supabase.from(TRACKER_STATE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    if (!error && data && data.tracker && typeof data.tracker === 'object' && !Array.isArray(data.tracker)) {
      Object.assign(result, data.tracker);
      const updatedAt = new Date(data.updated_at || 0).getTime();
      for (const key of Object.keys(data.tracker)) {
        if (key === '_entities') continue;
        entityMeta[key] = Math.max(Number(entityMeta[key] || 0), updatedAt);
      }
      if (data.tracker._entities && typeof data.tracker._entities === 'object') {
        Object.assign(entityMeta, data.tracker._entities);
      }
    }
  } catch {}

  const workflowData = await _loadRemoteWorkflowData(userId);
  Object.assign(result, workflowData);
  Object.assign(entityMeta, workflowData._entities || {});

  if (Object.keys(entityMeta).length) result._entities = entityMeta;
  return result;
}

async function _loadRemoteWorkflowData(userId) {
  const result = {};
  const entityMeta = {};

  try {
    const { data, error } = await supabase.from(WORKFLOW_STATE_TABLE).select('*').eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length) {
      result.workflowInbox = data.map((row) => normalizeWorkflowEntry({
        id: row.workflow_id,
        calculatorKey: row.calculator_key,
        calculatorSlug: row.calculator_slug,
        calculatorLabel: row.calculator_label,
        title: row.title,
        summary: row.summary,
        promoType: row.promo_type,
        status: row.status,
        expectedProfit: row.expected_profit,
        actualProfit: row.actual_profit,
        calculatorAccurate: row.calculator_accurate,
        book: row.book,
        skipReason: row.skip_reason,
        frictionReason: row.friction_reason,
        confidence: row.confidence,
        opportunityScore: row.opportunity_score,
        actionability: row.actionability,
        nextStep: row.next_step,
        note: row.note,
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
      entityMeta.workflowInbox = Math.max(...data.map((row) => new Date(row.updated_at || row.created_at || 0).getTime()));
    }
  } catch {}

  try {
    const { data, error } = await supabase.from(WORKFLOW_HISTORY_TABLE).select('*').eq('user_id', userId);
    if (!error && Array.isArray(data) && data.length) {
      result.workflowHistory = data
        .map((row) => ({
            eventKey: row.event_key,
            workflowId: row.workflow_id,
            fromStatus: row.from_status,
            status: row.status,
            source: row.source,
          title: row.title,
          calculatorSlug: row.calculator_slug,
          promoType: row.promo_type,
          book: row.book,
          expectedProfit: row.expected_profit,
          actualProfit: row.actual_profit,
          eventAt: row.event_at,
        }))
        .sort((a, b) => new Date(b.eventAt).getTime() - new Date(a.eventAt).getTime());
      entityMeta.workflowHistory = Math.max(...data.map((row) => new Date(row.event_at || 0).getTime()));
    }
  } catch {}

  if (Object.keys(entityMeta).length) result._entities = entityMeta;
  return result;
}

async function _saveEntityState(userId, data) {
  await supabase.from(LEDGER_STATE_TABLE).upsert({
    user_id: userId,
    ledger: Array.isArray(data.ledger) ? data.ledger : [],
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });

  const tracker = _getTrackerState(data);
  await supabase.from(TRACKER_STATE_TABLE).upsert({
    user_id: userId,
    tracker,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

async function _saveWorkflowEntities(userId, data) {
  const workflows = _getCombinedWorkflows(data);
  if (workflows.length) {
    const stateRows = workflows.map((workflow) => ({
      user_id: userId,
      workflow_id: workflow.id,
      calculator_key: workflow.calculatorKey,
      calculator_slug: workflow.calculatorSlug,
      calculator_label: workflow.calculatorLabel,
      title: workflow.title,
      summary: workflow.summary,
      promo_type: workflow.promoType,
      status: workflow.status,
      expected_profit: workflow.expectedProfit,
      actual_profit: workflow.actualProfit,
      calculator_accurate: workflow.calculatorAccurate,
      book: workflow.book,
      skip_reason: workflow.skipReason,
      friction_reason: workflow.frictionReason,
      confidence: workflow.confidence,
      opportunity_score: workflow.opportunityScore,
      actionability: workflow.actionability,
      next_step: workflow.nextStep,
      note: workflow.note,
      source: workflow.source,
      created_at: workflow.createdAt,
      updated_at: workflow.updatedAt,
    }));
    await supabase.from(WORKFLOW_STATE_TABLE).upsert(stateRows, { onConflict: 'user_id,workflow_id' });
  }

  const historyRows = Array.isArray(data.workflowHistory) ? data.workflowHistory : [];
  if (historyRows.length) {
    await supabase.from(WORKFLOW_HISTORY_TABLE).upsert(historyRows.map((entry) => ({
        event_key: entry.eventKey,
        user_id: userId,
        workflow_id: entry.workflowId,
        from_status: entry.fromStatus,
        status: entry.status,
        source: entry.source,
      title: entry.title,
      calculator_slug: entry.calculatorSlug,
      promo_type: entry.promoType,
      book: entry.book,
      expected_profit: entry.expectedProfit,
      actual_profit: entry.actualProfit,
      event_at: entry.eventAt,
    })), { onConflict: 'event_key' });
  }
}
