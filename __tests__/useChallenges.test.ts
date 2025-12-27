import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { calculateEndDate, getChallengeProgress, useChallenges } from '@/app/components/challenge/useChallenges'
import { Challenge } from '@/app/components/challenge/types'

// Mock localStorage
const mockLocalStorage: { [key: string]: string } = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key) => mockLocalStorage[key] || null),
    setItem: vi.fn((key, value) => { mockLocalStorage[key] = value }),
    removeItem: vi.fn((key) => { delete mockLocalStorage[key] }),
    clear: vi.fn(() => { Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]) }),
  },
  writable: true,
})

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    }))
  }
}))

describe('calculateEndDate', () => {
  it('calculates end date for days', () => {
    const start = new Date(2024, 5, 1) // June 1, 2024
    const end = calculateEndDate(start, 'days', 30)

    // 30 days from June 1 = June 30 (inclusive, so -1 day)
    expect(end.getDate()).toBe(30)
    expect(end.getMonth()).toBe(5) // June
  })

  it('calculates end date for weeks', () => {
    const start = new Date(2024, 5, 1) // June 1, 2024
    const end = calculateEndDate(start, 'weeks', 2)

    // 2 weeks = 14 days, -1 = 13 days from start
    expect(end.getDate()).toBe(14)
    expect(end.getMonth()).toBe(5) // June
  })

  it('calculates end date for months', () => {
    const start = new Date(2024, 5, 1) // June 1, 2024
    const end = calculateEndDate(start, 'months', 1)

    // 1 month from June 1 = June 30 (last day of June)
    expect(end.getDate()).toBe(30)
    expect(end.getMonth()).toBe(5) // June
  })

  it('calculates end date for year', () => {
    const start = new Date(2024, 5, 1) // June 1, 2024
    const end = calculateEndDate(start, 'year', 1)

    // 1 year from June 1, 2024 = May 31, 2025
    expect(end.getFullYear()).toBe(2025)
    expect(end.getMonth()).toBe(4) // May
    expect(end.getDate()).toBe(31)
  })
})

describe('getChallengeProgress', () => {
  const createChallenge = (overrides: Partial<Challenge> = {}): Challenge => ({
    id: 'test-1',
    name: 'Test Challenge',
    startDate: '2024-06-01',
    endDate: '2024-06-30',
    trackReps: false,
    dailyGoals: {},
    completedDays: {},
    ...overrides
  })

  it('calculates totalDays correctly', () => {
    const challenge = createChallenge({
      startDate: '2024-06-01',
      endDate: '2024-06-30'
    })

    const progress = getChallengeProgress(challenge)
    expect(progress.totalDays).toBe(30)
  })

  it('calculates completedCount correctly', () => {
    const challenge = createChallenge({
      completedDays: {
        '2024-06-01': 1,
        '2024-06-02': 1,
        '2024-06-03': 1
      }
    })

    const progress = getChallengeProgress(challenge)
    expect(progress.completedCount).toBe(3)
  })

  it('calculates totalReps correctly', () => {
    const challenge = createChallenge({
      trackReps: true,
      completedDays: {
        '2024-06-01': 50,
        '2024-06-02': 30,
        '2024-06-03': 40
      }
    })

    const progress = getChallengeProgress(challenge)
    expect(progress.totalReps).toBe(120)
  })

  it('calculates percentage correctly', () => {
    const challenge = createChallenge({
      startDate: '2024-06-01',
      endDate: '2024-06-10', // 10 days
      completedDays: {
        '2024-06-01': 1,
        '2024-06-02': 1,
        '2024-06-03': 1
      }
    })

    const progress = getChallengeProgress(challenge)
    expect(progress.percentage).toBe(30) // 3/10 = 30%
  })

  it('detects completed challenge', () => {
    const pastChallenge = createChallenge({
      startDate: '2024-01-01',
      endDate: '2024-01-31' // In the past
    })

    const progress = getChallengeProgress(pastChallenge)
    expect(progress.isCompleted).toBe(true)
  })

  it('detects active challenge', () => {
    const futureEnd = new Date()
    futureEnd.setDate(futureEnd.getDate() + 30)
    const futureEndStr = futureEnd.toISOString().split('T')[0]

    const activeChallenge = createChallenge({
      endDate: futureEndStr
    })

    const progress = getChallengeProgress(activeChallenge)
    expect(progress.isCompleted).toBe(false)
  })
})

describe('useChallenges', () => {
  const mockUserId = 'test-user-123'

  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
  })

  describe('initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => useChallenges(mockUserId))
      expect(result.current.isLoading).toBe(true)
    })

    it('starts with empty challenges', () => {
      const { result } = renderHook(() => useChallenges(mockUserId))
      expect(result.current.challenges).toEqual([])
    })

    it('loads challenges on mount', async () => {
      const { result } = renderHook(() => useChallenges(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
    })

    it('does not load if userId is undefined', () => {
      const { result } = renderHook(() => useChallenges(undefined))
      expect(result.current.isLoading).toBe(true)
      expect(result.current.challenges).toEqual([])
    })
  })

  describe('sync state', () => {
    it('starts with isSyncing false', () => {
      const { result } = renderHook(() => useChallenges(mockUserId))
      expect(result.current.isSyncing).toBe(false)
    })

    it('starts with no sync error', () => {
      const { result } = renderHook(() => useChallenges(mockUserId))
      expect(result.current.syncError).toBeNull()
    })
  })

  describe('createChallenge', () => {
    it('returns null if userId is undefined', async () => {
      const { result } = renderHook(() => useChallenges(undefined))

      const newChallenge = await result.current.createChallenge({
        name: 'Test',
        dateMode: 'duration',
        durationType: 'days',
        durationValue: 30,
        trackReps: false,
        defaultGoal: 0,
        goalUnit: '',
        startDate: '',
        endDate: ''
      })

      expect(newChallenge).toBeNull()
    })
  })

  describe('exported functions', () => {
    it('exports calculateEndDate', () => {
      expect(typeof calculateEndDate).toBe('function')
    })

    it('exports getChallengeProgress', () => {
      expect(typeof getChallengeProgress).toBe('function')
    })
  })
})
