// app/components/meals/useMealTrackerSync.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { pushMealToWeightEntry, getMealsInTracker, updateMealInWeightEntry } from '@/lib/mealTrackerBridge';
import type { MealPlan } from './types';
import { formatDate } from './types';

interface UseMealTrackerSyncParams {
  userId: string | undefined;
  mealPlansLength: number;
}

interface TrackerSyncResult {
  success: boolean;
  error?: string;
}

export function useMealTrackerSync({ userId, mealPlansLength }: UseMealTrackerSyncParams) {
  const [trackerMealKeys, setTrackerMealKeys] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const refreshTrackerStatus = useCallback(async (date: string) => {
    if (!userId) return;
    const keys = await getMealsInTracker(userId, date);
    setTrackerMealKeys(keys);
  }, [userId]);

  // Fetch tracker status for current date
  const currentDate = formatDate(new Date());
  useEffect(() => {
    refreshTrackerStatus(currentDate);
  }, [currentDate, mealPlansLength, refreshTrackerStatus]);

  // Auto-sync helper: update tracker entry if meal is already there
  const autoSyncToTracker = useCallback(async (meal: MealPlan) => {
    if (!userId) return;
    const key = `${meal.name}::${meal.meal_slot}`;
    if (!trackerMealKeys.has(key)) return;
    const result = await updateMealInWeightEntry(userId, meal.date, meal);
    if (result.success) {
      setToast({ message: 'Zaktualizowano makra we wpisie wagi', type: 'success' });
    }
  }, [userId, trackerMealKeys]);

  const handleSendToTracker = useCallback(async (meal: MealPlan): Promise<TrackerSyncResult> => {
    if (!userId) return { success: false, error: 'no_user' };
    try {
      const key = `${meal.name}::${meal.meal_slot}`;
      const isUpdate = trackerMealKeys.has(key);

      const result = isUpdate
        ? await updateMealInWeightEntry(userId, meal.date, meal)
        : await pushMealToWeightEntry(userId, meal.date, meal);

      if (result.success) {
        setToast({ message: isUpdate ? 'Zaktualizowano we wpisie wagi' : 'Wysłano do wpisu wagi', type: 'success' });
        await refreshTrackerStatus(meal.date);
      } else if (result.error === 'no_entry') {
        setToast({ message: 'Najpierw dodaj wpis wagi na ten dzień', type: 'error' });
      } else if (result.error === 'duplicate') {
        setToast({ message: 'Ten posiłek już jest we wpisie wagi', type: 'error' });
      } else if (result.error === 'not_found') {
        const pushResult = await pushMealToWeightEntry(userId, meal.date, meal);
        if (pushResult.success) {
          setToast({ message: 'Wysłano do wpisu wagi', type: 'success' });
          await refreshTrackerStatus(meal.date);
        } else if (pushResult.error === 'no_entry') {
          setToast({ message: 'Najpierw dodaj wpis wagi na ten dzień', type: 'error' });
        } else {
          setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
        }
        return pushResult;
      } else {
        setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      }
      return result;
    } catch {
      setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      return { success: false, error: 'supabase_error' };
    }
  }, [userId, trackerMealKeys, refreshTrackerStatus]);

  return {
    trackerMealKeys,
    toast,
    clearToast: useCallback(() => setToast(null), []),
    autoSyncToTracker,
    handleSendToTracker,
    refreshTrackerStatus,
  };
}
