// Service worker: precaches the app shell so the game works offline.
// Bump CACHE_VERSION when the APP_SHELL list changes (fetches are network-first, so content updates need no bump).
const CACHE_VERSION = 'teeskleja-v2';
const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './strings.et.js',
  './words.js',
  './game.js',
  './ui.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first: always fresh when online (so new deploys show up right away),
// falling back to the cache when offline. The files are tiny, so the cost is negligible.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const cacheKey = request.mode === 'navigate' ? './index.html' : request;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(cacheKey, copy));
        }
        return response;
      })
      .catch(() => caches.match(cacheKey, { ignoreSearch: true }))
  );
});
