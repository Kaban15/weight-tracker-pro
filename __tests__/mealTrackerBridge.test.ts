import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  },
}));

import { getMealsInTracker, updateMealInWeightEntry } from '@/lib/mealTrackerBridge';

describe('getMealsInTracker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns set of name+slot keys from entries.meals', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: '1',
        meals: [
          { name: 'Jajecznica', type: 'Śniadanie', calories: 300, protein: 20, carbs: 5, fat: 22 },
          { name: 'Kurczak', type: 'Obiad', calories: 500, protein: 40, carbs: 30, fat: 15 },
        ],
        calories: 800,
      },
      error: null,
    });

    const result = await getMealsInTracker('user1', '2026-04-07');
    expect(result).toEqual(new Set(['Jajecznica::Śniadanie', 'Kurczak::Obiad']));
  });

  it('returns empty set when no entry exists', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const result = await getMealsInTracker('user1', '2026-04-07');
    expect(result).toEqual(new Set());
  });
});

describe('updateMealInWeightEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates meal macros using delta-based calorie adjustment', async () => {
    const existingMeals = [
      { id: 'a', name: 'Kurczak', type: 'Obiad', calories: 300, protein: 30, carbs: 10, fat: 15 },
    ];
    mockSingle.mockResolvedValue({
      data: { id: 'entry1', meals: existingMeals, calories: 500 },
      error: null,
    });
    mockEq.mockReturnValue({ error: null });

    const meal = {
      name: 'Kurczak',
      meal_slot: 'Obiad',
      calories: 450, protein: 45, carbs: 20, fat: 25,
    } as any;

    const result = await updateMealInWeightEntry('user1', '2026-04-07', meal);
    expect(result.success).toBe(true);

    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.calories).toBe(650);
    expect(updateCall.meals[0].calories).toBe(450);
    expect(updateCall.meals[0].protein).toBe(45);
  });

  it('returns not_found when meal not in tracker', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'entry1', meals: [], calories: 0 },
      error: null,
    });

    const meal = { name: 'Pizza', meal_slot: 'Obiad', calories: 800 } as any;
    const result = await updateMealInWeightEntry('user1', '2026-04-07', meal);
    expect(result).toEqual({ success: false, error: 'not_found' });
  });
});
