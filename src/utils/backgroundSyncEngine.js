/**
 * src/utils/backgroundSyncEngine.js
 * Mesin Pengatur Background Sync & Distributed Web Locks Mutex
 * Mengamankan sinkronisasi offline kasir dari benturan race-condition
 * dan membatasi chunking (maks 25 transaksi) demi ponsel Android Go (2GB RAM).
 */

export const SYNC_BATCH_SIZE = 25;
export const SYNC_MUTEX_NAME = 'pos_tx_sync_mutex';
export const SYNC_TAG_POS = 'sync-pos-transactions';

let localMemoryLock = false;

/**
 * Memecah array transaksi offline menjadi potongan-potongan kecil
 * @param {Array} txList
 * @param {number} size
 * @returns {Array<Array>}
 */
export function chunkTransactions(txList = [], size = SYNC_BATCH_SIZE) {
  if (!Array.isArray(txList) || txList.length === 0) return [];
  const chunks = [];
  for (let i = 0; i < txList.length; i += size) {
    chunks.push(txList.slice(i, i + size));
  }
  return chunks;
}

/**
 * Eksekusi fungsi sinkronisasi yang dilindungi Web Locks API (Mutex)
 * Mencegah tab kasir dan Service Worker Background Sync berjalan bersamaan.
 * @param {Function} taskFn - Fungsi async yang akan dijalankan
 * @returns {Promise<{ executed: boolean, result?: any, reason?: string }>}
 */
export async function acquireSyncMutex(taskFn) {
  if (typeof window === 'undefined') {
    return { executed: false, reason: 'SSR_ENVIRONMENT' };
  }

  // 1. Dukungan modern: Web Locks API
  if (navigator.locks && typeof navigator.locks.request === 'function') {
    try {
      return await navigator.locks.request(
        SYNC_MUTEX_NAME,
        { ifAvailable: true },
        async (lock) => {
          if (!lock) {
            console.log('[BackgroundSyncEngine] Mutex terkunci oleh proses lain. Eksekusi dibatalkan.');
            return { executed: false, reason: 'LOCKED_BY_ANOTHER_PROCESS' };
          }
          const result = await taskFn();
          return { executed: true, result };
        }
      );
    } catch (err) {
      console.warn('[BackgroundSyncEngine] Error pada Web Locks API:', err);
    }
  }

  // 2. Fallback untuk browser lawas / environment tanpa Web Locks
  if (localMemoryLock) {
    return { executed: false, reason: 'LOCAL_MEMORY_LOCK_ACTIVE' };
  }

  try {
    localMemoryLock = true;
    const result = await taskFn();
    return { executed: true, result };
  } finally {
    localMemoryLock = false;
  }
}

/**
 * Mendaftarkan Service Worker Background Sync Tag
 * Fallback secara elegan jika browser tidak mendukung SyncManager.
 * @param {string} tag
 * @returns {Promise<boolean>}
 */
export async function registerBackgroundSync(tag = SYNC_TAG_POS) {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration && typeof registration.sync.register === 'function') {
      await registration.sync.register(tag);
      console.log(`[BackgroundSyncEngine] Background sync tag '${tag}' berhasil didaftarkan.`);
      return true;
    } else {
      console.log('[BackgroundSyncEngine] Browser tidak mendukung SyncManager. Menggunakan fallback online listener.');
      return false;
    }
  } catch (err) {
    console.warn('[BackgroundSyncEngine] Gagal mendaftarkan sync tag:', err);
    return false;
  }
}

/**
 * Jeda napas singkat antar-batch untuk melegakan thread CPU/RAM Android low-end
 * @param {number} ms
 */
export function sleepThrottle(ms = 50) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
