/**
 * PromoGrind — Auth Pure-Function Tests
 *
 * Tests isTrialActive() and trialDaysLeft() without any network calls.
 * The Supabase client is mocked at module-load time so createClient()
 * never runs with undefined credentials.
 */

import { describe, it, expect, vi } from 'vitest';

// Block Supabase instantiation — auth.js calls createClient at import time
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession:  vi.fn().mockResolvedValue({ data: { session: null } }),
      signOut:     vi.fn().mockResolvedValue({}),
      updateUser:  vi.fn().mockResolvedValue({ error: null }),
      setSession:  vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn(() => ({
      select:     vi.fn().mockReturnThis(),
      eq:         vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
}));

import { isTrialActive, trialDaysLeft } from '../auth.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal Supabase user object with a given trial_start ISO string. */
function userWith(trialStart) {
  return { user_metadata: { trial_start: trialStart } };
}

/** ISO timestamp for N whole days before now. */
function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
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
    // ceil(≈7.000) = 7
    expect(trialDaysLeft(userWith(new Date().toISOString()))).toBe(7);
  });

  it('returns 4 or 5 when trial started 3 days ago (ceiling rounding)', () => {
    // Exactly 3 days elapsed → 4.xxx remaining → ceil = 4 or 5 depending on ms
    const days = trialDaysLeft(userWith(daysAgo(3)));
    expect(days).toBeGreaterThanOrEqual(4);
    expect(days).toBeLessThanOrEqual(5);
  });

  it('returns 1 when under 2 hours remain', () => {
    // 6 days 22 hours elapsed → 2 hours left → ceil(2/24) = 1
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
