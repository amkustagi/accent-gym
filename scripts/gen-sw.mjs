// Writes dist/sw.js with a precache list of every built file, versioned by content hash.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

const dist = 'dist';
const files = [];
const walk = (d) => readdirSync(d).forEach((f) => {
  const p = join(d, f);
  statSync(p).isDirectory() ? walk(p) : files.push(relative(dist, p).split('\\').join('/'));
});
walk(dist);
const assets = files.filter((f) => f !== 'sw.js');
// Large optional files (the natural-voice engine) are cached on first use, not at install.
const precache = assets.filter((f) => !/\.wasm$|kokoro\.worker/.test(f));
const hash = createHash('sha256');
assets.forEach((f) => hash.update(f).update(readFileSync(join(dist, f))));
const version = hash.digest('hex').slice(0, 12);

const sw = `const CACHE = 'speak-sharp-${version}';
const ASSETS = ${JSON.stringify(['./', ...precache])};
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
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
  } else if (url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    // Fonts: stale-while-revalidate.
    e.respondWith(caches.open(CACHE).then((c) => c.match(req).then((hit) => {
      const net = fetch(req).then((res) => { c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
`;
writeFileSync(join(dist, 'sw.js'), sw);
console.log(`sw.js: precaching ${precache.length} of ${assets.length} files, cache ${version}`);
