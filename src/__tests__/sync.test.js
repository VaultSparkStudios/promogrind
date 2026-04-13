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
}));

vi.mock('../auth.js', () => ({
  supabase: {
    auth: { getSession: mocks.getSession },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
      upsert: mocks.upsert,
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
    // Allow the fire-and-forget upsert to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.upsert).toHaveBeenCalled();
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
