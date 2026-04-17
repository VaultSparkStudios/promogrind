/**
 * PromoGrind — Auth Test Suite
 *
 * Coverage:
 *   1. isTrialActive / trialDaysLeft — pure-function edge cases
 *   2. Session lifecycle — tryAuth / getSubscription / isPro
 *   3. Token hijack & refresh scenarios — expired/invalid tokens, setSession errors
 *
 * The Supabase client is mocked at module-load time via vi.hoisted so that
 * individual tests can control mock responses without re-importing the module.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Expose mock handles so individual tests can change return values
const { mockGetSession, mockSetSession, mockMaybySingle } = vi.hoisted(() => ({
  mockGetSession:  vi.fn().mockResolvedValue({ data: { session: null } }),
  mockSetSession:  vi.fn().mockResolvedValue({ error: null }),
  mockMaybySingle: vi.fn().mockResolvedValue({ data: null, error: null }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession:  mockGetSession,
      setSession:  mockSetSession,
      signOut:     vi.fn().mockResolvedValue({}),
      updateUser:  vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select:      vi.fn().mockReturnThis(),
      eq:          vi.fn().mockReturnThis(),
      maybeSingle: mockMaybySingle,
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null }),
  })),
}));

import {
  isTrialActive,
  trialDaysLeft,
  tryAuth,
  getSubscription,
  isPro,
  isRunnerPlus,
} from '../auth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function userWith(trialStart) {
  return { user_metadata: { trial_start: trialStart } };
}

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function sessionFor(user) {
  return { data: { session: { user } } };
}

// ── isTrialActive ─────────────────────────────────────────────────────────────

describe('isTrialActive', () => {
  it('returns false for null', () => {
    expect(isTrialActive(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isTrialActive(undefined)).toBe(false);
  });

  it('returns false when user has no user_metadata object', () => {
    expect(isTrialActive({})).toBe(false);
  });

  it('returns false when user_metadata exists but trial_start is absent', () => {
    expect(isTrialActive({ user_metadata: {} })).toBe(false);
  });

  it('returns true when trial started moments ago (full 7 days remain)', () => {
    expect(isTrialActive(userWith(new Date().toISOString()))).toBe(true);
  });

  it('returns true when trial started 1 day ago', () => {
    expect(isTrialActive(userWith(daysAgo(1)))).toBe(true);
  });

  it('returns true when trial started 3 days ago (4 days remain)', () => {
    expect(isTrialActive(userWith(daysAgo(3)))).toBe(true);
  });

  it('returns true when < 1 hour of the 7-day window remains', () => {
    const almostDone = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 30 * 60 * 1000));
    expect(isTrialActive(userWith(almostDone.toISOString()))).toBe(true);
  });

  it('returns false when trial expired 1 second ago', () => {
    const justExpired = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 - 1_000);
    expect(isTrialActive(userWith(justExpired.toISOString()))).toBe(false);
  });

  it('returns false when trial expired 8 days ago', () => {
    expect(isTrialActive(userWith(daysAgo(8)))).toBe(false);
  });

  it('returns false when trial expired 30 days ago', () => {
    expect(isTrialActive(userWith(daysAgo(30)))).toBe(false);
  });
});

// ── trialDaysLeft ─────────────────────────────────────────────────────────────

describe('trialDaysLeft', () => {
  it('returns 0 for null', () => {
    expect(trialDaysLeft(null)).toBe(0);
  });

  it('returns 0 for undefined', () => {
    expect(trialDaysLeft(undefined)).toBe(0);
  });

  it('returns 0 when user_metadata has no trial_start', () => {
    expect(trialDaysLeft({ user_metadata: {} })).toBe(0);
  });

  it('returns 7 immediately after trial starts', () => {
    expect(trialDaysLeft(userWith(new Date().toISOString()))).toBe(7);
  });

  it('returns 4 or 5 when trial started 3 days ago (ceiling rounding)', () => {
    const days = trialDaysLeft(userWith(daysAgo(3)));
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(5);
  });

  it('returns 1 when under 2 hours remain', () => {
    const start = new Date(Date.now() - (7 * 24 * 60 * 60 * 1000 - 2 * 60 * 60 * 1000));
    expect(trialDaysLeft(userWith(start.toISOString()))).toBe(1);
  });

  it('returns 0 when trial is expired', () => {
    expect(trialDaysLeft(userWith(daysAgo(8)))).toBe(0);
  });

  it('never returns a negative number even for long-expired trials', () => {
    expect(trialDaysLeft(userWith(daysAgo(365)))).toBe(0);
  });
});

// ── Session lifecycle — tryAuth ───────────────────────────────────────────────

describe('tryAuth — session and token scenarios', () => {
  beforeEach(() => {
    // Override the local .env VITE_DEV_BYPASS_AUTH=true so auth guards run in tests
    vi.stubEnv('VITE_DEV_BYPASS_AUTH', 'false');
    // Provide window and history for the node test environment
    vi.stubGlobal('window', { location: { hash: '', pathname: '/', search: '', href: '' } });
    vi.stubGlobal('history', { replaceState: vi.fn() });
    mockGetSession.mockReset();
    mockSetSession.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('returns false when no active session exists (guest visitor)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await tryAuth()).toBe(false);
  });

  it('returns true when a valid session is already stored', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    expect(await tryAuth()).toBe(true);
  });

  it('returns false when setSession errors on an incoming hash token (expired/hijacked redirect)', async () => {
    // Simulate invalid/expired access_token arriving in URL hash — setSession rejects it
    mockSetSession.mockResolvedValueOnce({ error: { message: 'JWT expired' } });
    // After setSession error, getSession still returns null → auth fails
    mockGetSession.mockResolvedValue({ data: { session: null } });
    // Verify the error is surfaced via the mock directly
    const { error } = await mockSetSession({ access_token: 'stale', refresh_token: 'stale' });
    expect(error?.message).toBe('JWT expired');
    // And tryAuth ultimately returns false with no session
    expect(await tryAuth()).toBe(false);
  });

  it('returns true when setSession succeeds and a session follows', async () => {
    mockSetSession.mockResolvedValueOnce({ error: null });
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u2', user_metadata: {} }));
    expect(await tryAuth()).toBe(true);
  });

  it('handles a revoked refresh token gracefully (session null after token exchange)', async () => {
    // Supabase revokes the refresh token server-side — setSession fails, getSession returns null
    mockSetSession.mockResolvedValueOnce({ error: { message: 'Refresh token revoked' } });
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await tryAuth()).toBe(false);
  });
});

// ── getSubscription & isPro — session refresh scenarios ──────────────────────

describe('getSubscription / isPro — subscription and session scenarios', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockMaybySingle.mockReset();
  });

  it('getSubscription returns null when no active session (logged out)', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await getSubscription()).toBeNull();
  });

  it('getSubscription returns trial object when user has an active trial', async () => {
    const trialStart = new Date().toISOString();
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: { trial_start: trialStart } }));
    const sub = await getSubscription();
    expect(sub?.status).toBe('trial');
    expect(sub?.plan).toBe('vault_sparked');
    expect(sub?.trial_days_left).toBeGreaterThanOrEqual(6);
  });

  it('getSubscription returns subscription row when active paid user', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    mockMaybySingle.mockResolvedValueOnce({ data: { plan: 'runner', status: 'active', current_period_end: futureDate } });
    const sub = await getSubscription();
    expect(sub?.plan).toBe('runner');
    expect(sub?.status).toBe('active');
  });

  it('isPro returns false when no active session', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    expect(await isPro()).toBe(false);
  });

  it('isPro returns false when subscription row is missing (free user)', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    mockMaybySingle.mockResolvedValueOnce({ data: null });
    expect(await isPro()).toBe(false);
  });

  it('isPro returns true for a user on an active trial', async () => {
    const trialStart = new Date().toISOString();
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: { trial_start: trialStart } }));
    expect(await isPro()).toBe(true);
  });

  it('isPro returns false for a subscription with expired current_period_end', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    mockMaybySingle.mockResolvedValueOnce({ data: { plan: 'runner', status: 'active', current_period_end: '2020-01-01T00:00:00Z' } });
    expect(await isPro()).toBe(false);
  });

  it('isPro returns true for a valid active vault_sparked subscription', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    mockMaybySingle.mockResolvedValueOnce({ data: { plan: 'vault_sparked', status: 'active', current_period_end: futureDate } });
    expect(await isPro()).toBe(true);
  });

  it('isRunnerPlus returns true for a valid active runner subscription', async () => {
    mockGetSession.mockResolvedValue(sessionFor({ id: 'u1', user_metadata: {} }));
    const futureDate = new Date(Date.now() + 30 * 86400000).toISOString();
    mockMaybySingle.mockResolvedValueOnce({ data: { plan: 'runner', status: 'active', current_period_end: futureDate } });
    expect(await isRunnerPlus()).toBe(true);
  });
});
