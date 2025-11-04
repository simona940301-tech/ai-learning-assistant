/**
 * Simple in-memory rate limiter for mission answers
 *
 * Limits: ≤60 requests per minute per mission
 *
 * For production: Consider using Redis or Upstash Rate Limit
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store: Map<missionId, RateLimitRecord>
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check rate limit for mission answer endpoint
 * Limit: 60 requests per minute per mission
 */
export function checkRateLimit(missionId: string): RateLimitResult {
  const limit = 60;
  const windowMs = 60 * 1000; // 1 minute
  const now = Date.now();

  // Get or create record
  let record = rateLimitStore.get(missionId);

  // If no record or expired, create new
  if (!record || record.resetAt < now) {
    record = {
      count: 0,
      resetAt: now + windowMs,
    };
    rateLimitStore.set(missionId, record);
  }

  // Increment count
  record.count++;

  // Check if allowed
  const allowed = record.count <= limit;
  const remaining = Math.max(0, limit - record.count);

  return {
    allowed,
    remaining,
    resetAt: record.resetAt,
    limit,
  };
}

/**
 * Reset rate limit for a mission (e.g., when mission is completed)
 */
export function resetRateLimit(missionId: string): void {
  rateLimitStore.delete(missionId);
}
