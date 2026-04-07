import { describe, it, expect } from 'vitest';
import { estimateCostFromPantry } from '../app/components/meals/costUtils';
import type { MealIngredient, PantryItem } from '../app/components/meals/types';

const makePantryItem = (overrides: Partial<PantryItem>): PantryItem => ({
  id: '1', user_id: 'u1', name: 'kurczak', quantity_total: 1000,
  quantity_remaining: 800, unit: 'g', price: 30, purchased_at: '2026-04-01',
  created_at: '2026-04-01', updated_at: '2026-04-01', is_free: false,
  ...overrides,
});

const makeIngredient = (overrides: Partial<MealIngredient>): MealIngredient => ({
  name: 'kurczak', amount: 500, unit: 'g',
  calories: 550, protein: 103, carbs: 0, fat: 12, cost: null,
  ...overrides,
});

describe('estimateCostFromPantry', () => {
  it('calculates cost for matching pantry item', () => {
    const items = [makePantryItem({})];
    const ingredients = [makeIngredient({})];
    const result = estimateCostFromPantry(ingredients, items);
    // 30 zł / 1000g * 500g = 15.00
    expect(result.totalCost).toBe(15);
    expect(result.costs.get('kurczak')).toBe(15);
  });

  it('returns null cost for missing pantry item', () => {
    const result = estimateCostFromPantry(
      [makeIngredient({ name: 'ryż' })],
      [makePantryItem({})]
    );
    expect(result.totalCost).toBe(0);
    expect(result.costs.get('ryż')).toBeNull();
  });

  it('ignores pantry items with 0 remaining', () => {
    const items = [makePantryItem({ quantity_remaining: 0 })];
    const result = estimateCostFromPantry([makeIngredient({})], items);
    expect(result.costs.get('kurczak')).toBeNull();
  });

  it('requires matching unit', () => {
    const items = [makePantryItem({ unit: 'ml' })];
    const result = estimateCostFromPantry([makeIngredient({ unit: 'g' })], items);
    expect(result.costs.get('kurczak')).toBeNull();
  });

  it('skips ingredients with fromPantry === false', () => {
    const ingredients: MealIngredient[] = [
      { name: 'Mąka', amount: 200, unit: 'g', calories: 100, protein: 5, carbs: 40, fat: 1, cost: null, fromPantry: true },
      { name: 'Masło', amount: 50, unit: 'g', calories: 350, protein: 0, carbs: 0, fat: 40, cost: null, fromPantry: false },
    ];
    const pantryItems: PantryItem[] = [
      { id: '1', user_id: 'u', name: 'Mąka pszenna', quantity_total: 1000, quantity_remaining: 800, unit: 'g', price: 5, purchased_at: '', created_at: '', updated_at: '', is_free: false },
      { id: '2', user_id: 'u', name: 'Masło', quantity_total: 200, quantity_remaining: 200, unit: 'g', price: 8, purchased_at: '', created_at: '', updated_at: '', is_free: false },
    ];

    const { costs, totalCost } = estimateCostFromPantry(ingredients, pantryItems);

    expect(costs.get('Mąka')).toBe(1);
    expect(costs.get('Masło')).toBeNull();
    expect(totalCost).toBe(1);
  });

  it('handles multiple ingredients', () => {
    const items = [
      makePantryItem({ name: 'kurczak', price: 30, quantity_total: 1000 }),
      makePantryItem({ id: '2', name: 'ryż', price: 5, quantity_total: 1000, unit: 'g' }),
    ];
    const ingredients = [
      makeIngredient({ name: 'pierś z kurczaka', amount: 500 }),
      makeIngredient({ name: 'ryż', amount: 100 }),
    ];
    const result = estimateCostFromPantry(ingredients, items);
    // kurczak: 30/1000*500=15, ryż: 5/1000*100=0.50
    expect(result.totalCost).toBe(15.5);
  });
});
