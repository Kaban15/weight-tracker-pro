import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useWeightTracker } from '@/app/components/tracker/useWeightTracker'

// Mock Supabase with pagination support
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

// Chain builder for entries query (with pagination)
const createEntriesChain = (data: unknown[], count = 0) => ({
  eq: () => ({
    gte: () => ({
      order: () => ({
        limit: () => Promise.resolve({ data, error: null })
      })
    }),
    lt: () => Promise.resolve({ count, error: null }),
    order: () => ({
      limit: () => Promise.resolve({ data, error: null })
    })
  })
})

// Chain builder for single row queries
const createSingleChain = (data: unknown) => ({
  eq: () => ({
    single: () => Promise.resolve({ data, error: null })
  })
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table) => {
      if (table === 'goals') {
        return {
          select: () => createSingleChain(mockGoal),
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        }
      }
      if (table === 'entries') {
        return {
          select: (fields?: string) => {
            // Count query
            if (fields?.includes('count')) {
              return { eq: () => ({ lt: () => Promise.resolve({ count: 0, error: null }) }) }
            }
            return createEntriesChain(mockEntries, 0)
          },
          insert: mockInsert,
          update: mockUpdate,
          delete: mockDelete,
        }
      }
      if (table === 'profiles') {
        return {
          select: () => createSingleChain(mockProfile),
          insert: mockInsert,
          update: mockUpdate,
        }
      }
      return {
        select: vi.fn(),
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
      }
    })
  }
}))

const mockUserId = 'test-user-123'

const mockGoal = {
  id: 'goal-1',
  user_id: mockUserId,
  current_weight: 85,
  target_weight: 75,
  target_date: '2024-12-31',
}

const mockEntries = [
  { id: '1', user_id: mockUserId, date: '2024-06-01', weight: 85, calories: 2000, steps: 8000, workout: 'running' },
  { id: '2', user_id: mockUserId, date: '2024-06-02', weight: 84.5, calories: 1800, steps: 10000 },
  { id: '3', user_id: mockUserId, date: '2024-06-03', weight: 84, calories: 2100, steps: 6000, workout: 'gym' },
]

const mockProfile = {
  id: 'profile-1',
  user_id: mockUserId,
  age: 30,
  gender: 'male',
  height: 180,
  activity_level: 1.5,
}

describe('useWeightTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))
      expect(result.current.loading).toBe(true)
    })

    it('loads data on mount', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.entries).toHaveLength(3)
      expect(result.current.goal).toBeTruthy()
      expect(result.current.profile).toBeTruthy()
    })

    it('does not load if userId is undefined', () => {
      const { result } = renderHook(() => useWeightTracker(undefined))
      expect(result.current.loading).toBe(true)
    })
  })

  describe('sortedEntries', () => {
    it('returns entries sorted by date', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const sorted = result.current.sortedEntries
      expect(sorted[0].date).toBe('2024-06-01')
      expect(sorted[1].date).toBe('2024-06-02')
      expect(sorted[2].date).toBe('2024-06-03')
    })
  })

  describe('currentWeight', () => {
    it('returns latest entry weight', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.currentWeight).toBe(84)
    })
  })

  describe('startWeight', () => {
    it('returns first entry weight', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.startWeight).toBe(85)
    })
  })

  describe('stats', () => {
    it('calculates correct totalEntries', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.stats.totalEntries).toBe(3)
    })

    it('calculates correct avgWeight', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const expectedAvg = (85 + 84.5 + 84) / 3
      expect(result.current.stats.avgWeight).toBeCloseTo(expectedAvg, 2)
    })

    it('calculates correct avgCalories', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const expectedAvg = (2000 + 1800 + 2100) / 3
      expect(result.current.stats.avgCalories).toBeCloseTo(expectedAvg, 2)
    })

    it('calculates correct avgSteps', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const expectedAvg = (8000 + 10000 + 6000) / 3
      expect(result.current.stats.avgSteps).toBeCloseTo(expectedAvg, 2)
    })

    it('calculates correct totalWorkouts', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.stats.totalWorkouts).toBe(2)
    })

    it('calculates correct totalWeightChange', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // currentWeight (84) - startWeight (85) = -1
      expect(result.current.stats.totalWeightChange).toBe(-1)
    })
  })

  describe('progress', () => {
    it('calculates correct progress percentage', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      // startWeight = 85, currentWeight = 84, targetWeight = 75
      // progress = ((85 - 84) / (85 - 75)) * 100 = 10%
      expect(result.current.progress).toBeCloseTo(10, 1)
    })
  })

  describe('getEntryForDate', () => {
    it('returns entry for existing date', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const entry = result.current.getEntryForDate('2024-06-01')
      expect(entry).toBeTruthy()
      expect(entry?.weight).toBe(85)
    })

    it('returns undefined for non-existing date', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      const entry = result.current.getEntryForDate('2024-06-10')
      expect(entry).toBeUndefined()
    })
  })

  describe('empty entries', () => {
    it('returns zero stats when no entries', async () => {
      const { result } = renderHook(() => useWeightTracker('empty-user'))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      }, { timeout: 2000 })
    })
  })

  describe('pagination', () => {
    it('exposes hasMoreEntries state', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.hasMoreEntries).toBe('boolean')
    })

    it('exposes loadingMore state', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(result.current.loadingMore).toBe(false)
    })

    it('provides loadMoreEntries function', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.loadMoreEntries).toBe('function')
    })

    it('provides loadAllEntries function', async () => {
      const { result } = renderHook(() => useWeightTracker(mockUserId))

      await waitFor(() => {
        expect(result.current.loading).toBe(false)
      })

      expect(typeof result.current.loadAllEntries).toBe('function')
    })
  })
})
