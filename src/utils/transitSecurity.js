/**
 * src/utils/transitSecurity.js
 * Generator dan Verifikator PIN Kriptografis Transit Mutasi Antar-Cabang
 * Mendukung eksekusi di browser (Web Crypto API) dan runtime Node.js.
 */

/**
 * Menghasilkan 6-digit PIN acak kriptografis (100000 - 999999).
 * @returns {string} PIN 6-digit
 */
export function generateSecureTransferPin() {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const array = new Uint32Array(1);
    window.crypto.getRandomValues(array);
    const pinNum = 100000 + (array[0] % 900000);
    return String(pinNum);
  }
  
  // Fallback untuk runtime Node.js / Server-side
  try {
    const nodeCrypto = require('crypto');
    return String(nodeCrypto.randomInt(100000, 1000000));
  } catch {
    const fallback = 100000 + Math.floor(Math.random() * 900000);
    return String(fallback);
  }
}

/**
 * Menghasilkan heksadesimal hash SHA-256 dari string PIN.
 * @param {string} pin - 6 digit PIN
 * @returns {Promise<string>} 64 karakter hex hash
 */
export async function hashTransferPin(pin) {
  if (!pin) return '';
  const cleanPin = String(pin).trim();

  // Browser Web Crypto API
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanPin);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Node.js crypto fallback
  try {
    const nodeCrypto = require('crypto');
    return nodeCrypto.createHash('sha256').update(cleanPin).digest('hex');
  } catch {
    throw new Error('Lingkungan eksekusi tidak mendukung kriptografi SHA-256.');
  }
}
