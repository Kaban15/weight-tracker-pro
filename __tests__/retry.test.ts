import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  withRetry,
  createRetryable,
  isRetryableError,
  RETRY_PRESETS
} from '@/lib/retry'

describe('retry', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('isRetryableError', () => {
    it('returns true for network errors', () => {
      const error = new TypeError('Failed to fetch')
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 500 errors', () => {
      const error = { status: 500, message: 'Internal Server Error' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 503 errors', () => {
      const error = { status: 503, message: 'Service Unavailable' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for 429 rate limit errors', () => {
      const error = { status: 429, message: 'Too Many Requests' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for connection reset errors', () => {
      const error = { code: 'ECONNRESET', message: 'Connection reset' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns true for timeout errors', () => {
      const error = { message: 'Connection timeout' }
      expect(isRetryableError(error)).toBe(true)
    })

    it('returns false for 400 errors', () => {
      const error = { status: 400, message: 'Bad Request' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 401 errors', () => {
      const error = { status: 401, message: 'Unauthorized' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for 404 errors', () => {
      const error = { status: 404, message: 'Not Found' }
      expect(isRetryableError(error)).toBe(false)
    })

    it('returns false for regular errors', () => {
      const error = new Error('Some error')
      expect(isRetryableError(error)).toBe(false)
    })
  })

  describe('withRetry', () => {
    it('returns result on first success', async () => {
      vi.useRealTimers() // Use real timers for this test
      const fn = vi.fn().mockResolvedValue('success')

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('retries on retryable error', async () => {
      vi.useRealTimers() // Use real timers for this test
      const fn = vi.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue('success')

      const result = await withRetry(fn, { maxRetries: 3, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('throws after max retries', async () => {
      vi.useRealTimers() // Use real timers for this test
      const error = { status: 500 }
      const fn = vi.fn().mockRejectedValue(error)

      // Use very short delays for testing
      let caughtError: unknown
      try {
        await withRetry(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })
      } catch (e) {
        caughtError = e
      }

      expect(caughtError).toEqual(error)
      expect(fn).toHaveBeenCalledTimes(3) // Initial + 2 retries
    })

    it('does not retry non-retryable errors', async () => {
      vi.useRealTimers() // Use real timers for this test
      const error = { status: 400 }
      const fn = vi.fn().mockRejectedValue(error)

      let caughtError: unknown
      try {
        await withRetry(fn, { maxRetries: 3, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })
      } catch (e) {
        caughtError = e
      }

      expect(caughtError).toEqual(error)
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('uses custom retry condition', async () => {
      vi.useRealTimers() // Use real timers for this test
      const fn = vi.fn()
        .mockRejectedValueOnce({ custom: true })
        .mockResolvedValue('success')

      const result = await withRetry(fn, {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 50,
        backoffMultiplier: 2,
        retryCondition: (err) => (err as { custom?: boolean }).custom === true
      })

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })
  })

  describe('createRetryable', () => {
    it('wraps function with retry logic', async () => {
      vi.useRealTimers() // Use real timers for this test
      const fn = vi.fn()
        .mockRejectedValueOnce({ status: 500 })
        .mockResolvedValue('success')

      const retryableFn = createRetryable(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })

      const result = await retryableFn()

      expect(result).toBe('success')
      expect(fn).toHaveBeenCalledTimes(2)
    })

    it('passes arguments to wrapped function', async () => {
      vi.useRealTimers() // Use real timers for this test
      const fn = vi.fn().mockImplementation((a, b) => Promise.resolve(a + b))
      const retryableFn = createRetryable(fn, { maxRetries: 2, baseDelay: 10, maxDelay: 50, backoffMultiplier: 2 })

      const result = await retryableFn(1, 2)

      expect(result).toBe(3)
      expect(fn).toHaveBeenCalledWith(1, 2)
    })
  })

  describe('RETRY_PRESETS', () => {
    it('has fast preset', () => {
      expect(RETRY_PRESETS.fast).toBeDefined()
      expect(RETRY_PRESETS.fast.maxRetries).toBe(2)
    })

    it('has standard preset', () => {
      expect(RETRY_PRESETS.standard).toBeDefined()
      expect(RETRY_PRESETS.standard.maxRetries).toBe(3)
    })

    it('has patient preset', () => {
      expect(RETRY_PRESETS.patient).toBeDefined()
      expect(RETRY_PRESETS.patient.maxRetries).toBe(5)
    })
  })
})
