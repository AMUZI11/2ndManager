// src/utils/posOfflineDb.js
// Native IndexedDB Wrapper untuk POS Offline-First & Background Sync

const DB_NAME = 'KlolaPosOfflineDB';
const DB_VERSION = 2;

const STORES = {
  CATALOG: 'catalog_cache',
  TRANSACTIONS: 'transactions_queue',
  TELEMETRY: 'telemetry_queue',
  HANDOVERS: 'offline_shift_handovers',
};

function isIndexedDBSupported() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

let dbInstancePromise = null;

export function getDb() {
  if (!isIndexedDBSupported()) {
    return Promise.resolve(null);
  }

  if (dbInstancePromise) {
    return dbInstancePromise;
  }

  dbInstancePromise = new Promise((resolve, reject) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 1. Catalog Cache (products, customers, categories, meta)
        if (!db.objectStoreNames.contains(STORES.CATALOG)) {
          db.createObjectStore(STORES.CATALOG, { keyPath: 'key' });
        }

        // 2. Offline Transactions Queue
        if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
          const txStore = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });
          txStore.createIndex('status', 'status', { unique: false });
          txStore.createIndex('created_at', 'created_at', { unique: false });
          txStore.createIndex('shift_id', 'shift_id', { unique: false });
          txStore.createIndex('register_id', 'register_id', { unique: false });
        }

        // 3. Stealth Telemetry Offline Queue
        if (!db.objectStoreNames.contains(STORES.TELEMETRY)) {
          const telemStore = db.createObjectStore(STORES.TELEMETRY, {
            keyPath: 'id',
            autoIncrement: true,
          });
          telemStore.createIndex('status', 'status', { unique: false });
          telemStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 4. Double-Blind Offline Shift Handovers
        if (!db.objectStoreNames.contains(STORES.HANDOVERS)) {
          const hStore = db.createObjectStore(STORES.HANDOVERS, { keyPath: 'id' });
          hStore.createIndex('status', 'status', { unique: false });
          hStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onerror = (event) => {
        console.error('[posOfflineDb] Gagal membuka IndexedDB:', event.target.error);
        dbInstancePromise = null;
        reject(event.target.error);
      };
    } catch (err) {
      console.error('[posOfflineDb] Exception saat inisialisasi IndexedDB:', err);
      dbInstancePromise = null;
      reject(err);
    }
  });

  return dbInstancePromise;
}

// ── 1. CATALOG CACHE OPERATIONS ──────────────────────────────────────────────

export async function saveCatalogCache({ products = [], customers = [], categories = [], shopId = null }) {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.CATALOG], 'readwrite');
      const store = tx.objectStore(STORES.CATALOG);

      const now = new Date().toISOString();

      store.put({ key: 'products', data: products, updatedAt: now });
      store.put({ key: 'customers', data: customers, updatedAt: now });
      store.put({ key: 'categories', data: categories, updatedAt: now });
      store.put({ key: 'meta', data: { shopId, last_cached_at: now } });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getCatalogCache() {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.CATALOG], 'readonly');
      const store = tx.objectStore(STORES.CATALOG);

      let products = [];
      let customers = [];
      let categories = [];
      let meta = null;

      const reqP = store.get('products');
      reqP.onsuccess = () => { if (reqP.result) products = reqP.result.data || []; };

      const reqC = store.get('customers');
      reqC.onsuccess = () => { if (reqC.result) customers = reqC.result.data || []; };

      const reqCat = store.get('categories');
      reqCat.onsuccess = () => { if (reqCat.result) categories = reqCat.result.data || []; };

      const reqM = store.get('meta');
      reqM.onsuccess = () => { if (reqM.result) meta = reqM.result.data || null; };

      tx.oncomplete = () => {
        resolve({ products, customers, categories, meta });
      };

      tx.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Patch Teknis #2: Local Kasbon Limit Guard
 * Saat kasir menyetujui transaksi Piutang/Kasbon offline, mutasikan saldo/debt
 * pelanggan di cache lokal agar tidak bisa melampaui limit secara berulang saat offline.
 */
export async function mutateLocalCustomerDebtLimit(customerId, amountAdded) {
  if (!customerId || !amountAdded) return false;
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.CATALOG], 'readwrite');
      const store = tx.objectStore(STORES.CATALOG);
      const req = store.get('customers');

      req.onsuccess = () => {
        if (!req.result || !Array.isArray(req.result.data)) {
          resolve(false);
          return;
        }
        const customers = req.result.data;
        const target = customers.find((c) => c.id === customerId);
        if (target) {
          target.current_debt = Number(target.current_debt || 0) + Number(amountAdded);
          target.remaining_limit = Math.max(0, Number(target.credit_limit || 0) - target.current_debt);
          store.put({ key: 'customers', data: customers, updatedAt: new Date().toISOString() });
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ── 2. TRANSACTIONS QUEUE OPERATIONS ────────────────────────────────────────

/**
 * Simpan transaksi offline ke queue lokal
 * Patch Teknis #1: shift_id & register_id wajib disertakan
 * Patch Teknis #3: created_at historis dipertahankan
 */
export async function queueOfflineTransaction({
  id,
  nomor_bon,
  tanggal,
  shift_id = null,
  register_id = 'REGISTER_MAIN',
  payload,
  created_at,
}) {
  const db = await getDb();
  if (!db) return false;

  const txId = id || payload?.idempotency_key || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `offline-tx-${Date.now()}`);
  const historicCreatedAt = created_at || payload?.created_at || new Date().toISOString();

  const record = {
    id: txId,
    nomor_bon: nomor_bon || payload?.nomor_bon || `BON-OFF-${Date.now()}`,
    tanggal: tanggal || payload?.tanggal || historicCreatedAt.split('T')[0],
    shift_id: shift_id || payload?.shift_id || null,
    register_id: register_id || payload?.register_id || 'REGISTER_MAIN',
    payload: {
      ...payload,
      idempotency_key: txId,
      shift_id: shift_id || payload?.shift_id || null,
      register_id: register_id || payload?.register_id || 'REGISTER_MAIN',
      created_at: historicCreatedAt,
    },
    status: 'PENDING_SYNC', // 'PENDING_SYNC' | 'SYNCING' | 'SYNCED' | 'FAILED'
    retry_count: 0,
    error_message: null,
    created_at: historicCreatedAt,
    synced_at: null,
    server_id: null,
  };

  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction([STORES.TRANSACTIONS], 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      store.put(record);

      tx.oncomplete = () => resolve(record);
      tx.onerror = (e) => reject(e.target.error);
    } catch (err) {
      reject(err);
    }
  });
}

export async function getPendingTransactions() {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TRANSACTIONS], 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const pending = all.filter((t) => t.status === 'PENDING_SYNC' || t.status === 'FAILED');
        // Urutkan ascending berdasarkan created_at asli agar urutan penjualan historis presisi
        pending.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        resolve(pending);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function updateTransactionStatus(id, status, details = {}) {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TRANSACTIONS], 'readwrite');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result) {
          const item = req.result;
          item.status = status;
          if (details.serverId) item.server_id = details.serverId;
          if (details.errorMessage) {
            item.error_message = details.errorMessage;
            item.retry_count = (item.retry_count || 0) + 1;
          }
          if (status === 'SYNCED') {
            item.synced_at = new Date().toISOString();
            item.error_message = null;
          }
          store.put(item);
        }
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getQueueStats() {
  const db = await getDb();
  if (!db) return { pending: 0, synced: 0, failed: 0, total: 0 };

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TRANSACTIONS], 'readonly');
      const store = tx.objectStore(STORES.TRANSACTIONS);
      const req = store.getAll();

      req.onsuccess = () => {
        const all = req.result || [];
        const pending = all.filter((t) => t.status === 'PENDING_SYNC' || t.status === 'SYNCING').length;
        const failed = all.filter((t) => t.status === 'FAILED').length;
        const synced = all.filter((t) => t.status === 'SYNCED').length;
        resolve({ pending, synced, failed, total: all.length });
      };

      req.onerror = () => resolve({ pending: 0, synced: 0, failed: 0, total: 0 });
    } catch {
      resolve({ pending: 0, synced: 0, failed: 0, total: 0 });
    }
  });
}

// ── 3. TELEMETRY QUEUE OPERATIONS ───────────────────────────────────────────

export async function queueOfflineTelemetry(metricPayload) {
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TELEMETRY], 'readwrite');
      const store = tx.objectStore(STORES.TELEMETRY);
      store.add({
        code: metricPayload.code || 'UNKNOWN',
        payload: metricPayload,
        timestamp: Date.now(),
        status: 'PENDING',
      });

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function getPendingTelemetry() {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TELEMETRY], 'readonly');
      const store = tx.objectStore(STORES.TELEMETRY);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).filter((m) => m.status === 'PENDING');
        resolve(list);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function removeTelemetryItems(ids = []) {
  if (!ids.length) return false;
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.TELEMETRY], 'readwrite');
      const store = tx.objectStore(STORES.TELEMETRY);
      ids.forEach((id) => store.delete(id));

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

// ── 4. OFFLINE SHIFT HANDOVER OPERATIONS (TAHAP 5 PATCH #2) ──────────────────

export async function saveOfflineShiftHandover(handoverData) {
  const db = await getDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.HANDOVERS], 'readwrite');
      const store = tx.objectStore(STORES.HANDOVERS);

      const record = {
        id: handoverData.id || `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        status: 'PENDING',
        timestamp: Date.now(),
        ...handoverData,
      };

      store.put(record);

      tx.oncomplete = () => resolve(record);
      tx.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getPendingOfflineHandovers() {
  const db = await getDb();
  if (!db) return [];

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.HANDOVERS], 'readonly');
      const store = tx.objectStore(STORES.HANDOVERS);
      const req = store.getAll();

      req.onsuccess = () => {
        const list = (req.result || []).filter((h) => h.status === 'PENDING');
        resolve(list);
      };

      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

export async function removeOfflineShiftHandovers(ids = []) {
  if (!ids.length) return false;
  const db = await getDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction([STORES.HANDOVERS], 'readwrite');
      const store = tx.objectStore(STORES.HANDOVERS);
      ids.forEach((id) => store.delete(id));

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

