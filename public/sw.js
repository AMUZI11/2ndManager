// public/sw.js
// Service Worker untuk PWA Klola POS (Offline Shell Caching & Fast Response)

const CACHE_NAME = 'klola-pos-v1';

const STATIC_PRECACHE = [
  '/pos',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
];

// Install: Cache Shell UI
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Precache partial error (ignored for non-critical assets):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Bersihkan cache lama & klaim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Interceptor:
// 1. /api/* -> Network Only (Data dinamis dikelola oleh IndexedDB & Sync Engine)
// 2. Navigation (Halaman HTML) -> Network First dengan Fallback ke Cached Shell /pos
// 3. Static Assets (_next, fonts, icons) -> Cache First / Stale While Revalidate
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Hanya proses method GET
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Jangan pernah cache endpoint API di Service Worker
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Mode Navigasi (Membuka /pos atau / saat koneksi putus)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match('/pos');
        if (cachedResponse) {
          return cachedResponse;
        }
        return cache.match('/login');
      })
    );
    return;
  }

  // 2. Static Assets (_next/static, fonts, icons, CSS)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/icons/')
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => {
          // Fail silently for static asset offline misses
        });
      })
    );
  }
});
