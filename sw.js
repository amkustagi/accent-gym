const CACHE = 'speakco-4831a1292970';
const ASSETS = ["./","apple-touch-icon.png","assets/index-BeoRn2gJ.js","assets/index-CJtIKkLt.css","assets/index-Dyo9ARUX.js","assets/vision_bundle-DZnL4xMN.js","assets/web-DOsHTGOr.js","icon-192.png","icon-512.png","icon.svg","index.html","legal.css","manifest.webmanifest","privacy.html","terms.html"];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'speakco-models').map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // App files: cache first, so it opens instantly and offline.
    e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match('./'))));
  } else if (url.hostname === 'storage.googleapis.com' && url.pathname.startsWith('/mediapipe-models/')) {
    // Face model for the camera check: download once, then work offline.
    e.respondWith(caches.open('speakco-models').then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }))));
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    // Fonts: stale-while-revalidate.
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
