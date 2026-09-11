// src/utils/stealthTelemetry.js
// Dispatcher Telemetri Siluman Klien POS & Evaluator Heuristik Keamanan (Asinkron & Zero Gangguan UI Kasir)
import { queueOfflineTelemetry } from '@/utils/posOfflineDb';

/**
 * Kirim metrik telemetri siluman secara senyap ke server atau simpan di buffer IndexedDB jika offline
 * @param {string} code - Kode anomali ('VAC', 'CIP', 'HEM', 'DFO', 'SDC', 'RPC', 'ACD')
 * @param {Object} metadata - Detail data forensik anomali
 */
export const emitStealthMetric = (code, metadata = {}) => {
  try {
    const rawPayload = {
      t: Date.now(),
      e: code,
      m: {
        ...metadata,
        path: typeof window !== 'undefined' ? window.location.pathname : '',
      },
    };

    // Jika browser sedang offline, langsung simpan ke IndexedDB
    if (typeof window !== 'undefined' && !navigator.onLine) {
      queueOfflineTelemetry(rawPayload).catch(() => {});
      return;
    }

    const payload = JSON.stringify(rawPayload);

    fetch('/api/v1/metrics/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Jaringan bermasalah: simpan ke buffer offline IndexedDB secara senyap
      queueOfflineTelemetry(rawPayload).catch(() => {});
    });
  } catch {
    // Zero visual exception to avoid tipping off cashier
  }
};

/**
 * Heuristik VAC (Void After Calculation / Pembatalan Pasca Hitung):
 * Mendeteksi pembatalan keranjang belanja >= Rp 25.000 dalam tempo < 7 detik setelah masuk fase bayar
 */
export function evaluateVacHeuristic({
  cartTotal = 0,
  enteredPaymentTime = 0,
  itemsSnapshot = [],
  hadCashTendered = false,
  extra = {},
} = {}) {
  const total = Number(cartTotal || 0);
  if (total < 25000) return false;

  const now = Date.now();
  const timeInPaymentPhase = enteredPaymentTime > 0 ? (now - enteredPaymentTime) / 1000 : 0;

  // Batas kriteria: Pernah masuk fase bayar dan dibatalkan < 7 detik, ATAU uang tunai sudah sempat diinput
  if ((enteredPaymentTime > 0 && timeInPaymentPhase < 7) || hadCashTendered) {
    emitStealthMetric('VAC', {
      cart_total: total,
      time_in_payment_seconds: Math.round(timeInPaymentPhase * 10) / 10,
      had_cash_tendered: Boolean(hadCashTendered),
      items_count: itemsSnapshot.length,
      items_snapshot: itemsSnapshot.slice(0, 10),
      reason: 'Cart >= 25k voided/cleared within 7s of entering payment phase',
      ...extra,
    });
    return true;
  }

  return false;
}

/**
 * Heuristik CIP (Cart Item Purge / Pembersihan Massal Item Keranjang):
 * Mendeteksi penghapusan item >= 3 kali dalam 1 sesi keranjang ATAU akumulasi nilai barang dihapus > Rp 30.000
 */
export function evaluateCipHeuristic({
  purgedItems = [],
  currentCartTotal = 0,
  hadEnteredPaymentPhase = false,
  extra = {},
} = {}) {
  const now = Date.now();
  // Filter penghapusan dalam kurun waktu 3 menit terakhir
  const recentPurges = purgedItems.filter((p) => now - (p.timestamp || 0) < 180000);
  const totalPurgedValue = recentPurges.reduce((s, p) => s + (p.line_total || p.harga || 0), 0);
  const purgedCount = recentPurges.length;

  if (purgedCount >= 3 || totalPurgedValue > 30000) {
    emitStealthMetric('CIP', {
      purged_count: purgedCount,
      total_purged_value: totalPurgedValue,
      purged_items: recentPurges.slice(0, 10),
      current_cart_total: currentCartTotal,
      had_entered_payment_phase: Boolean(hadEnteredPaymentPhase),
      reason: purgedCount >= 3
        ? '3+ items removed from cart within 3 minutes'
        : 'Purged items cumulative value exceeded Rp 30.000',
      ...extra,
    });
    return true;
  }

  return false;
}

/**
 * Heuristik HEM / DFO (Hardware Drawer Kick Anomaly):
 * Mendeteksi pembukaan laci kas fisik > 2 kali dalam 15 menit tanpa transaksi resmi
 */
export function evaluateHemHeuristic({
  drawerKickTimestamps = [],
  shiftId = null,
  registerId = 'REGISTER_MAIN',
  extra = {},
} = {}) {
  const now = Date.now();
  // Filter kick laci dalam kurun waktu 15 menit (900.000 ms)
  const recentKicks = drawerKickTimestamps.filter((t) => now - t < 15 * 60 * 1000);

  if (recentKicks.length > 2) {
    emitStealthMetric('HEM', {
      shift_id: shiftId,
      register_id: registerId,
      kick_count: recentKicks.length,
      timeframe_minutes: 15,
      reason: 'Physical cash drawer opened > 2 times in 15 minutes outside transactions',
      ...extra,
    });
    return true;
  }

  return false;
}
