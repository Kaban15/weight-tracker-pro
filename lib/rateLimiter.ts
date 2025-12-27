/**
 * Simple client-side rate limiter to prevent API spam
 * Uses sliding window algorithm
 */

interface RateLimiterConfig {
  maxRequests: number;    // Maximum requests allowed in the window
  windowMs: number;       // Time window in milliseconds
}

interface RequestRecord {
  timestamps: number[];
}

const requestRecords: Map<string, RequestRecord> = new Map();

/**
 * Check if an action is allowed based on rate limits
 * @param key - Unique identifier for the action (e.g., 'addTask', 'toggleChallenge')
 * @param config - Rate limiting configuration
 * @returns true if action is allowed, false if rate limited
 */
export function isRateLimited(key: string, config: RateLimiterConfig): boolean {
  const now = Date.now();
  const record = requestRecords.get(key) || { timestamps: [] };

  // Remove expired timestamps
  record.timestamps = record.timestamps.filter(
    timestamp => now - timestamp < config.windowMs
  );

  // Check if limit exceeded
  if (record.timestamps.length >= config.maxRequests) {
    return true;
  }

  // Add current request
  record.timestamps.push(now);
  requestRecords.set(key, record);

  return false;
}

/**
 * Get remaining requests for a key
 */
export function getRemainingRequests(key: string, config: RateLimiterConfig): number {
  const now = Date.now();
  const record = requestRecords.get(key);

  if (!record) return config.maxRequests;

  const validTimestamps = record.timestamps.filter(
    timestamp => now - timestamp < config.windowMs
  );

  return Math.max(0, config.maxRequests - validTimestamps.length);
}

/**
 * Reset rate limit for a key
 */
export function resetRateLimit(key: string): void {
  requestRecords.delete(key);
}

/**
 * Create a rate-limited version of an async function
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  key: string,
  config: RateLimiterConfig
): T {
  return (async (...args: Parameters<T>) => {
    if (isRateLimited(key, config)) {
      throw new Error('Rate limit exceeded. Please wait before trying again.');
    }
    return fn(...args);
  }) as T;
}

// Default configs for common operations
export const RATE_LIMITS = {
  // Database writes: 20 per minute
  write: { maxRequests: 20, windowMs: 60000 },
  // Quick toggles: 30 per minute
  toggle: { maxRequests: 30, windowMs: 60000 },
  // Creates: 10 per minute
  create: { maxRequests: 10, windowMs: 60000 },
  // Deletes: 10 per minute
  delete: { maxRequests: 10, windowMs: 60000 },
  // Fetches: 60 per minute
  fetch: { maxRequests: 60, windowMs: 60000 },
} as const;
