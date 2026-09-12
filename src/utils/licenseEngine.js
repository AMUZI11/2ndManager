/**
 * src/utils/licenseEngine.js
 * Grassroots License Engine & Cryptographic Activation
 * Format Token 16-Digit: 2NDM-XXXX-XXXX-XXXX
 * - Segmen 1: 2NDM (Prefix Ekosistem)
 * - Segmen 2: Tier Code (SPVR | MNGR | EKSE)
 * - Segmen 3: Salt heksadesimal 4-karakter (misal: 9F2A)
 * - Segmen 4: 4 karakter pertama dari HMAC-SHA256(secret, `${tierId}-${durationDays}-${salt}`)
 */

import crypto from 'crypto';

export const TIER_CODE_MAP = {
  SUPERVISOR: 'SPVR',
  MANAJER: 'MNGR',
  EKSEKUTIF: 'EKSE',
};

export const REVERSE_TIER_CODE_MAP = {
  SPVR: 'SUPERVISOR',
  MNGR: 'MANAJER',
  EKSE: 'EKSEKUTIF',
};

export const STANDARD_DURATIONS = [30, 90, 180, 365, 3650];

/**
 * Mengambil secret key server dari environment variable dengan fallback pengujian.
 * @param {string} [overrideSecret] 
 * @returns {string}
 */
export function getServerSecret(overrideSecret = null) {
  if (overrideSecret && typeof overrideSecret === 'string' && overrideSecret.trim().length >= 16) {
    return overrideSecret.trim();
  }
  return (
    process.env.LICENSE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '2ndmanager_dev_fallback_secret_key_fixed_for_test_suite_9901'
  );
}

/**
 * Menghitung signature 4-karakter HMAC-SHA256 untuk voucher.
 * @param {string} secret 
 * @param {string} tierId 
 * @param {number} durationDays 
 * @param {string} salt 
 * @returns {string} 4 karakter heksadesimal uppercase
 */
export function computeSegment4Hmac(secret, tierId, durationDays, salt) {
  const payload = `${tierId}-${durationDays}-${salt.toUpperCase()}`;
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
    .substring(0, 4)
    .toUpperCase();
}

/**
 * Menghasilkan full HMAC-SHA256 digest 64-karakter untuk audit keamanan database.
 * @param {string} secret 
 * @param {string} tokenCode 
 * @param {string} tierId 
 * @param {number} durationDays 
 * @returns {string} 64 karakter heksadesimal
 */
export function computeFullHmacSignature(secret, tokenCode, tierId, durationDays) {
  const payload = `${tokenCode}-${tierId}-${durationDays}`;
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

/**
 * Menghasilkan Token Lisensi 16-Digit Baru.
 * @param {string} tierId - 'SUPERVISOR' | 'MANAJER' | 'EKSEKUTIF'
 * @param {number} durationDays - 30, 90, 365, 3650
 * @param {string} [serverSecret] - Secret key HMAC
 * @param {string} [customSalt] - Salt opsional (4 hex chars)
 * @returns {Object} { tokenCode, tierId, durationDays, salt, signature, fullHmac }
 */
export function generateLicenseToken(tierId, durationDays = 30, serverSecret = null, customSalt = null) {
  const normalizedTier = (tierId || '').toUpperCase().trim();
  const tierCode = TIER_CODE_MAP[normalizedTier];

  if (!tierCode) {
    throw new Error(`Tier ID tidak valid: '${tierId}'. Pilihan: SUPERVISOR, MANAJER, EKSEKUTIF.`);
  }

  const duration = parseInt(durationDays, 10);
  if (isNaN(duration) || duration <= 0) {
    throw new Error(`Durasi hari tidak valid: '${durationDays}'.`);
  }

  const secret = getServerSecret(serverSecret);

  // Generate 4-hex random salt jika tidak diberikan
  let salt = customSalt;
  if (!salt || typeof salt !== 'string' || salt.length !== 4) {
    salt = crypto.randomBytes(2).toString('hex').toUpperCase();
  } else {
    salt = salt.toUpperCase();
  }

  // Hitung signature segmen 4
  const signature = computeSegment4Hmac(secret, normalizedTier, duration, salt);

  const tokenCode = `2NDM-${tierCode}-${salt}-${signature}`;
  const fullHmac = computeFullHmacSignature(secret, tokenCode, normalizedTier, duration);

  return {
    tokenCode,
    tierId: normalizedTier,
    tierCode,
    durationDays: duration,
    salt,
    signature,
    fullHmac,
  };
}

/**
 * Mengurai segmen dan metadata dari string Token Lisensi.
 * @param {string} tokenCode 
 * @returns {Object|null}
 */
export function parseTokenDetails(tokenCode) {
  if (!tokenCode || typeof tokenCode !== 'string') return null;
  const clean = tokenCode.trim().toUpperCase();

  const match = clean.match(/^2NDM-(SPVR|MNGR|EKSE)-([0-9A-F]{4})-([0-9A-F]{4})$/i);
  if (!match) return null;

  const tierCode = match[1].toUpperCase();
  const tierId = REVERSE_TIER_CODE_MAP[tierCode];
  const salt = match[2].toUpperCase();
  const signature = match[3].toUpperCase();

  return {
    prefix: '2NDM',
    tierCode,
    tierId,
    salt,
    signature,
    raw: clean,
  };
}

/**
 * Memvalidasi keaslian Token Lisensi secara lokal/offline.
 * @param {string} tokenCode - String token format 2NDM-XXXX-XXXX-XXXX
 * @param {string} [serverSecret] - Secret key HMAC
 * @param {number} [expectedDuration] - Durasi hari spesifik (opsional)
 * @returns {Object} { isValid, tierId, durationDays, salt, reason }
 */
export function verifyLicenseTokenLocally(tokenCode, serverSecret = null, expectedDuration = null) {
  const details = parseTokenDetails(tokenCode);
  if (!details) {
    return {
      isValid: false,
      tierId: null,
      durationDays: null,
      salt: null,
      reason: 'Format kode lisensi tidak sesuai (harus 2NDM-XXXX-XXXX-XXXX).',
    };
  }

  const secret = getServerSecret(serverSecret);

  // Jika expectedDuration ditentukan, cek langsung
  if (expectedDuration) {
    const duration = parseInt(expectedDuration, 10);
    const expectedSig = computeSegment4Hmac(secret, details.tierId, duration, details.salt);
    if (expectedSig === details.signature) {
      return {
        isValid: true,
        tierId: details.tierId,
        tierCode: details.tierCode,
        durationDays: duration,
        salt: details.salt,
        reason: null,
      };
    }
    return {
      isValid: false,
      tierId: details.tierId,
      tierCode: details.tierCode,
      durationDays: duration,
      salt: details.salt,
      reason: 'Checksum tanda tangan kriptografis HMAC tidak cocok.',
    };
  }

  // Jika expectedDuration tidak diberikan, cek terhadap durasi standar yang valid
  for (const duration of STANDARD_DURATIONS) {
    const expectedSig = computeSegment4Hmac(secret, details.tierId, duration, details.salt);
    if (expectedSig === details.signature) {
      return {
        isValid: true,
        tierId: details.tierId,
        tierCode: details.tierCode,
        durationDays: duration,
        salt: details.salt,
        reason: null,
      };
    }
  }

  return {
    isValid: false,
    tierId: details.tierId,
    tierCode: details.tierCode,
    durationDays: null,
    salt: details.salt,
    reason: 'Checksum tanda tangan kriptografis HMAC tidak valid untuk seluruh durasi standar.',
  };
}

/**
 * Format string input menjadi format 4x4 voucher (2NDM-XXXX-XXXX-XXXX).
 * @param {string} input 
 * @returns {string}
 */
export function formatVoucherInput(input) {
  if (!input) return '';
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16);
  const parts = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join('-');
}
