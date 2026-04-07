import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { MealPlan } from '@/app/components/meals/types'

// --- Test data factory ---
const createMealPlan = (overrides: Partial<MealPlan> = {}): MealPlan => ({
  id: `meal-${Math.random().toString(36).substring(7)}`,
  user_id: 'test-user-123',
  date: '2026-04-07',
  meal_slot: 'Obiad',
  name: 'Spaghetti Bolognese',
  ingredients: [
    { name: 'Makaron', amount: 200, unit: 'g', calories: 300, protein: 10, carbs: 60, fat: 2, cost: null },
    { name: 'Mięso mielone', amount: 150, unit: 'g', calories: 250, protein: 25, carbs: 0, fat: 15, cost: null },
  ],
  calories: 550,
  protein: 35,
  carbs: 60,
  fat: 17,
  recipe_steps: ['Ugotuj makaron', 'Usmaż mięso', 'Podaj'],
  estimated_cost: 12.5,
  ingredient_costs: null,
  status: 'accepted',
  rating: null,
  rating_comment: null,
  is_favorite: false,
  created_at: '2026-04-07T10:00:00.000Z',
  updated_at: '2026-04-07T10:00:00.000Z',
  ...overrides,
})

const mockMealPlans = [
  createMealPlan({ id: 'meal-1', meal_slot: 'Śniadanie', name: 'Owsianka' }),
  createMealPlan({ id: 'meal-2', meal_slot: 'Obiad', name: 'Kurczak z ryżem' }),
]

const mockPreferences = {
  id: 'pref-1',
  user_id: 'test-user-123',
  diet_type: 'standard',
  goal_type: 'maintain',
  calorie_adjustment: 0,
  tdee: 2200,
  target_calories: 2200,
  meals_per_day: 4,
  meal_names: ['Śniadanie', 'Obiad', 'Przekąska', 'Kolacja'],
  preferences_text: '',
  allergies: [],
  disliked_foods: [],
  liked_foods: [],
  cuisines: [],
  custom_tdee: null,
  onboarding_completed: true,
  has_thermomix: false,
  created_at: '2026-04-01T10:00:00.000Z',
  updated_at: '2026-04-01T10:00:00.000Z',
}

// --- Supabase mock with hoisted fns ---
const mockFrom = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@/lib/mealTrackerBridge', () => ({
  pushMealToWeightEntry: vi.fn(),
  mealPlanToTrackerMeal: vi.fn(),
}))

const mockUserId = 'test-user-123'

function setupDefaultMock() {
  const insertFn = vi.fn()
  const updateFn = vi.fn()
  const deleteFn = vi.fn()

  mockFrom.mockImplementation((table: string) => {
    if (table === 'meal_preferences') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPreferences, error: null })),
          })),
        })),
        upsert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockPreferences, error: null })),
          })),
        })),
      }
    }
    if (table === 'meal_plans') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lte: vi.fn(() => ({
                order: vi.fn(() => Promise.resolve({ data: mockMealPlans, error: null })),
              })),
            })),
            in: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
        insert: insertFn.mockReturnValue({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: createMealPlan({ id: 'meal-new', name: 'Sałatka' }),
              error: null,
            })),
          })),
        }),
        update: updateFn.mockReturnValue({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }),
        delete: deleteFn.mockReturnValue({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        }),
      }
    }
    return {
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    }
  })

  return { insertFn, updateFn, deleteFn }
}

describe('useMeals', () => {
  let insertFn: ReturnType<typeof vi.fn>
  let updateFn: ReturnType<typeof vi.fn>
  let deleteFn: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const mocks = setupDefaultMock()
    insertFn = mocks.insertFn
    updateFn = mocks.updateFn
    deleteFn = mocks.deleteFn
  })

  async function renderUseMeals(userId: string | undefined) {
    const { useMeals } = await import('@/app/components/meals/useMeals')
    return renderHook(() => useMeals(userId))
  }

  it('loads meals on mount', async () => {
    const { result } = await renderUseMeals(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.mealPlans).toHaveLength(2)
    expect(result.current.preferences).toBeTruthy()
  })

  it('handles empty meals list', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'meal_preferences') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: null, error: { message: 'not found' } })),
            })),
          })),
        }
      }
      if (table === 'meal_plans') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({ data: [], error: null })),
                })),
              })),
            })),
          })),
        }
      }
      return { select: vi.fn().mockReturnThis() }
    })

    const { result } = await renderUseMeals(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.mealPlans).toHaveLength(0)
    expect(result.current.preferences).toBeNull()
  })

  it('adds a new meal plan', async () => {
    const { result } = await renderUseMeals(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const newMeal = {
      date: '2026-04-07',
      meal_slot: 'Kolacja',
      name: 'Sałatka',
      ingredients: [],
      calories: 300,
      protein: 15,
      carbs: 20,
      fat: 10,
      recipe_steps: ['Pokrój warzywa'],
      estimated_cost: 8.0,
      ingredient_costs: null,
      status: 'accepted' as const,
      rating: null,
      rating_comment: null,
      is_favorite: false,
    }

    await act(async () => {
      await result.current.saveMealPlan(newMeal)
    })

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUserId,
        name: 'Sałatka',
        meal_slot: 'Kolacja',
      })
    )
  })

  it('updates a meal plan', async () => {
    const { result } = await renderUseMeals(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.updateMealPlan('meal-1', { status: 'eaten', rating: 5 })
    })

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'eaten',
        rating: 5,
      })
    )
  })

  it('deletes a meal plan', async () => {
    const { result } = await renderUseMeals(mockUserId)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.deleteMealPlan('meal-1')
    })

    expect(deleteFn).toHaveBeenCalled()
    // Optimistic removal
    expect(result.current.mealPlans.find(m => m.id === 'meal-1')).toBeUndefined()
  })
})
