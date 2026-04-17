/**
 * PromoGrind — Unified Analytics
 *
 * Wraps PostHog (behavioral) and Sentry (error monitoring).
 * Both are optional — if the env var is absent, all calls are silent no-ops.
 *
 * Build-time env vars (safe to expose in the client bundle):
 *   VITE_POSTHOG_KEY  — PostHog project key  (phx_…)
 *   VITE_SENTRY_DSN   — Sentry project DSN   (https://…@…ingest.sentry.io/…)
 */

import posthog from 'posthog-js';
import * as Sentry from '@sentry/react';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const SENTRY_DSN  = import.meta.env.VITE_SENTRY_DSN;
const IS_PROD     = import.meta.env.PROD;

let posthogReady = false;
let sentryReady  = false;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initAnalytics() {
  if (POSTHOG_KEY) {
    posthog.init(POSTHOG_KEY, {
      api_host:         'https://us.i.posthog.com',
      capture_pageview: false,   // manual — fired on slug navigation
      capture_pageleave: true,
      persistence:      'localStorage+cookie',
      autocapture:      false,   // intentional tracking only
      session_recording: { maskAllInputs: true, maskTextSelector: '*' },
    });
    posthogReady = true;
  }

  if (SENTRY_DSN && IS_PROD) {
    Sentry.init({
      dsn:                      SENTRY_DSN,
      environment:              'production',
      tracesSampleRate:         0.1,   // 10% of transactions
      replaysOnErrorSampleRate: 1.0,   // 100% replay on errors
      replaysSessionSampleRate: 0.02,  // 2% background sessions
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
      ],
    });
    sentryReady = true;
  }
}

// ── User Identity ─────────────────────────────────────────────────────────────

/**
 * Call once after auth resolves with the Supabase user + subscription row.
 * @param {object} user       — Supabase session.user
 * @param {object|null} sub   — getSubscription() result
 */
function _readUtmAttribution() {
  try {
    return {
      referral_source: localStorage.getItem('pg_ref') || undefined,
      utm_source:      localStorage.getItem('pg_utm_source') || undefined,
      utm_medium:      localStorage.getItem('pg_utm_medium') || undefined,
      utm_campaign:    localStorage.getItem('pg_utm_campaign') || undefined,
    };
  } catch {
    return {};
  }
}

export function identifyUser(user, sub) {
  if (!user) return;
  const plan   = sub?.plan   ?? 'free';
  const status = sub?.status ?? 'none';
  const utm    = _readUtmAttribution();

  if (posthogReady) {
    posthog.identify(user.id, {
      email:  user.email,
      plan,
      status,
      trial:  status === 'trial',
      ...utm,
    });
  }

  if (sentryReady) {
    Sentry.setUser({ id: user.id, email: user.email });
    Sentry.setTag('plan', plan);
  }
}

export function resetAnalytics() {
  if (posthogReady) posthog.reset();
  if (sentryReady)  Sentry.setUser(null);
}

// ── Event Tracking ────────────────────────────────────────────────────────────

/**
 * Fire a named event with optional properties.
 * Safe to call unconditionally — no-ops if PostHog is not initialised.
 */
export function trackEvent(event, props = {}) {
  try {
    if (posthogReady) posthog.capture(event, props);
  } catch {}
}

/**
 * Fire a pageview for a given app slug (e.g. "bonus-bet", "dashboard").
 * Called on every slug navigation in App.jsx.
 */
export function trackPage(slug) {
  try {
    if (posthogReady) {
      const utm = _readUtmAttribution();
      posthog.capture('$pageview', {
        $current_url: `${window.location.origin}/${slug}`,
        slug,
        ...utm,
      });
    }
  } catch {}
}

// Re-exported so main.jsx can wrap the app in a Sentry error boundary
// without importing @sentry/react directly.
export { Sentry };
