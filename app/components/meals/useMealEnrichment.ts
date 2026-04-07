// app/components/meals/useMealEnrichment.ts
"use client";

import { useEffect, useRef, useCallback } from 'react';
import { getMealsInTracker, updateMealInWeightEntry } from '@/lib/mealTrackerBridge';
import { ZERO_CALORIE_INGREDIENTS } from './constants';
import type { MealPlan, MealIngredient, PantryUnit } from './types';

interface UseMealEnrichmentParams {
  userId: string | undefined;
  mealPlans: MealPlan[];
  isLoading: boolean;
  lookupNutrition: (name: string, amount: number, unit: PantryUnit) => Promise<{ calories: number; protein: number; carbs: number; fat: number } | null>;
  updateMealPlan: (id: string, updates: Partial<MealPlan>) => Promise<void>;
}

export function useMealEnrichment({
  userId,
  mealPlans,
  isLoading,
  lookupNutrition,
  updateMealPlan,
}: UseMealEnrichmentParams) {
  /** Look up nutrition for each ingredient with 0 macros (sequential with retry) */
  const enrichIngredientsWithNutrition = useCallback(async (ingredients: MealIngredient[]): Promise<MealIngredient[]> => {
    const results: MealIngredient[] = [];
    for (const ing of ingredients) {
      const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z => ing.name.toLowerCase().includes(z));
      if (isZeroCal || ing.calories > 0 || !ing.name.trim() || ing.amount <= 0) {
        results.push(ing);
        continue;
      }

      // Retry up to 2 times with delay between requests
      let nutrition = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (attempt > 0) await new Promise(r => setTimeout(r, 1000));
        nutrition = await lookupNutrition(ing.name, ing.amount, ing.unit);
        if (nutrition && nutrition.calories > 0) break;
        nutrition = null; // treat all-zero response as failure
      }

      results.push(nutrition ? { ...ing, ...nutrition } : ing);
      // Small delay between ingredients to avoid Gemini API rate limits
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  }, [lookupNutrition]);

  // One-time auto-repair: re-enrich meals that have 0 kcal on ingredients
  const repairRan = useRef(false);
  useEffect(() => {
    if (isLoading || repairRan.current || mealPlans.length === 0) return;
    repairRan.current = true;

    const mealsToRepair = mealPlans.filter(m => {
      const ings = m.ingredients as MealIngredient[];
      if (!ings?.length) return false;
      return ings.some(ing => {
        const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z => ing.name.toLowerCase().includes(z));
        return !isZeroCal && ing.name.trim() && ing.amount > 0 && ing.calories === 0;
      });
    });

    if (mealsToRepair.length === 0) return;

    (async () => {
      for (const meal of mealsToRepair) {
        const enriched = await enrichIngredientsWithNutrition(meal.ingredients as MealIngredient[]);
        const totalCal = enriched.reduce((s, i) => s + i.calories, 0);
        if (totalCal > 0) {
          await updateMealPlan(meal.id, {
            ingredients: enriched,
            calories: totalCal,
            protein: enriched.reduce((s, i) => s + i.protein, 0),
            carbs: enriched.reduce((s, i) => s + i.carbs, 0),
            fat: enriched.reduce((s, i) => s + i.fat, 0),
          });
          // Auto-sync to tracker if already pushed (direct call to avoid stale closure)
          if (userId) {
            const repairedMeal = { ...meal, ingredients: enriched, calories: totalCal, protein: enriched.reduce((s, i) => s + i.protein, 0), carbs: enriched.reduce((s, i) => s + i.carbs, 0), fat: enriched.reduce((s, i) => s + i.fat, 0) };
            const liveKeys = await getMealsInTracker(userId, repairedMeal.date);
            if (liveKeys.has(`${repairedMeal.name}::${repairedMeal.meal_slot}`)) {
              await updateMealInWeightEntry(userId, repairedMeal.date, repairedMeal);
            }
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, mealPlans.length]);

  return { enrichIngredientsWithNutrition };
}
