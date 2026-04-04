// app/components/meals/costUtils.ts
import type { MealIngredient, PantryItem } from './types';

export function estimateCostFromPantry(
  ingredients: MealIngredient[],
  pantryItems: PantryItem[],
): { costs: Map<string, number | null>; totalCost: number } {
  let totalCost = 0;
  const costs = new Map<string, number | null>();

  for (const ing of ingredients) {
    if (ing.fromPantry === false) {
      costs.set(ing.name, null);
      continue;
    }
    const ingNameLower = ing.name.toLowerCase();
    const pantryItem = pantryItems.find(p =>
      p.unit === ing.unit &&
      p.quantity_remaining > 0 &&
      (p.name.toLowerCase().includes(ingNameLower) ||
        ingNameLower.includes(p.name.toLowerCase()))
    );

    if (pantryItem) {
      const costPerUnit = pantryItem.price / pantryItem.quantity_total;
      const ingredientCost = Math.round(ing.amount * costPerUnit * 100) / 100;
      totalCost += ingredientCost;
      costs.set(ing.name, ingredientCost);
    } else {
      costs.set(ing.name, null);
    }
  }

  return { costs, totalCost: Math.round(totalCost * 100) / 100 };
}
