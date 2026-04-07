import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  })),
}))

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: vi.fn().mockResolvedValue({ error: null }) },
  })),
}))

vi.mock('@/lib/serverRateLimiter', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 10, resetTime: Date.now() + 60000 })),
  getRateLimitHeaders: vi.fn(() => new Headers()),
  RATE_LIMIT_CONFIGS: { feedback: { maxRequests: 5, windowMs: 60000 } },
}))

// Stub env vars for getServerEnv()
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key')

function createRequest(body: unknown) {
  return new NextRequest('http://localhost:3000/api/feedback', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 for missing required fields (no message)', async () => {
    const { POST } = await import('@/app/api/feedback/route')
    const req = createRequest({ category: 'bug' })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 for invalid category', async () => {
    const { POST } = await import('@/app/api/feedback/route')
    const req = createRequest({ category: 'invalid-cat', message: 'This is a test message with enough chars' })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns success for valid input', async () => {
    const { POST } = await import('@/app/api/feedback/route')
    const req = createRequest({
      userId: 'user-123',
      userEmail: 'test@example.com',
      category: 'bug',
      message: 'Something is broken in the app',
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('strips unexpected fields silently', async () => {
    const { POST } = await import('@/app/api/feedback/route')
    const req = createRequest({
      category: 'feature',
      message: 'Please add dark mode support',
      unexpectedField: 'should be stripped',
      anotherExtra: 123,
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })
})
