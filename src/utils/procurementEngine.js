// src/utils/procurementEngine.js
// Mesin Rekomendasi Belanja Pasar Subuh Bebas Bias Stok Nol & Pembulatan Grosir
// Dilengkapi Patch: Velocity Anomaly Dampener (maks 3x historical average) & IndexedDB Cache

const REORDER_DB_NAME = '2ndManager_ProcurementDB';
const REORDER_DB_VERSION = 1;
const STORE_NAME = 'pos_reorder_cache';

/**
 * Membuka koneksi IndexedDB untuk cache reorder pasar subuh
 */
function openReorderDb() {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(REORDER_DB_NAME, REORDER_DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Menghitung Laju Penjualan Riil Bebas Bias Stok Nol (Stockout-Aware Velocity)
 * 
 * @param {Array<{ quantity: number, timestamp: string }>} salesHistory Riwayat penjualan dalam periode
 * @param {Array<{ inStock: boolean, hours: number }>} stockoutHistory Riwayat durasi jam ketersediaan stok
 * @param {number} storeHoursPerDay Jam operasional warung per hari (default: 14 jam)
 * @param {number|null} historicalAverageDaily Rata-rata harian historis (untuk Anomaly Dampener)
 * @param {number} leadTimeDays Hari tunggu pengiriman dari agen (default: 1 hari)
 * @param {number} targetDaysStock Target hari ketahanan stok (default: 3 hari)
 * @param {number} currentStock Jumlah stok fisik saat ini di rak warung
 * @returns {Object} Hasil kalkulasi laju dan rekomendasi kuantitas dasar
 */
export function calculateStockoutAwareVelocity({
  totalQuantitySold = 0,
  inStockHoursTotal = 14,
  storeHoursPerDay = 14,
  historicalAverageDaily = null,
  leadTimeDays = 1,
  targetDaysStock = 3,
  currentStock = 0,
} = {}) {
  // Hindari pembagian nol atau jam stok aktif yang terlalu sempit (< 12 jam)
  const safeInStockHours = Math.max(12, inStockHoursTotal || storeHoursPerDay);
  
  // Formula laju penjualan riil per hari:
  const rawVelocity = parseFloat(((totalQuantitySold / safeInStockHours) * storeHoursPerDay).toFixed(2));

  // Patch 1: Velocity Anomaly Dampener
  // Batasi laju harian maksimal 3x dari rata-rata penjualan historis produk
  // untuk mencegah over-reorder akibat pembelian borongan insidental (hajatan/pesta)
  let velocityPerDay = rawVelocity;
  let isDampened = false;

  if (historicalAverageDaily !== null && historicalAverageDaily > 0) {
    const maxAllowedVelocity = parseFloat((historicalAverageDaily * 3).toFixed(2));
    if (rawVelocity > maxAllowedVelocity) {
      velocityPerDay = maxAllowedVelocity;
      isDampened = true;
    }
  }

  // Safety Stock = Laju harian * lead time * 1.5
  const safetyStock = Math.ceil(velocityPerDay * Math.max(1, leadTimeDays) * 1.5);

  // Saran Kuantitas Kulakan (Base Pcs):
  // suggestedPcs = (velocityPerDay * targetDaysStock) + safetyStock - currentStock
  const idealTarget = Math.ceil(velocityPerDay * Math.max(1, targetDaysStock)) + safetyStock;
  const suggestedPcs = Math.max(0, idealTarget - currentStock);

  return {
    velocityPerDay,
    rawVelocity,
    isDampened,
    safetyStock,
    idealTarget,
    currentStock,
    suggestedPcs,
  };
}

/**
 * Pembulatan Cerdas Satuan Kemasan Kulakan Grosir (Multi-Tier Packaging Rounding)
 * 
 * @param {number} suggestedPcs Kuantitas unit dasar yang dibutuhkan
 * @param {Array<Object>} productUnits Daftar hierarki kemasan produk
 * @param {number} ceilingThreshold Ambang batas pembulatan ke atas (default: 0.6 atau 60%)
 * @param {number} baseUnitCost Harga modal per unit dasar
 * @returns {Object}
 */
export function autoRoundToWholesaleUnits(
  suggestedPcs,
  productUnits = [],
  ceilingThreshold = 0.6,
  baseUnitCost = 0
) {
  if (!suggestedPcs || suggestedPcs <= 0) {
    return {
      primaryUnit: 'Pcs',
      packageQty: 0,
      loosePcs: 0,
      totalBasePcs: 0,
      unitMultiplier: 1,
      estimatedCost: 0,
      display: '0 Pcs',
    };
  }

  // Filter dan urutkan kemasan dari multiplier terbesar ke terkecil
  const validWholesaleUnits = (productUnits || [])
    .filter((u) => !u.is_base_unit && Number(u.multiplier_to_base || 1) > 1)
    .sort((a, b) => Number(b.multiplier_to_base) - Number(a.multiplier_to_base));

  if (validWholesaleUnits.length === 0) {
    return {
      primaryUnit: 'Pcs',
      packageQty: suggestedPcs,
      loosePcs: 0,
      totalBasePcs: suggestedPcs,
      unitMultiplier: 1,
      estimatedCost: suggestedPcs * baseUnitCost,
      display: `${suggestedPcs} Pcs`,
    };
  }

  // Gunakan unit kemasan grosir terbesar (misal: Dus atau Slop)
  const topUnit = validWholesaleUnits[0];
  const multiplier = Number(topUnit.multiplier_to_base);
  const basePacks = Math.floor(suggestedPcs / multiplier);
  const remainder = suggestedPcs % multiplier;
  const remainderRatio = remainder / multiplier;

  let packageQty = basePacks;
  let loosePcs = remainder;
  let totalBasePcs = suggestedPcs;

  // Jika sisa >= 60% dari kapasitas kemasan, bulatkan ke atas (*ceiling*)
  if (remainderRatio >= ceilingThreshold) {
    packageQty = basePacks + 1;
    loosePcs = 0;
    totalBasePcs = packageQty * multiplier;
  }

  const estimatedCost = totalBasePcs * baseUnitCost;
  const display =
    loosePcs > 0
      ? `${packageQty} ${topUnit.unit_name} (+${loosePcs} Pcs)`
      : `${packageQty} ${topUnit.unit_name}`;

  return {
    primaryUnit: topUnit.unit_name,
    packageQty,
    loosePcs,
    totalBasePcs,
    unitMultiplier: multiplier,
    estimatedCost,
    display,
  };
}

/**
 * Kalkulator Rincian Amplop Kas Belanja Fisik Juragan
 * 
 * @param {number} totalEstimatedCost Total modal yang dibutuhkan
 * @param {number} leftoverDrawerCash Uang di brankas dari setoran shift kemarin
 * @returns {Object}
 */
export function calculateCashEnvelopeBreakdown(totalEstimatedCost = 0, leftoverDrawerCash = 0) {
  let remaining = Math.max(0, Math.round(totalEstimatedCost));

  // Denominasi uang rupiah fisik
  const denominations = [
    { label: 'Rp 100.000', value: 100000, count: 0, total: 0 },
    { label: 'Rp 50.000', value: 50000, count: 0, total: 0 },
    { label: 'Rp 20.000', value: 20000, count: 0, total: 0 },
    { label: 'Rp 10.000', value: 10000, count: 0, total: 0 },
  ];

  denominations.forEach((denom) => {
    if (remaining >= denom.value) {
      denom.count = Math.floor(remaining / denom.value);
      denom.total = denom.count * denom.value;
      remaining = remaining % denom.value;
    }
  });

  const exactReceh = remaining; // Sisa uang pas di bawah Rp 10.000
  const deficit = Math.max(0, totalEstimatedCost - leftoverDrawerCash);
  const isDeficit = deficit > 0;

  return {
    targetAmount: totalEstimatedCost,
    denominations,
    exactReceh,
    leftoverDrawerCash,
    deficit,
    isDeficit,
  };
}

/**
 * Menyimpan snapshot rekomendasi belanja ke IndexedDB 'pos_reorder_cache'
 */
export async function syncReorderSnapshot(shopId, reorderData) {
  if (!reorderData) return false;
  const db = await openReorderDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put({
        key: `reorder_snapshot_${shopId || 'default'}`,
        data: reorderData,
        last_calculated_at: new Date().toISOString(),
      });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Mengambil snapshot rekomendasi belanja offline dari IndexedDB
 */
export async function getOfflineReorderSnapshot(shopId) {
  const db = await openReorderDb();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`reorder_snapshot_${shopId || 'default'}`);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Menyimpan status centang beli item di Mode Pasar Subuh
 */
export async function toggleMarketItemPurchased(shopId, productId, isPurchased) {
  const db = await openReorderDb();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`reorder_snapshot_${shopId || 'default'}`);

      req.onsuccess = () => {
        const snapshot = req.result;
        if (!snapshot || !snapshot.data) {
          resolve(false);
          return;
        }

        // Cari dan mutasikan status purchased pada item list
        const items = snapshot.data.all_reorder_items || [];
        const target = items.find((i) => i.id === productId);
        if (target) {
          target.is_purchased = isPurchased;
        }

        store.put(snapshot);
      };

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
