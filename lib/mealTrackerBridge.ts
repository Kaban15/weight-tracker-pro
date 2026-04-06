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
