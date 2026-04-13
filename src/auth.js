/**
 * PromoGrind — Vault Member Auth Gate
 *
 * Connects to the shared VaultSpark Supabase project.
 * Any Vault-gated tool follows the same three-step pattern:
 *
 *   1. Copy this file into the tool's src/
 *   2. Add VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY to .env
 *   3. Call checkAuth() at app startup; redirect handled automatically
 *
 * ─── ENV SETUP ────────────────────────────────────────────────
 * Create a .env file in the project root (copy from .env.example):
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 * ─────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const VAULT_MEMBER_LOGIN = 'https://vaultsparkstudios.com/vault-member/';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[VaultGate] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Call once on app startup.
 *
 * Handles two cases:
 *   A) Post-redirect from vault-member page: tokens are in the URL hash.
 *      We call setSession(), store them locally, strip the hash.
 *   B) Returning visit: session already in localStorage — nothing to do.
 *
 * Returns true if the user is authenticated.
 * Returns false (and redirects to vault-member) if not.
 */
export async function checkAuth() {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return true;

  // ── Case A: Incoming token redirect ──────────────────────────
  const hash = window.location.hash;
  if (hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.slice(1));
    const access_token  = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type          = params.get('type');

    if (access_token && refresh_token && type === 'vault_access') {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      // Strip tokens from URL regardless of outcome
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (error) {
        console.error('[VaultGate] setSession error:', error.message);
        redirectToLogin();
        return false;
      }
    }
  }

  // ── Case B: Check existing session ───────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirectToLogin();
    return false;
  }

  return true;
}

/**
 * Sign out and return to the vault-member page.
 */
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = VAULT_MEMBER_LOGIN;
}

/**
 * Returns the current session's user, or null.
 */
export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/**
 * Returns the user's subscription row, or null.
 * For paid subscribers: { plan, status, current_period_end }
 * For trial users: { plan: 'vault_sparked', status: 'trial', trial_days_left: N }
 * status 'active' = Pro subscriber. status 'trial' = active trial.
 */
export async function getSubscription() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  // Check trial first
  if (isTrialActive(session.user)) {
    return {
      plan: 'vault_sparked',
      status: 'trial',
      trial_days_left: trialDaysLeft(session.user),
    };
  }

  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', session.user.id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Returns true if the user has an active Pro or VaultSparked subscription,
 * or an active trial.
 * VaultSparked (vault_sparked) is the studio-wide tier that includes all Pro features.
 */
export async function isPro() {
  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status === 'trial') return true;
  if (sub.status !== 'active') return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return ['pro','vault_sparked','sharp','house'].includes(sub.plan);
}

/**
 * Starts a 7-day Pro trial for the current user.
 * Stores trial_start in Supabase user_metadata.
 * Returns true on success, false on failure.
 */
export async function startTrial() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return false;
  if (isTrialActive(session.user)) return true; // already on trial
  const { error } = await supabase.auth.updateUser({
    data: { trial_start: new Date().toISOString() },
  });
  return !error;
}

/**
 * Returns true if the user's 7-day trial is currently active.
 * @param {object} user - Supabase user object (session.user)
 */
export function isTrialActive(user) {
  if (!user?.user_metadata?.trial_start) return false;
  const start = new Date(user.user_metadata.trial_start);
  const expires = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  return new Date() < expires;
}

/**
 * Returns the number of days remaining in the user's trial, or 0 if expired/no trial.
 * @param {object} user - Supabase user object (session.user)
 */
export function trialDaysLeft(user) {
  if (!user?.user_metadata?.trial_start) return 0;
  const start = new Date(user.user_metadata.trial_start);
  const expires = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  const ms = expires - new Date();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export async function isConcierge() {
  const sub = await getSubscription();
  if (!sub) return false;
  return sub.plan === 'concierge' && sub.status === 'active';
}

export async function isAgency() {
  const sub = await getSubscription();
  if (!sub) return false;
  return sub.plan === 'agency' && sub.status === 'active';
}

/**
 * Scout+ — cloud sync, PromoChat, export, push notifications.
 * Includes: scout, runner, closer, house, and legacy plans.
 */
export async function isScoutPlus() {
  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status === 'trial') return true;
  if (sub.status !== 'active') return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return ['scout','runner','closer','house','pro','vault_sparked','grinder','sharp'].includes(sub.plan);
}

/**
 * Runner+ — unlimited PromoChat, unlimited PromoAdvisor, AI Action Plan.
 * Includes: runner, closer, house, and legacy pro/vault_sparked plans.
 */
export async function isRunnerPlus() {
  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status === 'trial') return true;
  if (sub.status !== 'active') return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return ['runner','closer','house','pro','vault_sparked','sharp'].includes(sub.plan);
}

/**
 * Closer+ — Live Scanner, Stack Builder.
 * Includes: closer, house, vault_sparked.
 */
export async function isCloserPlus() {
  const sub = await getSubscription();
  if (!sub) return false;
  if (sub.status === 'trial') return true;
  if (sub.status !== 'active') return false;
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return false;
  return ['closer','house','vault_sparked'].includes(sub.plan);
}

/**
 * Returns the display tier name for a plan string.
 * @param {string} plan - raw plan value from subscriptions table
 */
export function getTierName(plan) {
  const names = {
    scout:         'Scout',
    runner:        'Runner',
    closer:        'Closer',
    house:         'The House',
    grinder:       'Scout',
    sharp:         'Runner',
    pro:           'Runner',
    vault_sparked: 'Closer',
    concierge:     'Scout',
    agency:        'The House',
  };
  return names[plan] ?? 'Free Agent';
}

/**
 * Kicks off a Stripe Checkout session.
 * @param {string} [planId] - "scout_monthly"|"scout_annual"|"runner_monthly"|"runner_annual"|"closer_monthly"|"closer_annual"|"house" (defaults to "runner_monthly")
 * Redirects the browser to Stripe's hosted payment page.
 */
export async function startCheckout(planId = 'monthly') {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { redirectToLogin(); return; }

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { plan: planId },
  });

  if (error) {
    console.error('[PromoGrind] Checkout error:', error);
    return;
  }

  // Test mode — Stripe not yet configured (pending live keys)
  if (data?.test_mode) {
    console.warn('[PromoGrind] Stripe test mode — checkout not yet live. Set STRIPE_SECRET_KEY (sk_live_...) and STRIPE_TEST_MODE=false in Supabase secrets.');
    // Dispatch a custom event so the UI can show a friendly message without alert()
    window.dispatchEvent(new CustomEvent('pg:checkout-unavailable', { detail: { reason: 'test_mode' } }));
    return;
  }

  if (data?.checkout_url) {
    window.location.href = data.checkout_url;
  } else {
    console.error('[PromoGrind] No checkout URL returned:', data);
  }
}

/**
 * Like checkAuth() but never redirects.
 * Returns true if a valid session exists, false if the visitor is a guest.
 * Use this when the app should be accessible without login (calculators, etc.).
 */
export async function tryAuth() {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return true;

  // ── Case A: Incoming token redirect ──────────────────────────
  const hash = window.location.hash;
  if (hash.includes('access_token=')) {
    const params = new URLSearchParams(hash.slice(1));
    const access_token  = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    const type          = params.get('type');

    if (access_token && refresh_token && type === 'vault_access') {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      history.replaceState(null, '', window.location.pathname + window.location.search);
      if (error) {
        console.error('[VaultGate] setSession error:', error.message);
        return false;
      }
    }
  }

  // ── Case B: Check existing session ───────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// ── Internal ───────────────────────────────────────────────────

function redirectToLogin() {
  // Preserve the full URL (including path and query) so the user returns to the
  // exact page they were trying to reach after logging in.
  const next = encodeURIComponent(window.location.href);
  window.location.href = `${VAULT_MEMBER_LOGIN}?next=${next}`;
}
