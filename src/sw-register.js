import { supabase } from "./auth.js";
import { triggerQueueFlush } from "./sync.js";
import { recordTrustReceipt } from "./lib/trustReceipts.js";

export function registerSW() {
  if (!('serviceWorker' in navigator)) return;

  const base = import.meta.env.VITE_APP_BASE_PATH || '/';
  const swUrl = base.endsWith('/') ? base + 'sw.js' : base + '/sw.js';

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope: base })
      .catch(() => {}); // silently fail — app still works without SW
  });

  // Flush queue when SW signals reconnect via Background Sync
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type === 'PG_FLUSH_QUEUE') {
      triggerQueueFlush().catch(() => {});
    }
  });

  // Fallback: flush on window online event (browsers without Background Sync)
  window.addEventListener('online', () => {
    // Register background sync if supported, else flush directly
    navigator.serviceWorker.ready.then(reg => {
      if ('sync' in reg) {
        reg.sync.register('pg-flush-queue').catch(() => triggerQueueFlush());
      } else {
        triggerQueueFlush().catch(() => {});
      }
    }).catch(() => {});
  });
}

/**
 * Subscribe this browser to server-sent push notifications.
 * Call after the user has granted Notification permission.
 *
 * @param {string} vapidPublicKey - base64url-encoded VAPID public key
 * @returns {Promise<PushSubscription|null>}
 *
 * Usage:
 *   const sub = await subscribeToPush(import.meta.env.VITE_VAPID_PUBLIC_KEY);
 *   if (sub) {
 *     // POST sub.toJSON() to Supabase push_subscriptions table
 *     // { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth_key: sub.keys.auth }
 *   }
 */
export async function subscribeToPush(vapidPublicKey) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;

    // Return existing subscription if already subscribed
    const existing = await reg.pushManager.getSubscription();
    if (existing) return existing;

    // Convert base64url VAPID public key to Uint8Array
    const key = vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/');
    const raw = Uint8Array.from(atob(key), c => c.charCodeAt(0));

    return await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: raw,
    });
  } catch (e) {
    console.warn('[PromoGrind] Push subscribe failed:', e);
    return null;
  }
}

const DAILY_BRIEF_KEY = "pg_daily_brief";

export function isDailyBriefEnabled() {
  try {
    return localStorage.getItem(DAILY_BRIEF_KEY) === "1";
  } catch {
    return false;
  }
}

function setDailyBriefEnabled(enabled) {
  try {
    if (enabled) localStorage.setItem(DAILY_BRIEF_KEY, "1");
    else localStorage.removeItem(DAILY_BRIEF_KEY);
  } catch {}
}

function getVapidPublicKey() {
  return import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
}

export async function enableDailyBriefPush() {
  if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }

  const vapidPublicKey = getVapidPublicKey();
  if (!vapidPublicKey) return { ok: false, reason: "missing_vapid" };

  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") return { ok: false, reason: "permission_denied" };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user?.id) return { ok: false, reason: "auth_required" };

  const subscription = await subscribeToPush(vapidPublicKey);
  if (!subscription) return { ok: false, reason: "subscribe_failed" };

  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.p256dh;
  const authKey = json.keys?.auth;
  if (!endpoint || !p256dh || !authKey) return { ok: false, reason: "invalid_subscription" };

  const { error } = await supabase.from("push_subscriptions").upsert({
    user_id: session.user.id,
    endpoint,
    p256dh,
    auth_key: authKey,
    user_agent: navigator.userAgent,
    active: true,
  }, { onConflict: "user_id,endpoint" });

  if (error) return { ok: false, reason: "save_failed", error };
  setDailyBriefEnabled(true);
  recordTrustReceipt({
    type: "push",
    title: "Daily brief push enabled",
    summary: "This browser subscribed to PromoGrind push notifications for account-linked daily briefs.",
    stored: ["push endpoint", "browser public keys", "user agent"],
    notStored: ["location", "sportsbook credentials"],
    undo: "Disable Daily Brief push from the app.",
    dedupeKey: "push:daily-brief-enabled",
  });
  return { ok: true, subscription };
}

export async function disableDailyBriefPush() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    const endpoint = existing?.endpoint;
    if (endpoint) {
      await supabase.from("push_subscriptions").update({ active: false }).eq("endpoint", endpoint);
      await existing.unsubscribe().catch(() => {});
    }
  } catch {}
  setDailyBriefEnabled(false);
  recordTrustReceipt({
    type: "push",
    title: "Daily brief push disabled",
    summary: "PromoGrind disabled this browser's daily brief subscription where possible.",
    stored: ["disabled subscription state"],
    notStored: ["new notification subscription"],
    undo: "Enable Daily Brief push again from the app.",
    dedupeKey: "push:daily-brief-disabled",
  });
  return { ok: true };
}
