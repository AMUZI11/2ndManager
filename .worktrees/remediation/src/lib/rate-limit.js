import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis client
// We allow dummy credentials to prevent crashes during build if they are not set,
// though rate limiting will fail gracefully or error in production.
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || 'https://dummy',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || 'dummy',
});

// Create a new ratelimiter, that allows 10 requests per 10 seconds
export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
  analytics: true,
  prefix: '@upstash/ratelimit',
});

/**
 * Helper to check rate limit for a given identifier (e.g. IP address or User ID)
 */
export async function checkRateLimit(identifier) {
  try {
    const { success, limit, reset, remaining } = await ratelimit.limit(identifier);
    return { success, limit, reset, remaining };
  } catch (error) {
    console.error('Rate limit error:', error);
    // If upstash fails, we can choose to allow the request or block it. 
    // Here we allow it to prevent blocking users if redis is down.
    return { success: true, limit: 0, reset: 0, remaining: 0 };
  }
}
