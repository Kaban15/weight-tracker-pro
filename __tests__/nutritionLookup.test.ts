// __tests__/nutritionLookup.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedNutrition,
  setCachedNutrition,
  clearNutritionCache,
  scaleNutrition,
} from '../app/components/meals/nutritionCache';

beforeEach(() => {
  clearNutritionCache();
});

describe('nutritionCache', () => {
  it('returns null for uncached items', () => {
    expect(getCachedNutrition('kurczak', 'g')).toBeNull();
  });

  it('stores and retrieves normalized values (per 100g)', () => {
    setCachedNutrition('kurczak', 'g', {
      calories: 110, protein: 23, carbs: 0, fat: 1.3,
    });
    const cached = getCachedNutrition('kurczak', 'g');
    expect(cached).toEqual({ calories: 110, protein: 23, carbs: 0, fat: 1.3 });
  });

  it('scales nutrition from per-100 base', () => {
    const base = { calories: 110, protein: 23, carbs: 0, fat: 1.3 };
    const scaled = scaleNutrition(base, 500, 'g');
    expect(scaled.calories).toBeCloseTo(550);
    expect(scaled.protein).toBeCloseTo(115);
  });

  it('scales for szt unit (base = per 1 szt)', () => {
    const base = { calories: 70, protein: 6, carbs: 0.5, fat: 5 };
    const scaled = scaleNutrition(base, 4, 'szt');
    expect(scaled.calories).toBeCloseTo(280);
    expect(scaled.protein).toBeCloseTo(24);
  });

  it('ignores expired cache entries (TTL 30 days)', () => {
    const key = 'nutrition:mleko:ml';
    const entry = {
      data: { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
      timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(entry));
    expect(getCachedNutrition('mleko', 'ml')).toBeNull();
  });
});
