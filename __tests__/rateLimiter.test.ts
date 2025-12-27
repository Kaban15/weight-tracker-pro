import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  isRateLimited,
  getRemainingRequests,
  resetRateLimit,
  withRateLimit,
  RATE_LIMITS
} from '@/lib/rateLimiter'

describe('rateLimiter', () => {
  beforeEach(() => {
    // Reset all rate limits between tests
    resetRateLimit('test-key')
    resetRateLimit('test-key-2')
  })

  describe('isRateLimited', () => {
    it('allows requests under limit', () => {
      const config = { maxRequests: 5, windowMs: 60000 }

      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(false)
    })

    it('blocks requests over limit', () => {
      const config = { maxRequests: 3, windowMs: 60000 }

      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(true) // 4th request blocked
    })

    it('uses separate counters for different keys', () => {
      const config = { maxRequests: 2, windowMs: 60000 }

      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(true)

      // Different key should start fresh
      expect(isRateLimited('test-key-2', config)).toBe(false)
    })

    it('resets after window expires', async () => {
      const config = { maxRequests: 1, windowMs: 50 }

      expect(isRateLimited('test-key', config)).toBe(false)
      expect(isRateLimited('test-key', config)).toBe(true)

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 60))

      expect(isRateLimited('test-key', config)).toBe(false)
    })
  })

  describe('getRemainingRequests', () => {
    it('returns max for unused key', () => {
      const config = { maxRequests: 10, windowMs: 60000 }
      expect(getRemainingRequests('unused-key', config)).toBe(10)
    })

    it('decrements correctly', () => {
      const config = { maxRequests: 5, windowMs: 60000 }

      isRateLimited('test-key', config)
      expect(getRemainingRequests('test-key', config)).toBe(4)

      isRateLimited('test-key', config)
      expect(getRemainingRequests('test-key', config)).toBe(3)
    })

    it('returns zero when exhausted', () => {
      const config = { maxRequests: 2, windowMs: 60000 }

      isRateLimited('test-key', config)
      isRateLimited('test-key', config)

      expect(getRemainingRequests('test-key', config)).toBe(0)
    })
  })

  describe('resetRateLimit', () => {
    it('resets counter for key', () => {
      const config = { maxRequests: 2, windowMs: 60000 }

      isRateLimited('test-key', config)
      isRateLimited('test-key', config)
      expect(isRateLimited('test-key', config)).toBe(true)

      resetRateLimit('test-key')
      expect(isRateLimited('test-key', config)).toBe(false)
    })
  })

  describe('withRateLimit', () => {
    it('wraps function with rate limiting', async () => {
      const config = { maxRequests: 2, windowMs: 60000 }
      const mockFn = vi.fn().mockResolvedValue('success')

      const limitedFn = withRateLimit(mockFn, 'test-key', config)

      await expect(limitedFn()).resolves.toBe('success')
      await expect(limitedFn()).resolves.toBe('success')
      await expect(limitedFn()).rejects.toThrow('Rate limit exceeded')
    })

    it('passes arguments to wrapped function', async () => {
      const config = { maxRequests: 5, windowMs: 60000 }
      const mockFn = vi.fn().mockImplementation((a, b) => Promise.resolve(a + b))

      const limitedFn = withRateLimit(mockFn, 'test-key', config)

      await expect(limitedFn(1, 2)).resolves.toBe(3)
      expect(mockFn).toHaveBeenCalledWith(1, 2)
    })
  })

  describe('RATE_LIMITS constants', () => {
    it('has write config', () => {
      expect(RATE_LIMITS.write).toBeDefined()
      expect(RATE_LIMITS.write.maxRequests).toBeGreaterThan(0)
      expect(RATE_LIMITS.write.windowMs).toBeGreaterThan(0)
    })

    it('has toggle config', () => {
      expect(RATE_LIMITS.toggle).toBeDefined()
      expect(RATE_LIMITS.toggle.maxRequests).toBeGreaterThan(0)
    })

    it('has create config', () => {
      expect(RATE_LIMITS.create).toBeDefined()
      expect(RATE_LIMITS.create.maxRequests).toBeGreaterThan(0)
    })

    it('has delete config', () => {
      expect(RATE_LIMITS.delete).toBeDefined()
      expect(RATE_LIMITS.delete.maxRequests).toBeGreaterThan(0)
    })

    it('has fetch config', () => {
      expect(RATE_LIMITS.fetch).toBeDefined()
      expect(RATE_LIMITS.fetch.maxRequests).toBeGreaterThan(0)
    })

    it('toggle allows more requests than create', () => {
      expect(RATE_LIMITS.toggle.maxRequests).toBeGreaterThan(RATE_LIMITS.create.maxRequests)
    })
  })
})
