import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  })),
}))

vi.mock('openai', () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({ calories: 250, protein: 20, carbs: 30, fat: 10 }),
            },
          }],
        }),
      },
    },
  })),
}))

vi.mock('openai/helpers/zod', () => ({
  zodResponseFormat: vi.fn(() => ({ type: 'json_schema' })),
}))

vi.mock('@/lib/serverRateLimiter', () => ({
  checkRateLimit: vi.fn(() => ({ allowed: true, remaining: 50, resetTime: Date.now() + 86400000 })),
  getRateLimitHeaders: vi.fn(() => new Headers()),
}))

// Stub env vars for getServerEnv()
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-key')
vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')

function createRequest(body: unknown, authHeader?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authHeader) {
    headers['authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/meals/nutrition', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

describe('POST /api/meals/nutrition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 without auth header', async () => {
    const { POST } = await import('@/app/api/meals/nutrition/route')
    const req = createRequest({ name: 'Chicken', amount: 100, unit: 'g' })
    const res = await POST(req)

    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 for missing required fields', async () => {
    const { POST } = await import('@/app/api/meals/nutrition/route')
    const req = createRequest(
      { name: 'Chicken' },
      'Bearer valid-token'
    )
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('returns 400 for invalid unit', async () => {
    const { POST } = await import('@/app/api/meals/nutrition/route')
    const req = createRequest(
      { name: 'Chicken', amount: 100, unit: 'kg' },
      'Bearer valid-token'
    )
    const res = await POST(req)

    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})
