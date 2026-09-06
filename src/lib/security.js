import crypto from 'crypto';

const PIN_SALT = process.env.PIN_SALT || 'klolawarung_pin_secret_salt_2026';

/**
 * Hash a 6-digit numeric PIN using SHA-256 with secret salt
 */
export function hashPin(pin, customSalt = PIN_SALT) {
  if (!pin || typeof pin !== 'string') {
    throw new Error('PIN must be a valid string');
  }
  return crypto.createHash('sha256').update(`${pin}:${customSalt}`).digest('hex');
}

/**
 * Verify a PIN against a salted hash with constant-time equality check
 */
export function verifyPin(pin, hash, customSalt = PIN_SALT) {
  if (!pin || !hash) return false;
  try {
    const computed = hashPin(pin, customSalt);
    const bufComputed = Buffer.from(computed);
    const bufHash = Buffer.from(hash);
    if (bufComputed.length !== bufHash.length) return false;
    return crypto.timingSafeEqual(bufComputed, bufHash);
  } catch {
    return false;
  }
}

// In-Memory Rate Limiter for PIN verification
// Key: `pin_attempt:${shopId}`
const pinAttempts = new Map();
const MAX_ATTEMPTS = 3;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Check if the shop/key is currently rate-limited
 */
export function checkPinRateLimit(key) {
  const record = pinAttempts.get(key);
  if (!record) return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };

  const now = Date.now();
  if (now > record.resetAt) {
    pinAttempts.delete(key);
    return { isLocked: false, remainingAttempts: MAX_ATTEMPTS };
  }

  if (record.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((record.resetAt - now) / 60000);
    return {
      isLocked: true,
      remainingAttempts: 0,
      retryAfterMinutes: minutesLeft,
      message: `Terlalu banyak percobaan PIN salah. Terkunci selama ${minutesLeft} menit demi keamanan.`,
    };
  }

  return {
    isLocked: false,
    remainingAttempts: MAX_ATTEMPTS - record.count,
  };
}

/**
 * Record a failed attempt
 */
export function recordFailedPinAttempt(key) {
  const now = Date.now();
  const record = pinAttempts.get(key);
  if (!record || now > record.resetAt) {
    pinAttempts.set(key, { count: 1, resetAt: now + LOCKOUT_MS });
    return { remainingAttempts: MAX_ATTEMPTS - 1 };
  }

  record.count += 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - record.count);
  return { remainingAttempts: remaining };
}

/**
 * Reset failed attempts on successful verification
 */
export function resetPinRateLimit(key) {
  pinAttempts.delete(key);
}
