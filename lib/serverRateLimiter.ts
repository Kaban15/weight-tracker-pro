/**
 * Server-side rate limiter for API routes
 * Uses in-memory storage with sliding window algorithm
 *
 * Note: For production with multiple instances, consider using Redis
 */

import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

interface RequestRecord {
  timestamps: number[];
}

// In-memory storage for rate limiting
// In production, use Redis or another distributed cache
const rateLimitStore = new Map<string, RequestRecord>();

// Clean up old records periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [key, record] of rateLimitStore.entries()) {
    const validTimestamps = record.timestamps.filter(t => now - t < windowMs);
    if (validTimestamps.length === 0) {
      rateLimitStore.delete(key);
    } else {
      record.timestamps = validTimestamps;
    }
  }
}

/**
 * Get client identifier from request
 */
function getClientId(request: NextRequest): string {
  // Try to get real IP from headers (for proxied requests)
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback to connection info (might not be available in all environments)
  return "unknown";
}

/**
 * Check if request should be rate limited
 */
export function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const clientId = getClientId(request);
  const now = Date.now();

  // Periodic cleanup
  cleanup(config.windowMs);

  const record = rateLimitStore.get(clientId) || { timestamps: [] };

  // Remove expired timestamps
  record.timestamps = record.timestamps.filter(
    timestamp => now - timestamp < config.windowMs
  );

  const remaining = Math.max(0, config.maxRequests - record.timestamps.length);
  const oldestTimestamp = record.timestamps[0] || now;
  const resetTime = oldestTimestamp + config.windowMs;

  // Check if limit exceeded
  if (record.timestamps.length >= config.maxRequests) {
    rateLimitStore.set(clientId, record);
    return { allowed: false, remaining: 0, resetTime };
  }

  // Add current request
  record.timestamps.push(now);
  rateLimitStore.set(clientId, record);

  return { allowed: true, remaining: remaining - 1, resetTime };
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(
  remaining: number,
  resetTime: number,
  limit: number
): Headers {
  const headers = new Headers();
  headers.set("X-RateLimit-Limit", limit.toString());
  headers.set("X-RateLimit-Remaining", remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(resetTime / 1000).toString());
  return headers;
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig = { maxRequests: 60, windowMs: 60000 }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const { allowed, remaining, resetTime } = checkRateLimit(request, config);
    const headers = getRateLimitHeaders(remaining, resetTime, config.maxRequests);

    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers.entries()),
            "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    try {
      const response = await handler(request);

      // Add rate limit headers to response
      const newHeaders = new Headers(response.headers);
      headers.forEach((value, key) => {
        newHeaders.set(key, value);
      });

      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (error) {
      console.error("API error:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500, headers: Object.fromEntries(headers.entries()) }
      );
    }
  };
}

// Default rate limit configurations for different route types
export const RATE_LIMIT_CONFIGS = {
  // Standard API routes
  api: { maxRequests: 60, windowMs: 60000 }, // 60/min
  // Auth routes
  auth: { maxRequests: 10, windowMs: 60000 }, // 10/min
  // Admin routes
  admin: { maxRequests: 30, windowMs: 60000 }, // 30/min
  // Feedback/contact routes
  feedback: { maxRequests: 5, windowMs: 60000 }, // 5/min
  // File upload routes
  upload: { maxRequests: 10, windowMs: 60000 }, // 10/min
} as const;
