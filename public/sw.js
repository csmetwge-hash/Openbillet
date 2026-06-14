const CACHE_NAME = 'openbillet-shell-v1';
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Network-first. Only intervene for page navigations when the network fails,
// so we don't risk serving stale data for anything dynamic (API calls,
// Supabase requests, auth, etc.).
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    );
    return;
  }

  // For same-origin static assets (icons, manifest), try cache first.
  const url = new URL(request.url);
  if (url.origin === self.location.origin && PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
  }
  // Everything else: let it pass through to the network untouched.
});