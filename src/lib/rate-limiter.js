/**
 * In-Memory Sliding Window Rate Limiter for 2ndManager
 * Multi-tenant safe with IP extraction and standard 429 response formatting.
 */

// Global cache to maintain sliding window across warm serverless instances
const rateLimitMap = new Map();

// Periodic cleanup of expired rate limit entries (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetTime <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Extract client IP address reliably from incoming request headers
 * @param {Request} request 
 * @returns {string}
 */
export function getClientIp(request) {
  const headers = request.headers;
  
  // Cloudflare
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  // Standard X-Forwarded-For (first IP in chain is client)
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  // Nginx / Reverse Proxy
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // True-Client-IP (Akamai, Cloudflare Enterprise)
  const trueClientIp = headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp.trim();

  return '127.0.0.1';
}

/**
 * Check and record a rate limit hit for a given request
 * @param {Request} request 
 * @param {Object} options
 * @param {number} options.limit - Max requests allowed in the window (default: 10)
 * @param {number} options.windowMs - Sliding window duration in ms (default: 60,000 / 1 min)
 * @param {string} [options.identifier] - Route or operation identifier
 * @returns {{ isRateLimited: boolean, limit: number, remaining: number, resetTime: number, retryAfter: number }}
 */
export function checkRateLimit(request, { limit = 10, windowMs = 60000, identifier = 'default' } = {}) {
  const ip = getClientIp(request);
  const key = `${identifier}:${ip}`;
  const now = Date.now();

  let record = rateLimitMap.get(key);

  if (!record || record.resetTime <= now) {
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitMap.set(key, record);
    return {
      isRateLimited: false,
      limit,
      remaining: Math.max(0, limit - 1),
      resetTime: record.resetTime,
      retryAfter: Math.ceil(windowMs / 1000),
    };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  if (record.count > limit) {
    return {
      isRateLimited: true,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter,
    };
  }

  return {
    isRateLimited: false,
    limit,
    remaining,
    resetTime: record.resetTime,
    retryAfter,
  };
}

/**
 * Helper to generate standard Next.js Response for rate limit 429
 * @param {Object} rateLimitInfo 
 * @returns {Response}
 */
export function createRateLimitResponse(rateLimitInfo) {
  return new Response(
    JSON.stringify({
      error: 'Terlalu banyak permintaan (Rate limit exceeded). Silakan coba lagi beberapa saat.',
      retryAfter: rateLimitInfo.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(rateLimitInfo.retryAfter),
        'X-RateLimit-Limit': String(rateLimitInfo.limit),
        'X-RateLimit-Remaining': String(rateLimitInfo.remaining),
        'X-RateLimit-Reset': String(Math.ceil(rateLimitInfo.resetTime / 1000)),
      },
    }
  );
}
