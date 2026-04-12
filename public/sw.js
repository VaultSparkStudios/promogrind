const CACHE = 'promogrind-v4';
const BASE = self.location.pathname.replace('/sw.js','');

const SHELL = [
  BASE + '/',
  BASE + '/index.html',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── Push notification handler (server-sent via Edge Function) ──────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data.json(); } catch { data = { title: 'PromoGrind', body: e.data?.text() || 'New alert' }; }
  e.waitUntil(
    self.registration.showNotification(data.title || 'PromoGrind', {
      body: data.body || "Check today's promos and open bets.",
      icon: data.icon || (BASE + '/favicon.svg'),
      badge: data.badge || (BASE + '/favicon.svg'),
      tag: data.tag || 'promogrind',
      renotify: !!data.renotify,
      data: { url: data.url || (BASE + '/') },
    })
  );
});

// ── Notification click — focus existing tab or open new one ──────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || (BASE + '/');
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(wins => {
      const match = wins.find(w => w.url.includes('promogrind'));
      if (match) return match.focus();
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Always network for Supabase, Google Fonts, external APIs
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com') ||
      e.request.method !== 'GET') return;

  const isSameOrigin = url.hostname === self.location.hostname;
  const isAppAsset = isSameOrigin && (
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname === BASE + '/' ||
    url.pathname === BASE
  );

  if (isAppAsset) {
    // Network-first for HTML/JS/CSS — ensures new deploys take effect immediately
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok && res.type !== 'opaque') {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else (fonts, images, etc.)
  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res.ok && res.type !== 'opaque') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});
