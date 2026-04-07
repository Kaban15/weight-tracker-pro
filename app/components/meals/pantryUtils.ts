import type { MealIngredient, PantryItem } from './types';

/** Get start/end date strings for a month in "YYYY-MM" format */
export function getMonthDateRange(month: string): { startDate: string; endDate: string } {
  const startDate = `${month}-01`;
  const [year, m] = month.split('-').map(Number);
  const endDate = m === 12
    ? `${year + 1}-01-01`
    : `${year}-${String(m + 1).padStart(2, '0')}-01`;
  return { startDate, endDate };
}

/** Calculate cost per unit for a pantry item */
export function costPerUnit(item: PantryItem): number {
  return item.quantity_total > 0 ? item.price / item.quantity_total : 0;
}

/**
 * Find all pantry items matching an ingredient (fuzzy name, same unit, has remaining quantity).
 * Sorted by purchased_at ASC (FIFO — oldest first).
 */
export function findMatchingPantryItems(
  ing: MealIngredient,
  pantryItems: PantryItem[],
  getRemainingQty?: (id: string) => number,
): PantryItem[] {
  const ingNameLower = ing.name.toLowerCase();
  return pantryItems
    .filter(p => {
      const remaining = getRemainingQty ? getRemainingQty(p.id) : p.quantity_remaining;
      return (
        p.unit === ing.unit &&
        remaining > 0 &&
        !p.is_free &&
        (p.name.toLowerCase().includes(ingNameLower) ||
          ingNameLower.includes(p.name.toLowerCase()))
      );
    })
    .sort((a, b) => a.purchased_at.localeCompare(b.purchased_at));
}
