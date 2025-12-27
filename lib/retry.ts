/**
 * Retry utilities for handling transient errors
 */

interface RetryConfig {
  maxRetries: number;           // Maximum number of retry attempts
  baseDelay: number;            // Base delay in ms
  maxDelay: number;             // Maximum delay in ms
  backoffMultiplier: number;    // Exponential backoff multiplier
  retryCondition?: (error: unknown) => boolean;  // Custom condition for retry
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Check if an error is retryable (network/transient errors)
 */
function isRetryableError(error: unknown): boolean {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Supabase/PostgreSQL errors that are typically transient
  if (error && typeof error === 'object') {
    const err = error as { code?: string; status?: number; message?: string };

    // Connection errors
    if (err.code === 'PGRST301' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      return true;
    }

    // Server errors (5xx)
    if (err.status && err.status >= 500 && err.status < 600) {
      return true;
    }

    // Rate limiting (429)
    if (err.status === 429) {
      return true;
    }

    // Network-related messages
    if (err.message && (
      err.message.includes('network') ||
      err.message.includes('timeout') ||
      err.message.includes('connection') ||
      err.message.includes('ECONNRESET')
    )) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter (10-30% random variation)
  const jitter = cappedDelay * (0.1 + Math.random() * 0.2);
  return cappedDelay + jitter;
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with automatic retry on failure
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Check if we should retry
      const shouldRetry = finalConfig.retryCondition
        ? finalConfig.retryCondition(error)
        : isRetryableError(error);

      if (!shouldRetry || attempt === finalConfig.maxRetries) {
        throw error;
      }

      // Wait before retrying
      const delay = calculateDelay(attempt, finalConfig);
      await sleep(delay);
    }
  }

  // This should never be reached due to the throw in the loop
  throw new Error("Retry logic error: exhausted attempts without resolution");
}

/**
 * Create a retryable version of an async function
 */
export function createRetryable<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  config: Partial<RetryConfig> = {}
): T {
  return (async (...args: Parameters<T>) => {
    return withRetry(() => fn(...args), config);
  }) as T;
}

/**
 * Retry configuration presets
 */
export const RETRY_PRESETS = {
  // Fast retries for quick operations
  fast: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffMultiplier: 2,
  },
  // Standard retries for most operations
  standard: {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  },
  // Patient retries for critical operations
  patient: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2,
  },
} as const;

export { isRetryableError };
