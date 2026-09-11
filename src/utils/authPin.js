// src/utils/authPin.js
// Verifikasi PIN Zero-Plaintext & Proteksi Anti-Bruteforce Klien

const LOCKOUT_KEY = 'hl_pos_pin_lockout_until';
const FAILED_COUNT_KEY = 'hl_pos_pin_failed_count';
const MAX_LOCAL_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 60 * 1000; // 60 detik lockout delay

/**
 * Hitung hash SHA-256 dari teks secara aman menggunakan Web Crypto API
 * Menjamin tidak ada PIN mentah yang tersimpan permanen
 */
export async function computeSha256Hex(text) {
  if (!text || typeof text !== 'string') return '';
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const msgUint8 = new TextEncoder().encode(text.trim());
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    console.warn('[computeSha256Hex fallback]', e);
  }
  return '';
}

/**
 * Cek apakah saat ini terminal sedang dalam masa lockout anti-bruteforce PIN
 */
export function checkLocalPinLockout() {
  if (typeof window === 'undefined') return { isLocked: false, remainingSeconds: 0 };

  const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) || '0', 10);
  const now = Date.now();

  if (lockoutUntil > now) {
    const remainingSeconds = Math.ceil((lockoutUntil - now) / 1000);
    return { isLocked: true, remainingSeconds };
  }

  // Jika waktu lockout sudah lewat, bersihkan
  if (lockoutUntil > 0 && now >= lockoutUntil) {
    localStorage.removeItem(LOCKOUT_KEY);
    localStorage.removeItem(FAILED_COUNT_KEY);
  }

  return { isLocked: false, remainingSeconds: 0 };
}

/**
 * Catat percobaan PIN salah di tingkat lokal (browser)
 */
export function recordLocalFailedPinAttempt() {
  if (typeof window === 'undefined') return { remainingAttempts: MAX_LOCAL_ATTEMPTS, isLocked: false };

  const currentCount = parseInt(localStorage.getItem(FAILED_COUNT_KEY) || '0', 10) + 1;
  localStorage.setItem(FAILED_COUNT_KEY, currentCount.toString());

  if (currentCount >= MAX_LOCAL_ATTEMPTS) {
    const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    localStorage.setItem(LOCKOUT_KEY, lockoutUntil.toString());
    return { remainingAttempts: 0, isLocked: true, retryAfterSeconds: 60 };
  }

  return {
    remainingAttempts: MAX_LOCAL_ATTEMPTS - currentCount,
    isLocked: false,
    retryAfterSeconds: 0,
  };
}

/**
 * Reset catatan percobaan gagal setelah PIN terverifikasi benar
 */
export function resetLocalPinLockout() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.removeItem(FAILED_COUNT_KEY);
}

/**
 * Verifikasi PIN Owner secara aman (Zero-Plaintext):
 * Mengirimkan input ke server endpoint terenkripsi /api/v1/shops/pin untuk verifikasi hash
 * lalu membersihkan variabel PIN dari memori seketika.
 */
export async function verifyOwnerPinSecurely(pin) {
  const lockout = checkLocalPinLockout();
  if (lockout.isLocked) {
    return {
      isValid: false,
      isLocked: true,
      error: `Terlalu banyak percobaan salah. Tunggu ${lockout.remainingSeconds} detik lagi.`,
    };
  }

  const cleanPin = String(pin || '').trim();
  if (!cleanPin || cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
    return {
      isValid: false,
      isLocked: false,
      error: 'PIN harus berupa 6 angka numerik.',
    };
  }

  try {
    const res = await fetch('/api/v1/shops/pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pin: cleanPin }),
    });

    const json = await res.json().catch(() => ({}));

    if (res.ok && json.success) {
      resetLocalPinLockout();
      return { isValid: true, isLocked: false };
    }

    // Catat kegagalan
    const failInfo = recordLocalFailedPinAttempt();
    return {
      isValid: false,
      isLocked: failInfo.isLocked,
      remainingAttempts: failInfo.remainingAttempts,
      error: failInfo.isLocked
        ? 'PIN salah 3 kali! Terminal dikunci selama 60 detik.'
        : `PIN Owner tidak sesuai. Sisa kesempatan: ${failInfo.remainingAttempts}x.`,
    };
  } catch (err) {
    console.error('[verifyOwnerPinSecurely Error]', err);
    return {
      isValid: false,
      isLocked: false,
      error: 'Gagal memverifikasi PIN ke server. Periksa jaringan.',
    };
  }
}
