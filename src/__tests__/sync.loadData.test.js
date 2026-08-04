import { describe, it, expect, beforeEach, vi } from 'vitest';

const _store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(_store, k) ? _store[k] : null),
  setItem: (k, v) => { _store[k] = String(v); },
  removeItem: (k) => { delete _store[k]; },
  clear: () => { Object.keys(_store).forEach((k) => delete _store[k]); },
};

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
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
          if (table === 'promogrind_data') return { maybeSingle: mocks.maybeSingle };
          if (table === 'workflow_state' || table === 'workflow_history') return mocks.tableSelect(table);
          return { maybeSingle: () => mocks.tableMaybeSingle(table) };
        }),
      })),
      upsert: (...args) => {
        if (table === 'promogrind_data') return mocks.upsert(...args);
        return mocks.tableUpsert(table, ...args);
      },
    })),
    rpc: mocks.rpc,
  },
}));

import { loadData, saveData, readSyncDiagnostics } from '../sync.js';

const NO_SESSION = { data: { session: null } };
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

  it('quarantines historical demo profit before an offline load can expose it as evidence', async () => {
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [{
        id: 'ledger-demo-legacy',
        date: '2026-08-04',
        book: 'DraftKings',
        profit: '138.60',
        notes: 'Demo entry — replace with your actual result',
      }],
    }));

    const result = await loadData();
    expect(result.ledger).toEqual([]);
    expect(result._ledgerQuarantine).toEqual([
      expect.objectContaining({
        key: 'ledger-demo-legacy',
        reason: 'legacy-demo-id',
        entry: expect.objectContaining({ id: 'ledger-demo-legacy' }),
      }),
    ]);
    expect(result._tombstones.ledger['ledger-demo-legacy']).toEqual(expect.any(Number));
    expect(JSON.parse(localStorage.getItem('promo_engine_v3')).ledger).toEqual([]);
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
    expect(result.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 7 }),
      expect.objectContaining({ id: 1 }),
    ]));
    expect(result.workflowInbox).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'local-wf' }),
      expect.objectContaining({ id: 'remote-wf' }),
    ]));
  });

  it('keeps both local and remote ledger entries when devices append independently', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [
        { id: 'local-ledger', book: 'DraftKings', profit: '12.50', date: '2026-04-16' },
      ],
      _updated: Date.now() - 1000,
      _entities: { ledger: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [
          { id: 'remote-ledger', book: 'FanDuel', profit: '7.25', date: '2026-04-15' },
        ],
        tracker: { _entities: { ledger: Date.now() - 2000 } },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.ledger).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'local-ledger' }),
      expect.objectContaining({ id: 'remote-ledger' }),
    ]));
  });

  it('does not resurrect a remotely stale ledger row after an offline deletion', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const deletedAt = Date.now();
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [],
      _tombstones: { ledger: { 'ledger-gone': deletedAt } },
      _updated: deletedAt,
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [{ id: 'ledger-gone', profit: '12', updatedAt: new Date(deletedAt - 5000).toISOString() }],
        tracker: {},
        updated_at: new Date(deletedAt + 1000).toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.ledger).toEqual([]);
    expect(result._tombstones.ledger['ledger-gone']).toBe(deletedAt);
  });

  it('allows an explicit edit newer than a tombstone to restore the same entity id', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const deletedAt = Date.now();
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [],
      _tombstones: { ledger: { 'ledger-restored': deletedAt } },
      _updated: deletedAt,
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [{ id: 'ledger-restored', profit: '18', updatedAt: new Date(deletedAt + 5000).toISOString() }],
        tracker: {},
        updated_at: new Date(deletedAt + 6000).toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.ledger).toEqual([expect.objectContaining({ id: 'ledger-restored', profit: '18' })]);
  });

  it('applies tombstones independently across workflow and journal domains', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    const deletedAt = Date.now();
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      workflowInbox: [],
      journal: [],
      _tombstones: {
        workflowInbox: { 'wf-gone': deletedAt },
        journal: { 'journal-gone': deletedAt },
      },
      _updated: deletedAt,
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {
          workflowInbox: [{ id: 'wf-gone', title: 'Stale', status: 'queued', updatedAt: new Date(deletedAt - 1000).toISOString() }],
          journal: [{ id: 'journal-gone', date: '2026-08-01', profit: '3' }],
        },
        updated_at: new Date(deletedAt + 1000).toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.workflowInbox).toEqual([]);
    expect(result.journal).toEqual([]);
  });

  it('ignores malformed tombstone clocks instead of suppressing valid remote evidence', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      ledger: [],
      _tombstones: { ledger: { 'ledger-valid': 'not-a-clock' } },
      _updated: Date.now() - 1000,
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [{ id: 'ledger-valid', profit: '7', updatedAt: '2026-08-04T08:00:00.000Z' }],
        tracker: {},
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.ledger).toEqual([expect.objectContaining({ id: 'ledger-valid' })]);
  });

  it('prefers the newer workflow row while preserving other workflows from both devices', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      workflowInbox: [
        {
          id: 'wf-shared',
          title: 'Shared workflow',
          status: 'waiting',
          updatedAt: '2026-04-16T12:05:00.000Z',
          createdAt: '2026-04-16T12:00:00.000Z',
        },
        {
          id: 'wf-local-only',
          title: 'Local only workflow',
          status: 'ready',
          updatedAt: '2026-04-16T12:04:00.000Z',
          createdAt: '2026-04-16T12:04:00.000Z',
        },
      ],
      _updated: Date.now() - 1000,
      _entities: { workflowInbox: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {
          workflowInbox: [
            {
              id: 'wf-shared',
              title: 'Shared workflow',
              status: 'queued',
              updatedAt: '2026-04-16T12:01:00.000Z',
              createdAt: '2026-04-16T12:00:00.000Z',
            },
            {
              id: 'wf-remote-only',
              title: 'Remote only workflow',
              status: 'placed',
              updatedAt: '2026-04-16T12:03:00.000Z',
              createdAt: '2026-04-16T12:03:00.000Z',
            },
          ],
          _entities: { workflowInbox: Date.now() - 2000 },
        },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.workflowInbox).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'wf-shared', status: 'waiting' }),
      expect.objectContaining({ id: 'wf-local-only' }),
      expect.objectContaining({ id: 'wf-remote-only' }),
    ]));
  });

  it('unions workflow history rows from both local and remote stores', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      workflowHistory: [
        {
          eventKey: 'wf-local:queued:2026-04-16T12:00:00.000Z',
          workflowId: 'wf-local',
          status: 'queued',
          eventAt: '2026-04-16T12:00:00.000Z',
        },
      ],
      _updated: Date.now() - 1000,
      _entities: { workflowHistory: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: { _entities: { workflowHistory: Date.now() - 2000 } },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });
    mocks.tableSelect.mockImplementation(async (table) => {
      if (table === 'workflow_state') return { data: [], error: null };
      return {
        data: [
          {
            event_key: 'wf-remote:ready:2026-04-16T12:10:00.000Z',
            workflow_id: 'wf-remote',
            from_status: 'queued',
            status: 'ready',
            source: 'promo_advisor',
            title: 'Remote workflow',
            calculator_slug: 'bonus-bet',
            promo_type: 'bonus_bet',
            book: 'FanDuel',
            expected_profit: 18,
            actual_profit: null,
            event_at: '2026-04-16T12:10:00.000Z',
          },
        ],
        error: null,
      };
    });

    const result = await loadData();
    expect(result.workflowHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({ eventKey: 'wf-local:queued:2026-04-16T12:00:00.000Z' }),
      expect.objectContaining({ eventKey: 'wf-remote:ready:2026-04-16T12:10:00.000Z' }),
    ]));
  });

  it('merges promo value history per promo key instead of replacing the whole tracker slice', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      promoValueHistory: {
        'DraftKings-Bonus Bet': [
          { date: '2026-04-15', value: 22 },
          { date: '2026-04-16', value: 25 },
        ],
      },
      _updated: Date.now() - 1000,
      _entities: { promoValueHistory: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {
          promoValueHistory: {
            'DraftKings-Bonus Bet': [
              { date: '2026-04-14', value: 18 },
            ],
            'FanDuel-Profit Boost': [
              { date: '2026-04-16', value: 12 },
            ],
          },
          _entities: { promoValueHistory: Date.now() - 2000 },
        },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.promoValueHistory['DraftKings-Bonus Bet']).toEqual([
      { date: '2026-04-14', value: 18 },
      { date: '2026-04-15', value: 22 },
      { date: '2026-04-16', value: 25 },
    ]);
    expect(result.promoValueHistory['FanDuel-Profit Boost']).toEqual([
      { date: '2026-04-16', value: 12 },
    ]);
  });

  it('keeps both local and remote journal entries when devices add notes independently', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      journal: [
        { id: 'journal-local', book: 'DraftKings', type: 'Bonus Bet', profit: '12', date: '2026-04-16' },
      ],
      _updated: Date.now() - 1000,
      _entities: { journal: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {
          journal: [
            { id: 'journal-remote', book: 'FanDuel', type: 'Profit Boost', profit: '8', date: '2026-04-15' },
          ],
          _entities: { journal: Date.now() - 2000 },
        },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.journal).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'journal-local' }),
      expect.objectContaining({ id: 'journal-remote' }),
    ]));
  });

  it('preserves newer local odds-compare edits while keeping remote rows from other devices', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    localStorage.setItem('promo_engine_v3', JSON.stringify({
      oddsCompare: [
        {
          id: 'shared-row',
          event: 'Chiefs ML',
          odds: { DraftKings: '-105' },
          createdAt: '2026-04-16T12:00:00.000Z',
          updatedAt: '2026-04-16T12:10:00.000Z',
        },
      ],
      _updated: Date.now() - 1000,
      _entities: { oddsCompare: Date.now() - 1000 },
    }));
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ledger: [],
        tracker: {
          oddsCompare: [
            {
              id: 'shared-row',
              event: 'Chiefs ML',
              odds: { DraftKings: '-110' },
              createdAt: '2026-04-16T12:00:00.000Z',
              updatedAt: '2026-04-16T12:05:00.000Z',
            },
            {
              id: 'remote-row',
              event: 'Bills ML',
              odds: { FanDuel: '+120' },
              createdAt: '2026-04-16T12:06:00.000Z',
              updatedAt: '2026-04-16T12:06:00.000Z',
            },
          ],
          _entities: { oddsCompare: Date.now() - 2000 },
        },
        updated_at: new Date().toISOString(),
      },
      error: null,
    });

    const result = await loadData();
    expect(result.oddsCompare).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'shared-row', odds: { DraftKings: '-105' } }),
      expect.objectContaining({ id: 'remote-row', event: 'Bills ML' }),
    ]));
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

  it('reports compact sync diagnostics after a successful remote save', async () => {
    mocks.getSession.mockResolvedValue(WITH_SESSION);
    await saveData({
      workflowInbox: [{ id: 'wf-1', title: 'Workflow' }],
      resultFeedback: [{ id: 'rf-1', status: 'queued' }],
    });

    expect(readSyncDiagnostics()).toEqual(expect.objectContaining({
      queueDepth: 0,
      hasPendingWrites: false,
    }));
  });
});

// ── onDailyLogin ──────────────────────────────────────────────────────────────
