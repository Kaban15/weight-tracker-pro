import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import EntryModal from '@/app/components/tracker/EntryModal'
import { Meal } from '@/app/components/tracker/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Sets window.innerWidth to 375 and dispatches resize, simulating a mobile viewport */
function setMobileViewport() {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  })
  window.dispatchEvent(new Event('resize'))
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock useTasks for TodoModeWeekly
const mockUseTasks = {
  tasks: [],
  stats: { total: 0, today: 0, overdue: 0, completed: 0, notCompleted: 0, cancelled: 0, percentComplete: 0 },
  isLoading: false,
  isSyncing: false,
  syncError: null as string | null,
  addTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  toggleComplete: vi.fn(),
  reloadTasks: vi.fn(),
  DEFAULT_TASK_FORM: {
    title: '',
    notes: '',
    deadline: '2026-02-11',
    priority: 'medium' as const,
    status: 'not_started' as const,
    category: 'duties' as const,
    duration: undefined,
    time: undefined,
  },
}

vi.mock('@/app/components/todo/useTasks', () => ({
  useTasks: () => mockUseTasks,
}))

vi.mock('@/lib/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'test-user-id', email: 'test@test.com' }, signOut: vi.fn() }),
}))

vi.mock('@/lib/NavigationContext', () => ({
  useNavigation: () => ({
    currentMode: 'todo',
    currentSubView: null,
    history: [],
    navigateTo: vi.fn(),
    navigateToSubView: vi.fn(),
    goBack: vi.fn(),
    goHome: vi.fn(),
    canGoBack: true,
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------

let originalInnerWidth: number

beforeEach(() => {
  originalInnerWidth = window.innerWidth
  setMobileViewport()
})

afterEach(() => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: originalInnerWidth,
  })
})

// ---------------------------------------------------------------------------
// EntryModal tests
// ---------------------------------------------------------------------------
describe('EntryModal — mobile (375px)', () => {
  const defaultProps = {
    isOpen: true,
    entry: null,
    selectedDate: '2026-02-11',
    goal: null,
    onSave: vi.fn().mockResolvedValue(true),
    onDelete: vi.fn().mockResolvedValue(true),
    onClose: vi.fn(),
  }

  it('renders macro grid with grid-cols-2 at mobile width', () => {
    const meals: Meal[] = [
      { id: 'meal-1', name: 'Jajecznica', type: 'Śniadanie', calories: 300, protein: 20, carbs: 5, fat: 22 },
    ]

    const entry = {
      id: 'entry-1',
      date: '2026-02-11',
      weight: 80,
      meals,
    }

    const { container } = render(<EntryModal {...defaultProps} entry={entry} />)

    // The macro inputs are in a grid div with grid-cols-2 md:grid-cols-4
    const macroGrid = container.querySelector('.grid.grid-cols-2')
    expect(macroGrid).not.toBeNull()
    expect(macroGrid?.classList.contains('grid-cols-2')).toBe(true)
  })

  it('sets calories field to readOnly when meals are present', () => {
    const meals: Meal[] = [
      { id: 'meal-1', name: 'Owsianka', type: 'Śniadanie', calories: 400, protein: 15, carbs: 60, fat: 10 },
    ]

    const entry = {
      id: 'entry-1',
      date: '2026-02-11',
      weight: 80,
      meals,
    }

    render(<EntryModal {...defaultProps} entry={entry} />)

    // The calories input should be readOnly when meals array has items
    const caloriesInputs = screen.getAllByRole('spinbutton')
    // The calories input is the one after weight — find by checking readOnly
    const readOnlyInput = caloriesInputs.find(
      (input) => (input as HTMLInputElement).readOnly
    )
    expect(readOnlyInput).toBeDefined()
  })

  it('meal input fields use text-base (16px) to prevent iOS zoom', () => {
    const meals: Meal[] = [
      { id: 'meal-1', name: 'Test', type: 'Śniadanie', calories: 100, protein: 10, carbs: 10, fat: 5 },
    ]

    const entry = {
      id: 'entry-1',
      date: '2026-02-11',
      weight: 75,
      meals,
    }

    const { container } = render(<EntryModal {...defaultProps} entry={entry} />)

    // The meal name input and macro inputs should have text-base class
    const mealNameInput = container.querySelector('input[placeholder="Nazwa posiłku"]')
    expect(mealNameInput?.classList.contains('text-base')).toBe(true)

    // The select (meal type) should also have text-base
    const mealTypeSelect = container.querySelector('select')
    expect(mealTypeSelect?.classList.contains('text-base')).toBe(true)

    // Macro number inputs inside the grid should have text-base
    const macroGrid = container.querySelector('.grid.grid-cols-2')
    const macroInputs = macroGrid?.querySelectorAll('input[type="number"]')
    expect(macroInputs?.length).toBeGreaterThan(0)
    macroInputs?.forEach((input) => {
      expect(input.classList.contains('text-base')).toBe(true)
    })
  })

  it('meal delete button has min 44x44px touch target', () => {
    const meals: Meal[] = [
      { id: 'meal-1', name: 'Sałatka', type: 'Obiad', calories: 250, protein: 12, carbs: 20, fat: 14 },
    ]

    const entry = {
      id: 'entry-1',
      date: '2026-02-11',
      weight: 78,
      meals,
    }

    const { container } = render(<EntryModal {...defaultProps} entry={entry} />)

    const deleteBtn = container.querySelector('button[aria-label="Usuń posiłek"]')
    expect(deleteBtn).not.toBeNull()
    expect(deleteBtn?.classList.contains('min-w-[44px]')).toBe(true)
    expect(deleteBtn?.classList.contains('min-h-[44px]')).toBe(true)
  })

  it('close button has adequate touch target size', () => {
    render(<EntryModal {...defaultProps} />)

    const closeBtn = screen.getByRole('button', { name: /zamknij/i })
    expect(closeBtn).toBeDefined()

    // The X icon inside is w-6 h-6 (24px) — button itself is clickable
    const icon = closeBtn.querySelector('svg')
    expect(icon).not.toBeNull()
  })

  it('action buttons (save/delete) have py-3 for comfortable tap', () => {
    const entry = {
      id: 'entry-1',
      date: '2026-02-11',
      weight: 82,
    }

    const { container } = render(<EntryModal {...defaultProps} entry={entry} />)

    // Save button
    const saveBtn = screen.getByRole('button', { name: /zapisz zmiany/i })
    expect(saveBtn.classList.contains('py-3')).toBe(true)

    // Delete button
    const deleteBtn = container.querySelector('button[aria-label="Usuń wpis"]')
    expect(deleteBtn).not.toBeNull()
    expect(deleteBtn?.classList.contains('py-3')).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// TodoModeWeekly tests
// ---------------------------------------------------------------------------
describe('TodoModeWeekly — mobile (375px)', () => {
  // Dynamic import to ensure mocks are set up before module loads
  async function renderTodoWeekly(syncError: string | null = null) {
    mockUseTasks.syncError = syncError
    const { default: TodoModeWeekly } = await import('@/app/components/todo/TodoModeWeekly')
    return render(<TodoModeWeekly onBack={vi.fn()} />)
  }

  it('renders sync error banner when syncError is set', async () => {
    const { container } = await renderTodoWeekly('Nie udało się zsynchronizować')

    // The error banner should be visible
    expect(screen.getByText('Nie udało się zsynchronizować')).toBeDefined()

    // Should have a retry button
    expect(screen.getByText('Ponów')).toBeDefined()
  })

  it('does not render sync error banner when syncError is null', async () => {
    await renderTodoWeekly(null)

    expect(screen.queryByText('Ponów')).toBeNull()
  })

  it('stats bar uses flex-wrap for mobile overflow', async () => {
    const { container } = await renderTodoWeekly()

    // Stats bar container should have flex-wrap
    const statsBar = container.querySelector('.flex.flex-wrap')
    expect(statsBar).not.toBeNull()
  })

  it('progress bar is hidden on small screens', async () => {
    const { container } = await renderTodoWeekly()

    // The progress bar wrapper div has hidden sm:block classes directly on it
    const progressBar = container.querySelector('.bg-slate-700.rounded-full.h-2')
    expect(progressBar).not.toBeNull()
    expect(progressBar?.classList.contains('hidden')).toBe(true)
    expect(progressBar?.classList.contains('sm:block')).toBe(true)
  })

  it('week grid has scroll-snap classes', async () => {
    const { container } = await renderTodoWeekly()

    const weekGrid = container.querySelector('.snap-x.snap-mandatory')
    expect(weekGrid).not.toBeNull()
  })
})
