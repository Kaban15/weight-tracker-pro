import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('env validation', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('getServerEnv returns validated keys when all required vars are set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key')

    const { getServerEnv } = await import('@/lib/env')
    const env = getServerEnv()
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://test.supabase.co')
    expect(env.GEMINI_API_KEY).toBe('test-gemini-key')
  })

  it('getServerEnv throws when SUPABASE_URL is missing', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

    const { getServerEnv } = await import('@/lib/env')
    expect(() => getServerEnv()).toThrow()
  })
})
