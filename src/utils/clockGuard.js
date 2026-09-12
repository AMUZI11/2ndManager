/**
 * src/utils/clockGuard.js
 * Proteksi Integritas Waktu Sistem (Anti-Clock Manipulation Guard)
 * Mencegah manipulasi jam perangkat kasir POS untuk memperpanjang voucher
 * atau memalsukan urutan waktu transaksi saat beroperasi offline.
 */

const STORAGE_KEY_MAX_EPOCH = 'hl_pos_max_recorded_epoch';
const CLOCK_DRIFT_TOLERANCE_MS = 60 * 1000; // Toleransi 60 detik

/**
 * Memperbarui titik waktu monotonik tertinggi saat transaksi tercatat.
 * @param {string|number|Date} [currentTxTimestamp] - Waktu transaksi
 * @returns {number} Epoch milidetik tertinggi yang tersimpan
 */
export function updateMonotonicClock(currentTxTimestamp = null) {
  if (typeof window === 'undefined') return 0;

  try {
    const rawVal = localStorage.getItem(STORAGE_KEY_MAX_EPOCH);
    let maxEpoch = rawVal ? parseInt(rawVal, 10) : 0;
    if (isNaN(maxEpoch)) maxEpoch = 0;

    const txTime = currentTxTimestamp ? new Date(currentTxTimestamp).getTime() : Date.now();
    const validTxEpoch = isNaN(txTime) ? Date.now() : txTime;

    if (validTxEpoch > maxEpoch) {
      localStorage.setItem(STORAGE_KEY_MAX_EPOCH, validTxEpoch.toString());
      maxEpoch = validTxEpoch;
    }

    return maxEpoch;
  } catch (err) {
    console.warn('[ClockGuard] Gagal menyimpan monotonic epoch:', err);
    return Date.now();
  }
}

/**
 * Mendeteksi apakah jam sistem perangkat dimundurkan melewati transaksi terakhir.
 * @param {number} [mockCurrentTime] - Waktu simulasi untuk keperluan pengujian
 * @returns {Object} { isTampered, maxEpoch, systemEpoch, deltaMinutes }
 */
export function detectClockTampering(mockCurrentTime = null) {
  const now = mockCurrentTime !== null ? mockCurrentTime : Date.now();

  let maxEpoch = 0;
  if (typeof window !== 'undefined') {
    try {
      const rawVal = localStorage.getItem(STORAGE_KEY_MAX_EPOCH);
      maxEpoch = rawVal ? parseInt(rawVal, 10) : 0;
      if (isNaN(maxEpoch)) maxEpoch = 0;
    } catch {
      maxEpoch = 0;
    }
  }

  // Jika belum ada riwayat transaksi tersimpan, jam dianggap valid
  if (!maxEpoch || maxEpoch <= 0) {
    return {
      isTampered: false,
      maxEpoch: 0,
      systemEpoch: now,
      deltaMinutes: 0,
    };
  }

  // Anomali: jam saat ini (ditambah toleransi 60 detik) lebih kecil dari transaksi terakhir yang pernah tercatat
  const isTampered = (now + CLOCK_DRIFT_TOLERANCE_MS) < maxEpoch;
  const deltaMs = Math.max(0, maxEpoch - now);
  const deltaMinutes = Math.round(deltaMs / 60000);

  return {
    isTampered,
    maxEpoch,
    systemEpoch: now,
    deltaMinutes,
  };
}

/**
 * Menyelaraskan referensi waktu resmi dari server melalui HTTP response header 'date'.
 * @returns {Promise<Object>} { success, serverDate, serverEpoch, error }
 */
export async function syncTimeFromServer() {
  try {
    const res = await fetch('/api/v1/billing/status', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' },
    });

    const dateHeader = res.headers.get('date');
    if (!dateHeader) {
      return {
        success: false,
        serverDate: new Date(),
        serverEpoch: Date.now(),
        error: 'Header HTTP Date tidak ditemukan.',
      };
    }

    const serverEpoch = Date.parse(dateHeader);
    const serverDate = new Date(serverEpoch);

    // Otomatis mutakhirkan monotonic clock jika server time lebih maju
    updateMonotonicClock(serverDate);

    return {
      success: true,
      serverDate,
      serverEpoch,
      error: null,
    };
  } catch (err) {
    console.warn('[ClockGuard] Gagal sinkronisasi waktu server:', err);
    return {
      success: false,
      serverDate: new Date(),
      serverEpoch: Date.now(),
      error: err.message,
    };
  }
}

/**
 * Reset titik waktu monotonik (khusus environment pengujian).
 */
export function resetMonotonicClockForTesting() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY_MAX_EPOCH);
    } catch {}
  }
}
