// app/components/meals/useMeals.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { MealPreferences, MealPlan, MealIngredient, DaySummary, AIGeneratedMeal, formatDate } from './types';
import { pushMealToWeightEntry, mealPlanToTrackerMeal } from '@/lib/mealTrackerBridge';

export function useMeals(userId: string | undefined) {
  const [preferences, setPreferences] = useState<MealPreferences | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load preferences ──
  const loadPreferences = useCallback(async () => {
    if (!userId || !supabase) return;
    const { data, error } = await supabase
      .from('meal_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      setPreferences(data as MealPreferences);
    }
  }, [userId]);

  // ── Save preferences ──
  const savePreferences = useCallback(async (prefs: Partial<MealPreferences>) => {
    if (!userId || !supabase) return;
    const payload = { ...prefs, user_id: userId, updated_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from('meal_preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (!error && data) {
      setPreferences(data as MealPreferences);
    }
    return { data, error };
  }, [userId]);

  // ── Load meal plans for date range ──
  const loadMealPlans = useCallback(async (startDate?: string, endDate?: string) => {
    if (!userId || !supabase) return;
    const start = startDate || formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const end = endDate || formatDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    const { data, error } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('user_id', userId)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: true });

    if (!error && data) {
      setMealPlans(data as MealPlan[]);
    }
  }, [userId]);

  // ── Save a meal plan (from AI suggestion) ──
  const saveMealPlan = useCallback(async (meal: Omit<MealPlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    if (!userId || !supabase) return null;

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({ ...meal, user_id: userId })
      .select()
      .single();

    if (!error && data) {
      setMealPlans(prev => [...prev, data as MealPlan].sort((a, b) => a.date.localeCompare(b.date)));
    }
    return { data, error };
  }, [userId]);

  // ── Clear uneaten meals for a date (before generating new ones) ──
  const clearPendingForDate = useCallback(async (date: string) => {
    if (!userId || !supabase) return;

    // Remove planned + accepted (not eaten, not rejected) from state
    setMealPlans(prev => prev.filter(m =>
      !(m.date === date && (m.status === 'planned' || m.status === 'accepted'))
    ));

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('user_id', userId)
      .eq('date', date)
      .in('status', ['planned', 'accepted']);

    if (error) {
      await loadMealPlans();
    }
  }, [userId, loadMealPlans]);

  // ── Accept AI-generated meals into meal_plans ──
  const acceptMeals = useCallback(async (date: string, meals: AIGeneratedMeal[]) => {
    if (!userId || !supabase) return;

    // Auto-cancel existing planned meals for this date
    await clearPendingForDate(date);

    const inserts = meals.map(m => ({
      user_id: userId,
      date,
      meal_slot: m.meal_slot,
      name: m.name,
      ingredients: m.ingredients,
      calories: m.calories,
      protein: m.protein,
      carbs: m.carbs,
      fat: m.fat,
      recipe_steps: m.recipe_steps,
      estimated_cost: null,
      ingredient_costs: null,
      status: 'accepted' as const,
      is_favorite: false,
    }));

    const { data, error } = await supabase
      .from('meal_plans')
      .insert(inserts)
      .select();

    if (!error && data) {
      setMealPlans(prev => [...prev, ...(data as MealPlan[])].sort((a, b) => a.date.localeCompare(b.date)));
    }
    return { data, error };
  }, [userId, clearPendingForDate]);

  // ── Update meal status / rating ──
  const updateMealPlan = useCallback(async (id: string, updates: Partial<MealPlan>) => {
    if (!supabase) return;

    // Optimistic update
    setMealPlans(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

    const { error } = await supabase
      .from('meal_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      // Revert on error
      await loadMealPlans();
    }
  }, [loadMealPlans]);

  // ── Delete a meal plan ──
  const deleteMealPlan = useCallback(async (id: string) => {
    if (!supabase) return;

    setMealPlans(prev => prev.filter(m => m.id !== id));

    const { error } = await supabase
      .from('meal_plans')
      .delete()
      .eq('id', id);

    if (error) {
      await loadMealPlans();
    }
  }, [loadMealPlans]);

  // ── Toggle favorite status ──
  const toggleFavorite = useCallback(async (id: string) => {
    if (!supabase) return;
    const meal = mealPlans.find(m => m.id === id);
    if (!meal) return;

    const newFav = !meal.is_favorite;
    setMealPlans(prev => prev.map(m => m.id === id ? { ...m, is_favorite: newFav } : m));

    const { error } = await supabase
      .from('meal_plans')
      .update({ is_favorite: newFav, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) await loadMealPlans();
  }, [mealPlans, loadMealPlans]);

  // ── Re-eat a favorite meal on a given date ──
  const reeatFavorite = useCallback(async (mealId: string, date: string) => {
    if (!userId || !supabase) return;
    const meal = mealPlans.find(m => m.id === mealId);
    if (!meal) return;

    const { data, error } = await supabase
      .from('meal_plans')
      .insert({
        user_id: userId,
        date,
        meal_slot: meal.meal_slot,
        name: meal.name,
        ingredients: meal.ingredients,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        recipe_steps: meal.recipe_steps,
        estimated_cost: meal.estimated_cost,
        status: 'accepted',
        is_favorite: true,
      })
      .select()
      .single();

    if (!error && data) {
      setMealPlans(prev => [...prev, data as MealPlan].sort((a, b) => a.date.localeCompare(b.date)));
    }
    return { data, error };
  }, [userId, mealPlans, loadMealPlans]);

  // ── Get unique favorite meals ──
  const getFavorites = useCallback((): MealPlan[] => {
    const seen = new Set<string>();
    return mealPlans
      .filter(m => m.is_favorite)
      .filter(m => {
        if (seen.has(m.name)) return false;
        seen.add(m.name);
        return true;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));
  }, [mealPlans]);

  // ── Get day summary ──
  const getDaySummary = useCallback((date: string): DaySummary => {
    const dayMeals = mealPlans.filter(m => m.date === date);
    const rated = dayMeals.filter(m => m.rating !== null);
    const targetCalories = preferences?.target_calories || 2000;

    return {
      date,
      meals: dayMeals,
      totalCalories: dayMeals.reduce((s, m) => s + m.calories, 0),
      totalProtein: dayMeals.reduce((s, m) => s + m.protein, 0),
      totalCarbs: dayMeals.reduce((s, m) => s + m.carbs, 0),
      totalFat: dayMeals.reduce((s, m) => s + m.fat, 0),
      totalCost: dayMeals.reduce((s, m) => s + (m.estimated_cost || 0), 0),
      avgRating: rated.length > 0
        ? Math.round((rated.reduce((s, m) => s + (m.rating || 0), 0) / rated.length) * 10) / 10
        : null,
      calorieGoalPercent: Math.round((dayMeals.reduce((s, m) => s + m.calories, 0) / targetCalories) * 100),
    };
  }, [mealPlans, preferences?.target_calories]);

  // ── Update ingredients (inline edit of amounts, auto-recalc macros) ──
  const updateIngredients = useCallback(async (id: string, newIngredients: MealIngredient[]) => {
    if (!supabase) return;

    const totalCalories = newIngredients.reduce((s, i) => s + i.calories, 0);
    const totalProtein = newIngredients.reduce((s, i) => s + i.protein, 0);
    const totalCarbs = newIngredients.reduce((s, i) => s + i.carbs, 0);
    const totalFat = newIngredients.reduce((s, i) => s + i.fat, 0);

    const updates: Partial<MealPlan> = {
      ingredients: newIngredients,
      calories: totalCalories,
      protein: totalProtein,
      carbs: totalCarbs,
      fat: totalFat,
    };

    setMealPlans(prev => prev.map(m => m.id === id ? { ...m, ...updates } : m));

    const { error } = await supabase
      .from('meal_plans')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) await loadMealPlans();
  }, [loadMealPlans]);

  // ── Sync eaten meal to tracker entries ──
  const syncToTracker = useCallback(async (meal: MealPlan) => {
    if (!userId || !supabase) return;

    const result = await pushMealToWeightEntry(userId, meal.date, meal);

    // If no entry exists, create one with placeholder weight (existing behavior)
    if (!result.success && result.error === 'no_entry') {
      const trackerMeal = mealPlanToTrackerMeal(meal);
      await supabase
        .from('entries')
        .insert({
          user_id: userId,
          date: meal.date,
          weight: 0,
          calories: Math.round(meal.calories),
          meals: [trackerMeal],
        });
    }
  }, [userId]);

  // ── Initial load ──
  useEffect(() => {
    async function init() {
      setIsLoading(true);
      await Promise.all([loadPreferences(), loadMealPlans()]);
      setIsLoading(false);
    }
    if (userId) init();
  }, [userId, loadPreferences, loadMealPlans]);

  /** Fetch cost totals for week, month, and year */
  const getPeriodCosts = useCallback(async (): Promise<{ week: number; month: number; year: number }> => {
    if (!userId || !supabase) return { week: 0, month: 0, year: 0 };

    const now = new Date();
    // Week: Monday to Sunday
    const dayOfWeek = now.getDay() || 7; // Sunday = 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const weekStart = formatDate(monday);

    // Month: 1st of current month
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Year: Jan 1
    const yearStart = `${now.getFullYear()}-01-01`;

    const today = formatDate(now);

    const [weekRes, monthRes, yearRes] = await Promise.all([
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', weekStart).lte('date', today),
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', monthStart).lte('date', today),
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', yearStart).lte('date', today),
    ]);

    const sum = (data: any[] | null) =>
      (data || []).reduce((s: number, r: { estimated_cost: number | null }) => s + (r.estimated_cost || 0), 0);

    return {
      week: Math.round(sum(weekRes.data) * 100) / 100,
      month: Math.round(sum(monthRes.data) * 100) / 100,
      year: Math.round(sum(yearRes.data) * 100) / 100,
    };
  }, [userId]);

  return {
    preferences,
    mealPlans,
    isLoading,
    savePreferences,
    saveMealPlan,
    acceptMeals,
    updateMealPlan,
    deleteMealPlan,
    getDaySummary,
    loadMealPlans,
    toggleFavorite,
    reeatFavorite,
    getFavorites,
    clearPendingForDate,
    updateIngredients,
    syncToTracker,
    getPeriodCosts,
  };
}
