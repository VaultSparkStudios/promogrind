const CACHE = 'promogrind-v3';
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
