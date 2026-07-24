/**
 * PromoGrind — Unified Analytics
 *
 * This module intentionally avoids static imports of PostHog / Sentry so the
 * main app bundle does not pay their parse cost on first paint. Libraries are
 * loaded only when analytics is actually initialised.
 */
import { createTelemetryBuffer } from "./lib/telemetryBuffer.js";

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_ENABLED = import.meta.env.VITE_POSTHOG_ENABLED === "true";
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const IS_PROD = import.meta.env.PROD;

let posthogReady = false;
let sentryReady = false;
let initPromise = null;
let posthogClient = null;
let sentryModule = null;
const pendingExceptions = createTelemetryBuffer(10);

function readUtmAttribution() {
  try {
    return {
      referral_source: localStorage.getItem("pg_ref") || undefined,
      utm_source: localStorage.getItem("pg_utm_source") || undefined,
      utm_medium: localStorage.getItem("pg_utm_medium") || undefined,
      utm_campaign: localStorage.getItem("pg_utm_campaign") || undefined,
    };
  } catch {
    return {};
  }
}

export function initAnalytics() {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const tasks = [];

    if (POSTHOG_ENABLED && POSTHOG_KEY) {
      tasks.push(
        import("posthog-js").then((module) => {
          const posthog = module.default;
          posthog.init(POSTHOG_KEY, {
            api_host: "https://us.i.posthog.com",
            capture_pageview: false,
            capture_pageleave: true,
            persistence: "localStorage+cookie",
            autocapture: false,
            // PromoGrind uses Supabase-backed feature flags — disable PostHog polling/remote config
            advanced_disable_decide: true,
            advanced_disable_feature_flags: true,
            advanced_disable_feature_flags_on_first_load: true,
            advanced_disable_toolbar_metrics: true,
            disable_surveys: true,
            disable_session_recording: false,
            // Silence verbose console output in production; keep dev signal
            debug: !IS_PROD,
            loaded: (ph) => {
              if (IS_PROD) {
                try { ph.debug(false); } catch {}
              }
            },
            session_recording: { maskAllInputs: true, maskTextSelector: "*" },
          });
          posthogClient = posthog;
          posthogReady = true;
        }),
      );
    }

    if (SENTRY_DSN && IS_PROD) {
      tasks.push(
        import("@sentry/react").then((module) => {
          module.init({
            dsn: SENTRY_DSN,
            environment: "production",
            tracesSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,
            replaysSessionSampleRate: 0.02,
            integrations: [
              module.browserTracingIntegration(),
              module.replayIntegration({ maskAllText: true, blockAllMedia: true }),
            ],
          });
          sentryModule = module;
          sentryReady = true;
          pendingExceptions.drain((error, context) => module.captureException(error, { extra: context }));
        }),
      );
    }

    await Promise.all(tasks);
  })().catch(() => {});

  return initPromise;
}

export function identifyUser(user, sub) {
  if (!user) return;
  const plan = sub?.plan ?? "free";
  const status = sub?.status ?? "none";
  const utm = readUtmAttribution();

  if (posthogReady && posthogClient) {
    posthogClient.identify(user.id, {
      email: user.email,
      plan,
      status,
      trial: status === "trial",
      ...utm,
    });
  }

  if (sentryReady && sentryModule) {
    sentryModule.setUser({ id: user.id, email: user.email });
    sentryModule.setTag("plan", plan);
  }
}

export function resetAnalytics() {
  if (posthogReady && posthogClient) posthogClient.reset();
  if (sentryReady && sentryModule) sentryModule.setUser(null);
}

export function trackEvent(event, props = {}) {
  try {
    if (posthogReady && posthogClient) posthogClient.capture(event, props);
  } catch {}
}

export function trackPage(slug) {
  try {
    if (posthogReady && posthogClient) {
      const utm = readUtmAttribution();
      posthogClient.capture("$pageview", {
        $current_url: `${window.location.origin}/${slug}`,
        slug,
        ...utm,
      });
    }
  } catch {}
}

export function captureException(error, context = {}) {
  try {
    if (sentryReady && sentryModule) sentryModule.captureException(error, { extra: context });
    else pendingExceptions.push(error, context);
  } catch {}
}
