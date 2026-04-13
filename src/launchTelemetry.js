import { trackEvent } from './analytics.js';

const IMPRESSION_KEY = "pg_launch_impressions";

function getSeenSet() {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(IMPRESSION_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function setSeenSet(set) {
  try {
    sessionStorage.setItem(IMPRESSION_KEY, JSON.stringify([...set]));
  } catch {}
}

export function trackLaunchEvent(eventName, props = {}) {
  trackEvent(eventName, props);
}

export function trackFeatureGateSeen(featureKey, context = "gate") {
  const seen = getSeenSet();
  const dedupeKey = `${featureKey}:${context}`;
  if (seen.has(dedupeKey)) return;
  seen.add(dedupeKey);
  setSeenSet(seen);
  trackLaunchEvent("launch_feature_beta_seen", { feature: featureKey, context });
}

export function trackFeatureGateClick(featureKey, action = "cta") {
  trackLaunchEvent("launch_feature_beta_click", { feature: featureKey, action });
}

export function trackFeatureEnabledUse(featureKey, context = "enabled") {
  trackLaunchEvent("launch_feature_enabled_use", { feature: featureKey, context });
}
