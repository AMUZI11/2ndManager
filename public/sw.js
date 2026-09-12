// public/sw.js
// Service Worker Komprehensif: PWA Shell Cache, VAPID Push & Background Sync Engine
// Optimal untuk ponsel low-end Android Go (RAM 2GB) dengan LRU Cache & Mutex Web Locks

const STATIC_CACHE_NAME = '2ndmanager-static-v2';
const DYNAMIC_CACHE_NAME = '2ndmanager-dynamic-v2';
const MAX_DYNAMIC_ENTRIES = 50;

const STATIC_PRECACHE = [
  '/pos',
  '/login',
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon.svg',
];

/**
 * Pemangkas Cache Dinamis (LRU Eviction)
 * Memastikan memori ponsel low-end tidak membengkak karena ribuan request cache
 */
async function trimCache(cacheName, maxItems = MAX_DYNAMIC_ENTRIES) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Hapus entri tertua (FIFO / LRU sederhana)
      await cache.delete(keys[0]);
      await trimCache(cacheName, maxItems);
    }
  } catch (err) {
    // Fail-safe untuk browser non-kritis
  }
}

// ── 1. INSTALL: PRECACHE SHELL ASSETS ─────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[SW] Precache partial warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ── 2. ACTIVATE: BERSIHKAN CACHE LAMA & KLAIM CLIENTS ────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== STATIC_CACHE_NAME && name !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Menghapus cache usang:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ── 3. FETCH: NETWORK ONLY UNTUK API & STRUKTURAL SWR UNTUK STATIC ───────────
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // A. CRITICAL SECURITY: Endpoint API, Auth, dan Radar WAJIB NETWORK-ONLY
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/verify-seal/')
  ) {
    return;
  }

  // B. Navigasi Halaman HTML -> Network First dengan Fallback Shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE_NAME);
        const cachedPos = await cache.match('/pos');
        if (cachedPos) return cachedPos;
        return cache.match('/login');
      })
    );
    return;
  }

  // C. Aset Statis (_next, fonts, icons) -> Cache First / Stale While Revalidate
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
            caches.open(DYNAMIC_CACHE_NAME).then(async (dCache) => {
              await dCache.put(request, clone);
              trimCache(DYNAMIC_CACHE_NAME, MAX_DYNAMIC_ENTRIES);
            });
          }
          return response;
        }).catch(() => {
          // Fail silently offline
        });
      })
    );
  }
});

// ── 4. WEB PUSH NOTIFICATION EVENT (RFC 8292) ────────────────────────────────
self.addEventListener('push', (event) => {
  let payload = {
    title: '🚨 RADAR KEAMANAN 2NDMANAGER',
    body: 'Aktivitas anomali terdeteksi pada kasir toko Anda.',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon.svg',
    data: {},
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const title = payload.title || '🚨 PERINGATAN INTEGRITAS KASIR';
  const options = {
    body: payload.body || 'Anomali terdeteksi. Ketuk untuk tindakan pengamanan.',
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon.svg',
    // Pola getar darurat: detak cepat lalu panjang
    vibrate: [300, 100, 300, 100, 600, 150, 600, 150, 1000],
    tag: 'security-anomaly-radar',
    renotify: true,
    requireInteraction: true,
    data: payload.data || {},
    actions: payload.actions || [
      { action: 'freeze', title: '🚨 KUNCI KASIR' },
      { action: 'dismiss', title: 'ABAIKAN' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ── 5. NOTIFICATION CLICK HANDLER (LOCKSCREEN ACTIONABLE REMOTE KILL-SWITCH) ──
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // A. Aksi Tombol Kunci Kasir dari Layar Kunci (Lockscreen Remote Kill-Switch)
  if (action === 'freeze') {
    const freezeTask = async () => {
      try {
        const res = await fetch('/api/v1/radar/freeze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            shopId: data.shopId,
            actionToken: data.actionToken,
            reason: 'Dibekukan cepat dari Notifikasi Layar Kunci Ponsel',
          }),
        });

        if (res.ok) {
          await self.registration.showNotification('✅ KASIR BERHASIL DIBEKUKAN', {
            body: 'Terminal kasir telah dikunci seketika. Seluruh transaksi dibekukan.',
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon.svg',
            tag: 'freeze-confirmation',
          });
        } else {
          const errData = await res.json().catch(() => ({}));
          await self.registration.showNotification('⚠️ GAGAL MEMBEKUKAN KASIR', {
            body: errData.message || 'Token darurat kedaluwarsa. Buka menu Radar langsung.',
            icon: '/icons/icon-192x192.png',
            tag: 'freeze-error',
          });
        }
      } catch (networkErr) {
        console.error('[SW Freeze Action Error]', networkErr);
      }
    };

    event.waitUntil(freezeTask());
    return;
  }

  // B. Klik Notifikasi Standar / Dismiss -> Buka/Fokuskan Tab /radar
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const targetUrl = '/radar';
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// ── 6. BACKGROUND SYNC API HANDLER ───────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pos-transactions') {
    console.log('[SW] Background Sync terpicu untuk tag: sync-pos-transactions');
    event.waitUntil(processBackgroundSyncTransactions());
  }
});

/**
 * Eksekusi Sinkronisasi Transaksi Offline di Latar Belakang (IndexedDB -> bulk-sync)
 * Dilindungi Web Locks API Mutex & Batch Chunking 25
 */
async function processBackgroundSyncTransactions() {
  const DB_NAME = 'KlolaPosOfflineDB';
  const DB_VERSION = 2;
  const STORE_NAME = 'transactions_queue';

  // 1. Eksekusi dilindungi Mutex jika didukung
  const executeSync = async () => {
    return new Promise((resolve) => {
      if (!('indexedDB' in self)) {
        resolve();
        return;
      }

      const dbReq = indexedDB.open(DB_NAME, DB_VERSION);
      dbReq.onerror = () => resolve();
      dbReq.onsuccess = async (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          resolve();
          return;
        }

        const readTx = db.transaction([STORE_NAME], 'readonly');
        const store = readTx.objectStore(STORE_NAME);
        const getAllReq = store.getAll();

        getAllReq.onsuccess = async () => {
          const allTxs = getAllReq.result || [];
          const pending = allTxs.filter((t) => t.status === 'PENDING_SYNC' || t.status === 'FAILED');

          if (pending.length === 0) {
            resolve();
            return;
          }

          // Chunking 25 per request demi low-end devices
          const BATCH_SIZE = 25;
          for (let i = 0; i < pending.length; i += BATCH_SIZE) {
            const batch = pending.slice(i, i + BATCH_SIZE);

            const payloadTransactions = batch.map((t) => ({
              clientTxUuid: t.id || t.payload?.idempotency_key,
              nomorBon: t.nomor_bon,
              tanggal: t.tanggal,
              shiftId: t.shift_id,
              registerId: t.register_id,
              offlineCreatedAt: t.created_at,
              items: t.payload?.items || [],
              paymentMethod: t.payload?.payment_method || 'CASH',
              grossAmount: t.payload?.total_bayar || t.payload?.subtotal || 0,
              finalAmount: t.payload?.total_akhir || t.payload?.total_bayar || 0,
              paymentStatus: t.payload?.status || 'Lunas',
              customerId: t.payload?.customer_id || null,
              payload: t.payload,
            }));

            try {
              const res = await fetch('/api/v1/transactions/bulk-sync', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Synced-Via': 'BACKGROUND_SYNC',
                },
                body: JSON.stringify({
                  syncedVia: 'BACKGROUND_SYNC',
                  transactions: payloadTransactions,
                }),
              });

              if (res.ok) {
                const resJson = await res.json();
                const processedIds = resJson.processedUuids || [];

                // Hapus entri yang sukses dari IndexedDB
                if (processedIds.length > 0) {
                  const writeTx = db.transaction([STORE_NAME], 'readwrite');
                  const writeStore = writeTx.objectStore(STORE_NAME);
                  processedIds.forEach((id) => {
                    writeStore.delete(id);
                  });
                }
              }
            } catch (postErr) {
              console.warn('[SW Background Sync Batch Error]', postErr);
              break; // Hentikan batch jika koneksi kembali drop
            }
          }

          resolve();
        };
      };
    });
  };

  // Mutex wrapper
  if (self.navigator && self.navigator.locks && typeof self.navigator.locks.request === 'function') {
    return self.navigator.locks.request('pos_tx_sync_mutex', { ifAvailable: true }, async (lock) => {
      if (!lock) {
        console.log('[SW] Mutex pos_tx_sync_mutex sedang digunakan UI kasir. Melewatkan putaran SW.');
        return;
      }
      await executeSync();
    });
  } else {
    return executeSync();
  }
}
