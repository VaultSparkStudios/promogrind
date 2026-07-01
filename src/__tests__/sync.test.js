/**
 * PromoGrind — Sync Helper Tests
 *
 * Tests saveData, loadData, onCalculation, onLedgerEntry, and onDailyLogin.
 * All Supabase I/O is mocked. localStorage is shimmed for the Node test env.
 *
 * Test ordering matters for onCalculation: _calcCount is module-level state
 * that increments with each call. Tests in the "points schedule" group are
 * intentionally ordered to verify first-call (5 pts) then subsequent (1 pt).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ── localStorage shim ─────────────────────────────────────────────────────────
// Vitest runs in Node; window.localStorage does not exist by default.
const _store = {};
global.localStorage = {
  getItem:    (k)    => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
  setItem:    (k, v) => { _store[k] = String(v); },
  removeItem: (k)    => { delete _store[k]; },
  clear:      ()     => { Object.keys(_store).forEach((k) => delete _store[k]); },
};

// ── Supabase mock (via vi.hoisted so refs are available in the factory) ────────
const mocks = vi.hoisted(() => ({
  getSession:  vi.fn(),
  rpc:         vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert:      vi.fn().mockResolvedValue({ data: null, error: null }),
  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  tableSelect: vi.fn().mockResolvedValue({ data: [], error: null }),
  tableMaybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  tableUpsert: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('../auth.js', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: vi.fn((table) => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => {
          if (table === 'promogrind_data') {
            return { maybeSingle: mocks.maybeSingle };
          }
          if (table === 'workflow_state' || table === 'workflow_history') {
            return mocks.tableSelect(table);
          }
          return { maybeSingle: () => mocks.tableMaybeSingle(table) };
        }),
      })),
      upsert: (...args) => {
        if (table === 'promogrind_data') {
          return mocks.upsert(...args);
        }
        return mocks.tableUpsert(table, ...args);
      },
    })),
    rpc: mocks.rpc,
  },
}));

import { saveData, loadData, onCalculation, onLedgerEntry, onDailyLogin, readSyncDiagnostics } from '../sync.js';

// ── Session fixtures ──────────────────────────────────────────────────────────
const NO_SESSION   = { data: { session: null } };
const WITH_SESSION = { data: { session: { user: { id: 'test-user-1' } } } };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  mocks.getSession.mockResolvedValue(NO_SESSION);
  mocks.rpc.mockResolvedValue({ data: null, error: null });
  mocks.upsert.mockResolvedValue({ data: null, error: null });
  mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.tableSelect.mockResolvedValue({ data: [], error: null });
  mocks.tableMaybeSingle.mockResolvedValue({ data: null, error: null });
  mocks.tableUpsert.mockResolvedValue({ data: null, error: null });
});

// ── saveData ──────────────────────────────────────────────────────────────────

describe('saveData', () => {
  it('writes data to localStorage immediately', async () => {
    await saveData({ ledger: [{ id: 1, profit: '50.00' }] });
    const raw = localStorage.getItem('promo_engine_v3');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw).ledger).toHaveLength(1);
  });

  it('stamps a numeric _updated timestamp on the persisted record', async () => {
    const before = Date.now();
    await saveData({ ledger: [] });
    const after = Date.now();
    const parsed = JSON.parse(localStorage.getItem('promo_engine_v3'));
    expect(typeof parsed._updated).toBe('number');
    expect(parsed._updated).toBeGreaterThanOrEqual(before);
    expect(parsed._updated).toBeLessThanOrEqual(after);
  });

  it('does not mutate the original data object passed in', async () => {
    const original = { ledger: [] };
    await saveData(original);
    // The original object should not gain _updated
    expect(original._updated).toBeUndefined();
  });

  it('triggers a Supabase upsert when a session is active', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await saveData({ ledger: [] });
    expect(mocks.upsert).toHaveBeenCalled();
  });

  it('persists dedicated ledger and tracker state when a session is active', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await saveData({ ledger: [{ id: 1 }], done: { DraftKings: true }, notes: ['keep'] });
    expect(mocks.tableUpsert).toHaveBeenCalledWith(
      'ledger_state',
      expect.objectContaining({ user_id: 'test-user-1', ledger: [{ id: 1 }] }),
      expect.any(Object),
    );
    expect(mocks.tableUpsert).toHaveBeenCalledWith(
      'tracker_state',
      expect.objectContaining({
        user_id: 'test-user-1',
        tracker: expect.objectContaining({ done: { DraftKings: true }, notes: ['keep'] }),
      }),
      expect.any(Object),
    );
  });

  it('reduces the legacy blob when tracker and workflow entity tables save successfully', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await saveData({
      ledger: [{ id: 1 }],
      resultFeedback: [{ id: 'rf-1', status: 'queued' }],
      workflowInbox: [{ id: 'wf-1', title: 'Workflow' }],
      workflowHistory: [{ eventKey: 'wf-1:queued:2026-04-16T12:00:00.000Z', workflowId: 'wf-1', status: 'queued', eventAt: '2026-04-16T12:00:00.000Z' }],
      promoValueHistory: { 'DraftKings-Bonus Bet': [{ date: '2026-04-16', value: 24 }] },
      journal: [{ id: 'journal-1', book: 'DraftKings', type: 'Bonus Bet', profit: '12', date: '2026-04-16' }],
      oddsCompare: [{ id: 'odds-1', event: 'Chiefs ML', odds: { DraftKings: '-110' } }],
    });

    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        tracker: expect.objectContaining({
          _compat: expect.objectContaining({
            blobMode: 'compact',
            trackerStateSaved: true,
            workflowStateSaved: true,
          }),
        }),
      }),
      expect.any(Object),
    );

    const tracker = mocks.upsert.mock.calls.at(-1)[0].tracker;
    expect(tracker.resultFeedback).toBeUndefined();
    expect(tracker.workflowInbox).toBeUndefined();
    expect(tracker.workflowHistory).toBeUndefined();
    expect(tracker.promoValueHistory).toBeUndefined();
    expect(tracker.journal).toBeUndefined();
    expect(tracker.oddsCompare).toBeUndefined();
  });

  it('keeps the full legacy blob when dedicated entity tables are unavailable', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.tableUpsert.mockRejectedValue(new Error('missing table'));

    await expect(saveData({
      resultFeedback: [{ id: 'rf-1', status: 'queued' }],
      workflowInbox: [{ id: 'wf-1', title: 'Workflow' }],
      promoValueHistory: { 'DraftKings-Bonus Bet': [{ date: '2026-04-16', value: 24 }] },
    })).resolves.toBeUndefined();

    const tracker = mocks.upsert.mock.calls.at(-1)[0].tracker;
    expect(tracker._compat).toEqual(expect.objectContaining({
      blobMode: 'full',
      trackerStateSaved: false,
      workflowStateSaved: false,
    }));
    expect(tracker.resultFeedback).toHaveLength(1);
    expect(tracker.workflowInbox).toHaveLength(1);
    expect(tracker.promoValueHistory['DraftKings-Bonus Bet']).toHaveLength(1);
  });

  it('tracks per-entity timestamps for changed sync domains', async () => {
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [{ id: 1 }],
      resultFeedback: [],
      _updated: Date.now() - 5000,
      _entities: { ledger: Date.now() - 5000, resultFeedback: Date.now() - 5000 },
    }));

    await saveData({ ledger: [{ id: 1 }], resultFeedback: [{ id: 'wf-1' }] });
    const parsed = JSON.parse(localStorage.getItem('promo_engine_v3'));
    expect(parsed._entities.resultFeedback).toBeTypeOf('number');
    expect(parsed._entities.ledger).toBeTypeOf('number');
  });

  it('stamps stable ids for odds comparison rows so tracker merges can reconcile them', async () => {
    await saveData({ oddsCompare: [{ event: 'Chiefs ML', odds: { DraftKings: '-110' } }] });
    const parsed = JSON.parse(localStorage.getItem('promo_engine_v3'));
    expect(parsed.oddsCompare[0]).toEqual(expect.objectContaining({
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    }));
  });

  it('queues a failed remote write for later retry', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.upsert.mockRejectedValueOnce(new Error('offline'));

    await expect(saveData({ ledger: [{ id: 1 }] })).rejects.toThrow('offline');
    const queue = JSON.parse(localStorage.getItem('pg_sync_queue'));
    expect(queue).toHaveLength(1);
    expect(queue[0].data.ledger).toHaveLength(1);
    expect(readSyncDiagnostics()).toEqual(expect.objectContaining({
      queueDepth: 1,
      hasPendingWrites: true,
    }));
  });

  it('appends workflow history when workflow status changes', async () => {
    const now = new Date().toISOString();
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      workflowInbox: [{
        id: 'wf-1',
        title: 'Old workflow',
        status: 'queued',
        updatedAt: new Date(Date.now() - 60_000).toISOString(),
      }],
      workflowHistory: [],
      _updated: Date.now() - 60_000,
    }));

    await saveData({
      workflowInbox: [{
        id: 'wf-1',
        title: 'Old workflow',
        status: 'placed',
        updatedAt: now,
      }],
    });

    const parsed = JSON.parse(localStorage.getItem('promo_engine_v3'));
    expect(parsed.workflowHistory).toHaveLength(1);
    expect(parsed.workflowHistory[0]).toEqual(expect.objectContaining({
      workflowId: 'wf-1',
      fromStatus: 'queued',
      status: 'placed',
    }));
  });
});

// ── loadData ──────────────────────────────────────────────────────────────────

describe('onDailyLogin', () => {
  it("writes today's date key to localStorage on the first call", () => {
    const today = new Date().toISOString().slice(0, 10);
    onDailyLogin();
    expect(localStorage.getItem('_pg_login_day')).toBe(today);
  });

  it('does not trigger a vault event when called a second time the same day', async () => {
    // Pre-seed localStorage as if the user already logged in today
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('_pg_login_day', today);
    onDailyLogin();
    // The function returns before reaching fireVaultEvent → rpc never called
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

// ── onLedgerEntry ─────────────────────────────────────────────────────────────

describe('onLedgerEntry', () => {
  it('does not call supabase.rpc when there is no active session', async () => {
    // Default beforeEach: NO_SESSION
    onLedgerEntry();
    await new Promise((r) => setTimeout(r, 20));
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

// ── onCalculation — points schedule ──────────────────────────────────────────
// These three tests are ORDER-DEPENDENT. _calcCount is module-level state that
// starts at 0 for this file and increments with each onCalculation() call.
// "First call" below means the first invocation across the entire test file.

describe('onCalculation — points schedule', () => {
  it('awards 5 points on the very first calculation of the session', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await onCalculation('BonusBet');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'award_vault_points',
      expect.objectContaining({ p_event_type: 'calculation', p_points: 5 }),
    );
  });

  it('awards 1 point on the second calculation (first-time bonus exhausted)', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await onCalculation('ArbFinder');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'award_vault_points',
      expect.objectContaining({ p_event_type: 'calculation', p_points: 1 }),
    );
  });

  it('continues awarding 1 point on all subsequent calculations', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await onCalculation('KellyCriterion');
    expect(mocks.rpc).toHaveBeenCalledWith(
      'award_vault_points',
      expect.objectContaining({ p_points: 1 }),
    );
  });
});
