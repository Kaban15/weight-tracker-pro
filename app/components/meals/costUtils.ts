// app/components/meals/costUtils.ts
import type { MealIngredient, PantryItem } from './types';
import { findMatchingPantryItems, costPerUnit } from './pantryUtils';

export function estimateCostFromPantry(
  ingredients: MealIngredient[],
  pantryItems: PantryItem[],
): { costs: Map<string, number | null>; totalCost: number } {
  let totalCost = 0;
  const costs = new Map<string, number | null>();

  // Track simulated remaining for estimate (don't mutate actual items)
  const simulatedRemaining = new Map<string, number>();
  for (const p of pantryItems) {
    simulatedRemaining.set(p.id, p.quantity_remaining);
  }

  for (const ing of ingredients) {
    if (ing.fromPantry === false) {
      costs.set(ing.name, null);
      continue;
    }
    const matchingItems = findMatchingPantryItems(
      ing, pantryItems,
      (id) => simulatedRemaining.get(id) || 0,
    );

    if (matchingItems.length > 0) {
      let remaining = ing.amount;
      let ingredientCost = 0;

      for (const pantryItem of matchingItems) {
        if (remaining <= 0) break;
        const simRemaining = simulatedRemaining.get(pantryItem.id) || 0;
        const deductAmount = Math.min(remaining, simRemaining);
        ingredientCost += deductAmount * costPerUnit(pantryItem);
        remaining -= deductAmount;
        simulatedRemaining.set(pantryItem.id, simRemaining - deductAmount);
      }

      ingredientCost = Math.round(ingredientCost * 100) / 100;
      totalCost += ingredientCost;
      costs.set(ing.name, ingredientCost);
    } else {
      costs.set(ing.name, null);
    }
  }

  return { costs, totalCost: Math.round(totalCost * 100) / 100 };
}
