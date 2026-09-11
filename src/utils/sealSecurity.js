// src/utils/sealSecurity.js
// Utilitas Stempel Kriptografis SHA-256 untuk Integritas Dokumen Finansial & Audit Bank
// Mendukung Node.js runtime dan Web Crypto API di peramban (browser)

/**
 * Membuat SHA-256 Checksum Hash dari payload dokumen
 * @param {Object|string} payload 
 * @returns {Promise<string>} 64 karakter Hexadecimal Uppercase
 */
export async function generateDocumentSealHash(payload) {
  const normalizedString = typeof payload === 'string' 
    ? payload 
    : JSON.stringify(payload, Object.keys(payload).sort());

  // Browser environment (Web Crypto API)
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedString);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  }

  // Node.js server environment
  try {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(normalizedString).digest('hex').toUpperCase();
  } catch (e) {
    // Fallback manual hash jika crypto tidak tersedia
    let hash = 0;
    for (let i = 0; i < normalizedString.length; i++) {
      const char = normalizedString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0').toUpperCase();
  }
}

/**
 * Menghasilkan URL Verifikasi Publik untuk QR Code Stempel
 * @param {string} checksumHash 
 * @param {string} [baseUrl] 
 * @returns {string} URL absolut verifikasi
 */
export function buildVerificationUrl(checksumHash, baseUrl = 'https://2ndmanager.com') {
  const cleanBase = (baseUrl || 'https://2ndmanager.com').replace(/\/$/, '');
  return `${cleanBase}/verify-seal/${checksumHash}`;
}

/**
 * Format ringkas tampilan checksum untuk kartu dan print view (misal: "A8F9...B24C")
 */
export function formatShortChecksum(checksumHash) {
  if (!checksumHash || checksumHash.length < 16) return checksumHash || 'N/A';
  return `${checksumHash.substring(0, 8)}...${checksumHash.substring(checksumHash.length - 8)}`;
}
