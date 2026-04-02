// app/components/meals/useNutritionLookup.ts
"use client";

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import type { NutritionData, PantryUnit } from './types';
import { getCachedNutrition, setCachedNutrition, scaleNutrition } from './nutritionCache';

const DEBOUNCE_MS = 800;

export function useNutritionLookup() {
  const { session } = useAuth();
  const [loadingIngredients, setLoadingIngredients] = useState<Set<number>>(new Set());
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const lookupNutrition = useCallback(async (
    name: string,
    amount: number,
    unit: PantryUnit,
  ): Promise<NutritionData | null> => {
    if (!name.trim() || amount <= 0) return null;

    // Check cache first
    const cached = getCachedNutrition(name, unit);
    if (cached) {
      return scaleNutrition(cached, amount, unit);
    }

    if (!session?.access_token) return null;

    try {
      const res = await fetch('/api/meals/nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, amount, unit }),
      });

      if (!res.ok) return null;

      const { data } = await res.json();
      if (!data) return null;

      // Normalize and cache: store per 100g/100ml or per 1 szt
      const divisor = unit === 'szt' ? amount : amount / 100;
      const normalized: NutritionData = {
        calories: Math.round((data.calories / divisor) * 10) / 10,
        protein: Math.round((data.protein / divisor) * 10) / 10,
        carbs: Math.round((data.carbs / divisor) * 10) / 10,
        fat: Math.round((data.fat / divisor) * 10) / 10,
      };
      setCachedNutrition(name, unit, normalized);

      return data as NutritionData;
    } catch {
      return null;
    }
  }, [session?.access_token]);

  /** Debounced lookup for ingredient at given index */
  const debouncedLookup = useCallback((
    index: number,
    name: string,
    amount: number,
    unit: PantryUnit,
    onResult: (index: number, data: NutritionData) => void,
  ) => {
    // Clear existing timer for this index
    const existing = debounceTimers.current.get(index);
    if (existing) clearTimeout(existing);

    // Check cache synchronously — no debounce needed
    const cached = getCachedNutrition(name, unit);
    if (cached) {
      onResult(index, scaleNutrition(cached, amount, unit));
      return;
    }

    // Debounce the API call
    const timer = setTimeout(async () => {
      setLoadingIngredients(prev => new Set(prev).add(index));
      const result = await lookupNutrition(name, amount, unit);
      setLoadingIngredients(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      if (result) onResult(index, result);
    }, DEBOUNCE_MS);

    debounceTimers.current.set(index, timer);
  }, [lookupNutrition]);

  /** Quick recalc from cache when only amount changes */
  const recalcFromCache = useCallback((
    name: string,
    amount: number,
    unit: PantryUnit,
  ): NutritionData | null => {
    const cached = getCachedNutrition(name, unit);
    if (!cached) return null;
    return scaleNutrition(cached, amount, unit);
  }, []);

  return {
    debouncedLookup,
    recalcFromCache,
    lookupNutrition,
    loadingIngredients,
  };
}
