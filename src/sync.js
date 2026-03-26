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

const LOCAL_KEY = 'promo_engine_v3';

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

    const remoteTs = new Date(row.updated_at).getTime();
    const localTs  = local._updated ?? 0;

    if (remoteTs >= localTs) {
      // Remote is newer — pull down and cache locally
      // tracker column stores all non-ledger appData fields as a JSONB object
      const trackerData = (row.tracker && typeof row.tracker === 'object' && !Array.isArray(row.tracker))
        ? row.tracker
        : {};
      const merged = {
        ...local,
        ...trackerData,
        ledger:   row.ledger  ?? [],
        _updated: remoteTs,
      };
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
  const stamped = { ...data, _updated: Date.now() };
  _saveLocal(stamped);

  let session = null;
  try {
    const { data: sd } = await supabase.auth.getSession();
    session = sd.session;
  } catch { /* offline */ }

  if (session) {
    _saveRemote(session.user.id, stamped).catch(() => {}); // fire-and-forget
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
}
