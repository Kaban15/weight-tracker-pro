// app/components/meals/costUtils.ts
import type { MealIngredient, PantryItem } from './types';

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
    const ingNameLower = ing.name.toLowerCase();
    // FIFO: find ALL matching pantry items, sorted by oldest first
    const matchingItems = pantryItems
      .filter(p =>
        p.unit === ing.unit &&
        (simulatedRemaining.get(p.id) || 0) > 0 &&
        (p.name.toLowerCase().includes(ingNameLower) ||
          ingNameLower.includes(p.name.toLowerCase()))
      )
      .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));

    if (matchingItems.length > 0) {
      let remaining = ing.amount;
      let ingredientCost = 0;

      for (const pantryItem of matchingItems) {
        if (remaining <= 0) break;
        const simRemaining = simulatedRemaining.get(pantryItem.id) || 0;
        const deductAmount = Math.min(remaining, simRemaining);
        const costPerUnit = pantryItem.price / pantryItem.quantity_total;
        ingredientCost += deductAmount * costPerUnit;
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
