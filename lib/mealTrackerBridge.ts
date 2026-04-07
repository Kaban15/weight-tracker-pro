// lib/mealTrackerBridge.ts
import { supabase } from '@/lib/supabase';
import type { MealPlan } from '@/app/components/meals/types';
import type { Meal, MealType } from '@/app/components/tracker/types';

const MEAL_TYPE_MAP: Record<string, MealType> = {
  'Śniadanie': 'Śniadanie',
  'II Śniadanie': 'II Śniadanie',
  'Obiad': 'Obiad',
  'Kolacja': 'Kolacja',
  'Przekąska': 'Przekąska',
};

export function mealPlanToTrackerMeal(meal: MealPlan): Meal {
  return {
    id: crypto.randomUUID(),
    name: meal.name,
    type: MEAL_TYPE_MAP[meal.meal_slot] || 'Przekąska',
    calories: Math.round(meal.calories),
    protein: Math.round(meal.protein),
    carbs: Math.round(meal.carbs),
    fat: Math.round(meal.fat),
  };
}

export async function pushMealToWeightEntry(
  userId: string,
  date: string,
  meal: MealPlan
): Promise<{ success: boolean; error?: 'no_entry' | 'duplicate' | 'supabase_error' }> {
  if (!supabase) return { success: false, error: 'supabase_error' };

  const { data: existing, error: fetchError } = await supabase
    .from('entries')
    .select('id, meals')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'no_entry' };
  }

  const currentMeals = (existing.meals as Meal[]) || [];
  if (currentMeals.some(m => m.name === meal.name)) {
    return { success: false, error: 'duplicate' };
  }

  const trackerMeal = mealPlanToTrackerMeal(meal);
  const updatedMeals = [...currentMeals, trackerMeal];
  const totalCalories = updatedMeals.reduce((s, m) => s + (m.calories || 0), 0);

  const { error: updateError } = await supabase
    .from('entries')
    .update({
      meals: updatedMeals,
      calories: totalCalories,
    })
    .eq('id', existing.id);

  if (updateError) return { success: false, error: 'supabase_error' };
  return { success: true };
}

/**
 * Get a Set of "name::type" keys for meals already pushed to a weight entry.
 */
export async function getMealsInTracker(
  userId: string,
  date: string,
): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('entries')
    .select('meals')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error || !data || !data.meals) return new Set();
  const meals = data.meals as Meal[];
  return new Set(meals.map(m => `${m.name}::${m.type}`));
}

/**
 * Update an existing meal's macros in a weight entry (delta-based calorie update).
 * Matches by name + meal_slot (type).
 */
export async function updateMealInWeightEntry(
  userId: string,
  date: string,
  meal: MealPlan,
): Promise<{ success: boolean; error?: 'no_entry' | 'not_found' | 'supabase_error' }> {
  if (!supabase) return { success: false, error: 'supabase_error' };

  const { data: existing, error: fetchError } = await supabase
    .from('entries')
    .select('id, meals, calories')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (fetchError || !existing) return { success: false, error: 'no_entry' };

  const currentMeals = (existing.meals as Meal[]) || [];
  const mealType = MEAL_TYPE_MAP[meal.meal_slot] || 'Przekąska';
  const idx = currentMeals.findIndex(m => m.name === meal.name && m.type === mealType);

  if (idx === -1) return { success: false, error: 'not_found' };

  const oldCalories = currentMeals[idx].calories || 0;
  const newMeal = mealPlanToTrackerMeal(meal);
  // Preserve the original id
  newMeal.id = currentMeals[idx].id;

  const updatedMeals = [...currentMeals];
  updatedMeals[idx] = newMeal;

  const delta = Math.round(meal.calories) - oldCalories;
  const newTotalCalories = (existing.calories || 0) + delta;

  const { error: updateError } = await supabase
    .from('entries')
    .update({
      meals: updatedMeals,
      calories: newTotalCalories,
    })
    .eq('id', existing.id);

  if (updateError) return { success: false, error: 'supabase_error' };
  return { success: true };
}

export async function fetchMealPlansForDate(
  userId: string,
  date: string
): Promise<MealPlan[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .in('status', ['accepted', 'eaten']);

  if (error || !data) return [];
  return data as MealPlan[];
}
