const CACHE_NAME = 'tarseekh-v1';

const STATIC_PRECACHE = [
  '/',
  '/quran',
  '/kisah',
  '/hafalan',
  '/settings',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/data/surahs.json',
  '/data/index.json',
  '/data/kisah/index.json',
  '/data/kisah/ashabul-kahfi.json',
  '/data/surah/1.json',
  '/data/page/1.json',
  '/data/page/2.json',
];

// Install: Pre-cache core shell & essential data
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== CACHE_NAME)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Strategy depending on request type
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Skip non-GET or chrome-extension requests
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // 2. Never cache streaming chat API
  if (url.pathname.startsWith('/api/chat')) {
    return;
  }

  // 3. Cache-First for static Quran data files (/data/*) & icons
  if (url.pathname.startsWith('/data/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // 4. Stale-While-Revalidate for navigation and other assets
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and page navigation requested, fall back to cached root
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
          return null;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
