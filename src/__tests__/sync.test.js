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

import { saveData, loadData, onCalculation, onLedgerEntry, onDailyLogin } from '../sync.js';

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

  it('queues a failed remote write for later retry', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.upsert.mockRejectedValueOnce(new Error('offline'));

    await expect(saveData({ ledger: [{ id: 1 }] })).rejects.toThrow('offline');
    const queue = JSON.parse(localStorage.getItem('pg_sync_queue'));
    expect(queue).toHaveLength(1);
    expect(queue[0].data.ledger).toHaveLength(1);
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

describe('loadData', () => {
  it('returns an empty object when localStorage is empty and there is no session', async () => {
    const result = await loadData();
    expect(result).toEqual({});
  });

  it('returns locally-stored data when there is no session (offline / unauthenticated)', async () => {
    const sample = { ledger: [{ id: 99 }], _updated: Date.now() };
    localStorage.setItem('promo_engine_v3', JSON.stringify(sample));
    const result = await loadData();
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0].id).toBe(99);
  });

  it('returns an empty object when localStorage contains corrupt JSON', async () => {
    localStorage.setItem('promo_engine_v3', 'not{json{{');
    const result = await loadData();
    expect(result).toEqual({});
  });

  it('pushes local data to Supabase on first authenticated load (no remote row)', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null }); // no remote row
    localStorage.setItem('promo_engine_v3', JSON.stringify({ ledger: [{ id: 5 }] }));
    await loadData();
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'test-user-1' }),
      expect.any(Object),
    );
  });

  it('returns remote data when the remote row is newer than local', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const remoteTs = new Date(Date.now() + 10_000).toISOString(); // future timestamp
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger:     [{ id: 7 }],
        tracker:    { done: { DraftKings: true } },
        updated_at: remoteTs,
      },
      error: null,
    });
    localStorage.setItem('promo_engine_v3', JSON.stringify({ ledger: [], _updated: Date.now() - 5_000 }));
    const result = await loadData();
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0].id).toBe(7);
  });

  it('merges newer local entity slices over a newer remote row', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const now = Date.now();
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [{ id: 1, profit: '5' }],
      workflowInbox: [{ id: 'local-wf', title: 'Local workflow' }],
      _updated: now - 2000,
      _entities: { ledger: now - 4000, workflowInbox: now + 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [{ id: 7 }],
        tracker: {
          workflowInbox: [{ id: 'remote-wf', title: 'Remote workflow' }],
          _entities: { ledger: now + 5000, workflowInbox: now - 5000 },
        },
        updated_at: new Date(now + 5000).toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.ledger[0].id).toBe(7);
    expect(result.workflowInbox[0].id).toBe('local-wf');
  });

  it('hydrates workflow state and history from dedicated remote tables', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {},
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    mocks.tableSelect.mockImplementation(async (table) => {
      if (table === 'workflow_state') {
        return {
          data: [{
            user_id: 'test-user-1',
            workflow_id: 'wf-remote',
            calculator_slug: 'bonus-bet',
            calculator_label: 'Bonus Bet',
            title: 'Remote workflow',
            status: 'ready',
            source: 'promo_advisor',
            created_at: '2026-04-15T10:00:00.000Z',
            updated_at: '2026-04-15T11:00:00.000Z',
          }],
          error: null,
        };
      }
      return {
        data: [{
          event_key: 'wf-remote:ready:2026-04-15T11:00:00.000Z',
          workflow_id: 'wf-remote',
          from_status: null,
          status: 'ready',
          source: 'promo_advisor',
          title: 'Remote workflow',
          calculator_slug: 'bonus-bet',
          promo_type: 'bonus_bet',
          book: 'DraftKings',
          expected_profit: 22.5,
          actual_profit: null,
          event_at: '2026-04-15T11:00:00.000Z',
        }],
        error: null,
      };
    });

    const result = await loadData();
    expect(result.workflowInbox[0]).toEqual(expect.objectContaining({
      id: 'wf-remote',
      status: 'ready',
      title: 'Remote workflow',
    }));
    expect(result.workflowHistory[0]).toEqual(expect.objectContaining({
      workflowId: 'wf-remote',
    }));
  });

  it('hydrates dedicated ledger and tracker state from remote entity tables', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [{ id: 'blob-ledger' }],
        tracker: { done: { FanDuel: true } },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    mocks.tableMaybeSingle.mockImplementation(async (table) => {
      if (table === 'ledger_state') {
        return {
          data: {
            user_id: 'test-user-1',
            ledger: [{ id: 'entity-ledger', profit: '12.00' }],
            updated_at: '2026-04-15T12:00:00.000Z',
          },
          error: null,
        };
      }
      if (table === 'tracker_state') {
        return {
          data: {
            user_id: 'test-user-1',
            tracker: {
              done: { DraftKings: true },
              customFlag: 'entity-tracker',
            },
            updated_at: '2026-04-15T12:30:00.000Z',
          },
          error: null,
        };
      }
      return { data: null, error: null };
    });

    const result = await loadData();
    expect(result.ledger).toEqual([{ id: 'entity-ledger', profit: '12.00' }]);
    expect(result.done).toEqual({ DraftKings: true });
    expect(result.customFlag).toBe('entity-tracker');
  });

  it('flushes queued writes before reading remote state', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('pg_sync_queue', JSON.stringify([
      { data: { ledger: [{ id: 9 }], _updated: Date.now() }, queuedAt: Date.now() },
    ]));
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });

    await loadData();
    expect(mocks.upsert).toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem('pg_sync_queue'))).toEqual([]);
  });
});

// ── onDailyLogin ──────────────────────────────────────────────────────────────

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
