/**
 * PromoGrind — account auth
 *
 * Connects to the PromoGrind Supabase auth project.
 * The app follows the same three-step pattern:
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
import { trackEvent } from './analytics.js';
import { CANONICAL_APP_URL, getProjectAuthHref } from './launchState.js';
import { recordTrustReceipt } from './lib/trustReceipts.js';
import { buildMarketingConsent } from './lib/marketingConsent.js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[PromoGrindAuth] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const SESSION_HASH_TYPES = new Set([
  'vault_access',
  'recovery',
  'signup',
  'magiclink',
  'invite',
  'email_change',
]);

function readCheckoutAttribution() {
  try {
    return {
      referral_source: localStorage.getItem('pg_ref') || null,
      utm_source: localStorage.getItem('pg_utm_source') || null,
      utm_medium: localStorage.getItem('pg_utm_medium') || null,
      utm_campaign: localStorage.getItem('pg_utm_campaign') || null,
    };
  } catch {
    return {
      referral_source: null,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    };
  }
}

function getAuthRedirectUrl(mode = 'signin') {
  try {
    const current = typeof window !== 'undefined' ? window.location.href : CANONICAL_APP_URL;
    return getProjectAuthHref(mode, current);
  } catch {
    return getProjectAuthHref(mode, CANONICAL_APP_URL);
  }
}

async function applySessionFromHash({ redirectOnError = false } = {}) {
  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  if (!hash.includes('access_token=')) return true;

  const params = new URLSearchParams(hash.slice(1));
  const access_token  = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  const type          = params.get('type');

  if (!access_token || !refresh_token || !SESSION_HASH_TYPES.has(type)) return true;

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  history.replaceState(null, '', window.location.pathname + window.location.search);
  if (error) {
    console.error('[PromoGrindAuth] setSession error:', error.message);
    if (redirectOnError) redirectToLogin();
    return false;
  }
  return true;
}

/**
 * Call once on app startup.
 *
 * Handles two cases:
 *   A) Post-redirect from a PromoGrind auth email or recovery link: tokens are in the URL hash.
 *      We call setSession(), store them locally, strip the hash.
 *   B) Returning visit: session already in localStorage — nothing to do.
 *
 * Returns true if the user is authenticated.
 * Returns false (and routes to the PromoGrind sign-in surface) if not.
 */
export async function checkAuth() {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return true;

  // ── Case A: Incoming token redirect ──────────────────────────
  const applied = await applySessionFromHash({ redirectOnError: true });
  if (!applied) return false;

  // ── Case B: Check existing session ───────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirectToLogin();
    return false;
  }

  return true;
}

/**
 * Sign out and return to the PromoGrind app.
 */
export async function signOut() {
  await supabase.auth.signOut();
  window.location.href = CANONICAL_APP_URL;
}

export async function signInToPromoGrind({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(email || '').trim(),
    password,
  });
  if (error) throw error;
  recordTrustReceipt({
    type: "account",
    title: "Signed in to PromoGrind",
    summary: "Your browser received a Supabase session for this PromoGrind account.",
    stored: ["session token in Supabase client storage"],
    notStored: ["password"],
    undo: "Sign out from the account menu.",
    dedupeKey: "account:signin",
  });
  return data;
}

export async function createPromoGrindAccount({
  email,
  password,
  displayName,
  marketingOptIn = false,
}) {
  const cleanEmail = String(email || '').trim();
  const cleanDisplayName = String(displayName || '').trim().slice(0, 24);
  // Attach referral/UTM attribution stored by LandingRoute on first visit
  let referralSource;
  try { referralSource = localStorage.getItem('pg_ref') || undefined; } catch {}
  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl('signin'),
      data: {
        display_name: cleanDisplayName,
        username: cleanDisplayName,
        newsletter: marketingOptIn === true,
        ...buildMarketingConsent(marketingOptIn === true, {
          source: 'signup-checkbox',
        }),
        signup_source: 'promogrind',
        project_account_origin: 'promogrind',
        ...(referralSource && { referral_source: referralSource }),
      },
    },
  });
  if (error) throw error;
  recordTrustReceipt({
    type: "account",
    title: "PromoGrind account created",
    summary: "The account request was sent to PromoGrind auth with project-only signup metadata.",
    stored: ["email", "display name", "marketing preference", "PromoGrind signup source"],
    notStored: ["Studio membership claim", "password in app storage"],
    undo: "Use account help for deletion or sign out from the account menu.",
    dedupeKey: `account:signup:${cleanEmail}`,
  });
  return data;
}

export async function updateMarketingConsent(granted) {
  const metadata = buildMarketingConsent(granted === true);
  const { data, error } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      newsletter: metadata.marketing_consent,
    },
  });
  if (error) throw error;
  recordTrustReceipt({
    type: "privacy",
    title: metadata.marketing_consent
      ? "Marketing email consent granted"
      : "Marketing email consent withdrawn",
    summary: metadata.marketing_consent
      ? "PromoGrind recorded your affirmative choice to receive product and promotional email."
      : "PromoGrind recorded your choice not to receive product and promotional email.",
    stored: ["consent state", "consent version", "choice timestamp", "choice surface"],
    notStored: ["a marketing opt-in inferred from account creation or product use"],
    undo: "Change Marketing email in account preferences at any time.",
    dedupeKey: `privacy:marketing:${metadata.marketing_consent}`,
    dedupeMs: 0,
  });
  return data;
}

export async function resendPromoGrindConfirmation(email) {
  const cleanEmail = String(email || '').trim();
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: {
      emailRedirectTo: getAuthRedirectUrl('signin'),
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPromoGrindPassword(email) {
  const cleanEmail = String(email || '').trim();
  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: getAuthRedirectUrl('update-password'),
  });
  if (error) throw error;
  return data;
}

export async function updatePromoGrindPassword(password) {
  const { data, error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  return data;
}

export async function saveSharedDisplayName(displayName) {
  const cleanDisplayName = String(displayName || '').trim().slice(0, 24);
  const { data, error } = await supabase.auth.updateUser({
    data: {
      display_name: cleanDisplayName,
      username: cleanDisplayName,
    },
  });
  if (error) throw error;
  return data;
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
  const attribution = readCheckoutAttribution();

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { plan: planId, attribution },
  });

  if (error) {
    console.error('[PromoGrind] Checkout error:', error);
    return;
  }

  // Test mode — Stripe not yet configured (pending live keys)
  if (data?.test_mode) {
    console.warn('[PromoGrind] Stripe test mode — checkout not yet live. Set STRIPE_SECRET_KEY (sk_live_...) and STRIPE_TEST_MODE=false in Supabase secrets.');
    trackEvent('paid_checkout_started', {
      plan: planId,
      mode: 'test',
      ...attribution,
    });
    // Dispatch a custom event so the UI can show a friendly message without alert()
    window.dispatchEvent(new CustomEvent('pg:checkout-unavailable', { detail: { reason: 'test_mode' } }));
    recordTrustReceipt({
      type: "billing",
      title: "Checkout unavailable",
      summary: "PromoGrind did not create a live Stripe checkout because billing is still in test mode.",
      stored: ["checkout intent analytics"],
      notStored: ["payment method", "subscription"],
      undo: "No billing action is required.",
      dedupeKey: `billing:test:${planId}`,
    });
    return;
  }

  if (data?.checkout_url) {
    trackEvent('paid_checkout_started', {
      plan: planId,
      mode: 'live',
      ...attribution,
    });
    recordTrustReceipt({
      type: "billing",
      title: "Stripe checkout started",
      summary: "PromoGrind opened Stripe-hosted checkout for the selected plan.",
      stored: ["plan id", "referral attribution when present"],
      notStored: ["card number inside PromoGrind"],
      undo: "Manage or cancel billing through the Stripe portal after purchase.",
      dedupeKey: `billing:checkout:${planId}`,
    });
    window.location.href = data.checkout_url;
  } else {
    console.error('[PromoGrind] No checkout URL returned:', data);
  }
}

/**
 * Opens the Stripe Customer Portal for billing management.
 * Looks up the user's stripe_customer_id from the subscriptions table via
 * the customer-portal edge function, then redirects to Stripe's hosted portal.
 *
 * If no billing record exists (free-tier user), dispatches pg:billing-unavailable
 * so the UI can show a friendly message without alert().
 */
export async function manageBilling() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { redirectToLogin(); return; }

  const { data, error } = await supabase.functions.invoke('customer-portal', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (error || !data?.portal_url) {
    const reason = data?.error ?? error?.message ?? 'unknown';
    console.error('[PromoGrind] Billing portal error:', reason);
    window.dispatchEvent(new CustomEvent('pg:billing-unavailable', { detail: { reason } }));
    recordTrustReceipt({
      type: "billing",
      title: "Billing portal unavailable",
      summary: "PromoGrind could not open a Stripe portal for this account.",
      stored: ["portal error reason"],
      notStored: ["new billing changes"],
      undo: "Contact account help if the portal should exist.",
      dedupeKey: `billing:portal:${reason}`,
    });
    return;
  }

  recordTrustReceipt({
    type: "billing",
    title: "Billing portal opened",
    summary: "PromoGrind redirected you to Stripe-hosted billing management.",
    stored: ["portal request"],
    notStored: ["card number inside PromoGrind"],
    undo: "Use Stripe portal controls for subscription changes.",
    dedupeKey: "billing:portal-opened",
  });
  window.location.href = data.portal_url;
}

/**
 * Redeems a beta invite code for the current user.
 * On success: grants Runner tier for 30 days (or whatever the code specifies).
 * Returns { success, tier, expires_at, duration_days, message } on success.
 * Returns { error } string on failure.
 */
export async function redeemBetaCode(code) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { redirectToLogin(); return { error: 'Not signed in' }; }

  const { data, error } = await supabase.functions.invoke('redeem-beta-code', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { code },
  });

  if (error) {
    console.error('[PromoGrind] Beta code error:', error);
    return { error: error.message ?? 'Failed to redeem code' };
  }

  return data;
}

/**
 * Like checkAuth() but never redirects.
 * Returns true if a valid session exists, false if the visitor is a guest.
 * Use this when the app should be accessible without login (calculators, etc.).
 */
export async function tryAuth() {
  if (import.meta.env.VITE_DEV_BYPASS_AUTH === 'true') return true;

  // ── Case A: Incoming token redirect ──────────────────────────
  const applied = await applySessionFromHash();
  if (!applied) return false;

  // ── Case B: Check existing session ───────────────────────────
  const { data: { session } } = await supabase.auth.getSession();
  return !!session;
}

// ── Internal ───────────────────────────────────────────────────

function redirectToLogin() {
  window.location.href = getProjectAuthHref('signin', window.location.href);
}
