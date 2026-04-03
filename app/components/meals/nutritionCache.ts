// app/components/meals/nutritionCache.ts
import type { NutritionData } from './types';
import type { PantryUnit } from './types';

const CACHE_PREFIX = 'nutrition:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  data: NutritionData;  // Normalized: per 100g/100ml or per 1 szt
  timestamp: number;
}

function cacheKey(name: string, unit: PantryUnit): string {
  return `${CACHE_PREFIX}${name.toLowerCase().trim()}:${unit}`;
}

export function getCachedNutrition(name: string, unit: PantryUnit): NutritionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(name, unit));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(name, unit));
      return null;
    }
    // Reject cached all-zero entries (bad AI response that got cached)
    if (entry.data.calories === 0 && entry.data.protein === 0 && entry.data.carbs === 0 && entry.data.fat === 0) {
      localStorage.removeItem(cacheKey(name, unit));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedNutrition(name: string, unit: PantryUnit, normalizedData: NutritionData): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { data: normalizedData, timestamp: Date.now() };
    localStorage.setItem(cacheKey(name, unit), JSON.stringify(entry));
  } catch {
    // localStorage full — ignore
  }
}

/** Scale normalized nutrition (per 100g/ml or 1 szt) to actual amount */
export function scaleNutrition(base: NutritionData, amount: number, unit: PantryUnit): NutritionData {
  const divisor = unit === 'szt' ? 1 : 100;
  const factor = amount / divisor;
  return {
    calories: Math.round(base.calories * factor * 10) / 10,
    protein: Math.round(base.protein * factor * 10) / 10,
    carbs: Math.round(base.carbs * factor * 10) / 10,
    fat: Math.round(base.fat * factor * 10) / 10,
  };
}

export function clearNutritionCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
