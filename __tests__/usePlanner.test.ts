import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePlanner } from '@/app/components/planner/usePlanner'

// Mock Supabase
const mockSelect = vi.fn()
const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }))
  }
}))

describe('usePlanner', () => {
  const mockUserId = 'test-user-123'
  const mockTasks = [
    { id: '1', user_id: mockUserId, date: '2024-06-15', title: 'Task 1', completed: false },
    { id: '2', user_id: mockUserId, date: '2024-06-15', title: 'Task 2', completed: true },
    { id: '3', user_id: mockUserId, date: '2024-06-16', title: 'Task 3', completed: false },
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock chain
    mockSelect.mockReturnValue({ eq: mockEq })
    mockEq.mockReturnValue({ order: mockOrder })
    mockOrder.mockResolvedValue({ data: mockTasks, error: null })

    mockInsert.mockReturnValue({ select: vi.fn().mockReturnValue({ single: mockSingle }) })
    mockSingle.mockResolvedValue({ data: { ...mockTasks[0], id: 'new-id' }, error: null })

    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockDelete.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
  })

  describe('initialization', () => {
    it('starts with loading state', () => {
      const { result } = renderHook(() => usePlanner(mockUserId))
      expect(result.current.isLoading).toBe(true)
    })

    it('loads tasks on mount', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.tasks).toHaveLength(3)
    })

    it('does not load tasks if userId is undefined', async () => {
      const { result } = renderHook(() => usePlanner(undefined))

      // Should not call supabase if no userId
      expect(mockSelect).not.toHaveBeenCalled()
    })
  })

  describe('getTasksForDate', () => {
    it('returns tasks for specific date', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const tasksForJune15 = result.current.getTasksForDate('2024-06-15')
      expect(tasksForJune15).toHaveLength(2)
    })

    it('returns empty array for date with no tasks', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const tasksForJune17 = result.current.getTasksForDate('2024-06-17')
      expect(tasksForJune17).toHaveLength(0)
    })
  })

  describe('getCompletedCountForDate', () => {
    it('returns correct counts for date with tasks', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const counts = result.current.getCompletedCountForDate('2024-06-15')
      expect(counts.completed).toBe(1)
      expect(counts.total).toBe(2)
    })

    it('returns zeros for date with no tasks', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const counts = result.current.getCompletedCountForDate('2024-06-17')
      expect(counts.completed).toBe(0)
      expect(counts.total).toBe(0)
    })
  })

  describe('addTask', () => {
    it('does not add task if title is empty', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const initialLength = result.current.tasks.length

      await act(async () => {
        const newTask = await result.current.addTask('2024-06-15', '   ')
        expect(newTask).toBeNull()
      })

      expect(result.current.tasks.length).toBe(initialLength)
    })

    it('does not add task if userId is undefined', async () => {
      const { result } = renderHook(() => usePlanner(undefined))

      await act(async () => {
        const newTask = await result.current.addTask('2024-06-15', 'Test task')
        expect(newTask).toBeNull()
      })
    })
  })

  describe('toggleTask', () => {
    it('does nothing if task does not exist', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // This should not throw
      await act(async () => {
        await result.current.toggleTask('non-existent-id')
      })

      // No update should be called
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('deleteTask', () => {
    it('does nothing if task does not exist', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      // This should not throw
      await act(async () => {
        await result.current.deleteTask('non-existent-id')
      })

      // No delete should be called
      expect(mockDelete).not.toHaveBeenCalled()
    })
  })

  describe('updateTask', () => {
    it('does not update if task does not exist', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateTask('non-existent-id', 'New title')
      })

      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('does not update if title is empty', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      await act(async () => {
        await result.current.updateTask('1', '   ')
      })

      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('sync state', () => {
    it('starts with isSyncing false', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.isSyncing).toBe(false)
    })

    it('starts with no sync error', async () => {
      const { result } = renderHook(() => usePlanner(mockUserId))

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.syncError).toBeNull()
    })
  })
})
