import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { Task, TaskFormData } from '@/app/components/todo/types'

// Mock localStorage
const mockLocalStorage: Record<string, string> = {}
Object.defineProperty(global, 'localStorage', {
  value: {
    getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
    setItem: vi.fn((key: string, value: string) => { mockLocalStorage[key] = value }),
    removeItem: vi.fn((key: string) => { delete mockLocalStorage[key] }),
    clear: vi.fn(() => { Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]) }),
  },
  writable: true,
})

// --- Test data factory ---
const createTask = (overrides: Partial<Task> = {}): Task => ({
  id: `task-${Math.random().toString(36).substring(7)}`,
  title: 'Test Task',
  notes: undefined,
  deadline: '2026-04-07',
  priority: 'medium',
  status: 'not_started',
  category: 'duties',
  completed: false,
  createdAt: '2026-04-07T10:00:00.000Z',
  updatedAt: '2026-04-07T10:00:00.000Z',
  ...overrides,
})

// --- Supabase mock ---
const mockTaskRows = [
  {
    id: 'task-1',
    user_id: 'test-user-123',
    title: 'Buy groceries',
    notes: null,
    date: '2026-04-07',
    priority: 'high',
    status: 'not_started',
    category: 'duties',
    completed: false,
    duration: null,
    time: null,
    created_at: '2026-04-07T10:00:00.000Z',
    updated_at: '2026-04-07T10:00:00.000Z',
  },
  {
    id: 'task-2',
    user_id: 'test-user-123',
    title: 'Workout',
    notes: 'Leg day',
    date: '2026-04-08',
    priority: 'medium',
    status: 'in_progress',
    category: 'health',
    completed: false,
    duration: 60,
    time: '09:00',
    created_at: '2026-04-07T11:00:00.000Z',
    updated_at: '2026-04-07T11:00:00.000Z',
  },
]

const mockInsert = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === 'tasks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => Promise.resolve({ data: mockTaskRows, error: null })),
            })),
          })),
          insert: mockInsert.mockReturnValue(Promise.resolve({ error: null })),
          update: mockUpdate.mockReturnValue({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          }),
          delete: mockDelete.mockReturnValue({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          }),
          upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
        }
      }
      return {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }
    }),
  },
}))

vi.mock('@/lib/rateLimiter', () => ({
  isRateLimited: vi.fn(() => false),
  RATE_LIMITS: {
    create: { maxCalls: 10, windowMs: 60000 },
    write: { maxCalls: 30, windowMs: 60000 },
    delete: { maxCalls: 10, windowMs: 60000 },
    toggle: { maxCalls: 30, windowMs: 60000 },
  },
}))

const mockUserId = 'test-user-123'

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key])
    // Mark migration as done to skip localStorage migration path
    mockLocalStorage[`tasks_migrated_to_supabase_${mockUserId}`] = 'true'
  })

  // Lazy import to ensure mocks are in place
  async function renderUseTasks(userId: string | undefined) {
    const { useTasks } = await import('@/app/components/todo/useTasks')
    return renderHook(() => useTasks(userId))
  }

  it('loads tasks on mount', async () => {
    const { result } = await renderUseTasks(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.tasks).toHaveLength(2)
    // rowToTask maps date -> deadline
    expect(result.current.tasks[0]!.deadline).toBeDefined()
  })

  it('handles empty task list', async () => {
    // Override the mock to return empty
    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase!.from).mockReturnValueOnce({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    } as never)

    const { result } = await renderUseTasks(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.stats.total).toBe(0)
  })

  it('adds a new task', async () => {
    const { result } = await renderUseTasks(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const formData: TaskFormData = {
      title: 'New task',
      notes: 'Some notes',
      deadline: '2026-04-10',
      priority: 'high',
      status: 'not_started',
      category: 'work',
    }

    await act(async () => {
      await result.current.addTask(formData)
    })

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        title: 'New task',
        notes: 'Some notes',
        date: '2026-04-10',
        priority: 'high',
        status: 'not_started',
        category: 'work',
        completed: false,
      })
    )
  })

  it('updates task status', async () => {
    const { result } = await renderUseTasks(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateTask('task-1', { status: 'done', completed: true })
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'done',
        completed: true,
      })
    )
  })

  it('deletes a task', async () => {
    const { result } = await renderUseTasks(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteTask('task-1')
    })

    expect(mockDelete).toHaveBeenCalled()
  })
})
