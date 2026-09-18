/* Offline contact card + network-first for HTML. */
const CACHE = 'zigma-offline-v2';

/** Path prefix when the SW is served under a Next.js basePath (e.g. /zigma-technologies). */
function appBase() {
  const path = self.location.pathname; // e.g. /zigma-technologies/sw.js or /sw.js
  const idx = path.lastIndexOf('/');
  return idx > 0 ? path.slice(0, idx) : '';
}

function appUrl(path) {
  const base = appBase();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

const OFFLINE_PATHS = ['/offline.html', '/manifest.webmanifest', '/assets/images/zigma.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(OFFLINE_PATHS.map((p) => cache.add(appUrl(p)))).then(() => undefined)
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const offlineHtml = appUrl('/offline.html');
  const offlinePathnames = new Set(OFFLINE_PATHS.map((p) => appUrl(p)));

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE);
        return (await cache.match(offlineHtml)) || Response.error();
      })
    );
    return;
  }

  if (offlinePathnames.has(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      }))
    );
  }
});
