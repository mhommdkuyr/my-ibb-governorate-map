const CACHE_NAME = 'my-ibb-map-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './data/core_index.json'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Cache-first strategy for data shards, core index, and map tiles for ultra-fast weak-internet browsing
  if (url.pathname.includes('/data/') || url.hostname.includes('google.com') || url.hostname.includes('unpkg.com') || url.hostname.includes('cartocdn.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;
        try {
          const response = await fetch(event.request);
          if (response && response.status === 200) {
            cache.put(event.request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      })
    );
  }
});
