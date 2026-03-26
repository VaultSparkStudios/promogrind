export function registerSW() {
  if ('serviceWorker' in navigator) {
    const base = import.meta.env.VITE_APP_BASE_PATH || '/';
    const swUrl = base.endsWith('/') ? base + 'sw.js' : base + '/sw.js';
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swUrl, { scope: base })
        .catch(() => {}); // silently fail — app still works without SW
    });
  }
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
