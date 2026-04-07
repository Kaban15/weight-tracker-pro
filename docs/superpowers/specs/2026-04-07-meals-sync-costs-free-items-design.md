# Meals: Auto-sync makr, rozwijane koszty, darmowe produkty

**Date:** 2026-04-07
**Status:** Approved

## Overview

Three related improvements to the meals module:
1. Auto-sync meal macros to weight tracker when they change after initial push
2. Expandable cost summary showing weekly/monthly/yearly totals
3. "Free item" flag on pantry items that auto-propagates `fromPantry: false` to ingredients

---

## 1. Auto-sync Meal Macros to Weight Tracker

### Problem

When a meal is pushed to the weight tracker via "Do wagi", its macros are stored as a snapshot in `entries.meals` JSONB. If macros later change (auto-enrichment fixing 0-calorie ingredients, or manual edit), the weight entry becomes stale.

### Solution

**A) Auto-sync:** After any macro update (auto-enrichment or ingredient edit), check if the meal was already pushed to the tracker. If so, automatically update the weight entry.

**B) Manual fallback:** When a meal is already in the tracker, change the "Do wagi" button to "Odswież w wadze" (RefreshCw icon) so the user can manually trigger a resync.

### New Functions in `mealTrackerBridge.ts`

```typescript
// Check if a meal is already in a weight entry
isMealInTracker(userId: string, date: string, mealName: string): Promise<boolean>

// Update existing meal macros in weight entry
updateMealInWeightEntry(userId: string, date: string, meal: MealPlan): Promise<{ success: boolean; error?: string }>
```

`updateMealInWeightEntry` finds the meal by name in `entries.meals`, replaces its macros, and recalculates `entries.calories`.

### Detection of "already in tracker"

`MealCard` needs to know if a meal is already pushed. Approach:
- `MealsMode` fetches tracker status for all meals on the selected date (single query to `entries` table)
- Passes `isInTracker` boolean to each `MealCard` via props
- Cached per date — refreshed when date changes or after push/update

### Auto-sync Trigger Points

1. After `enrichIngredientsWithNutrition()` completes in `MealsMode.tsx`
2. After `updateIngredients()` in `useMeals.ts` (ingredient edit + save)

### Files Changed

- `lib/mealTrackerBridge.ts` — add `updateMealInWeightEntry()`, `isMealInTracker()`
- `app/components/meals/MealCard.tsx` — toggle button text/icon based on `isInTracker` prop
- `app/components/meals/MealsMode.tsx` — fetch tracker status, auto-sync after enrichment/edit

---

## 2. Expandable Cost Summary

### Problem

Only daily cost is shown. User wants weekly, monthly, and yearly totals visible.

### Solution

Make the daily cost amount (`9.62 zl`) clickable. On click, expand a panel below the summary bar showing:

- **Ten tydzien:** sum from Monday to Sunday of current week
- **Ten miesiac:** sum from 1st of current month
- **Ten rok:** sum from January 1st

### Data Fetching

Three Supabase queries to `meal_plans`, filtered by `date` ranges, aggregating `estimated_cost`. Queries run in parallel on panel open. Results cached until date changes or meals are modified.

```typescript
// In useMeals.ts or new utility
getPeriodCosts(userId: string): Promise<{
  week: number;
  month: number;
  year: number;
}>
```

Uses `supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', startDate).lte('date', endDate)` and sums client-side.

### UI

- Daily cost text gets `cursor-pointer` and subtle hover effect
- Panel slides down with transition, shows 3 rows: `Tydzien: X zl | Miesiac: Y zl | Rok: Z zl`
- Close on re-click or click outside

### Files Changed

- `app/components/meals/MealDashboard.tsx` — clickable cost, expandable panel
- `app/components/meals/useMeals.ts` — `getPeriodCosts()` function

---

## 3. Free/Gift Pantry Items

### Problem

User receives some items for free (e.g., eggs from family). These should not be deducted from pantry or counted in cost calculations when used in meals.

### Solution

Add `is_free` boolean to `pantry_items` table. When all matching pantry items for an ingredient are `is_free`, automatically set `fromPantry: false` on that ingredient (skip deduction and cost). If mixed (some free, some purchased), deduction uses only purchased items (FIFO).

### Database Migration

```sql
ALTER TABLE pantry_items ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
```

### PantryItem Type Update

```typescript
export interface PantryItem {
  // ... existing fields
  is_free: boolean;
}
```

### UI in PantryManager

- Toggle "Nie kupowane (prezent)" when adding/editing a pantry item
- When `is_free` is toggled on, `price` is set to 0
- Visual indicator: `Gift` icon from lucide-react next to item name
- Filter/display: free items shown with a subtle badge in the product list

### Deduction Logic Changes

In `pantryUtils.ts` / `usePantry.ts` / `costUtils.ts`:
- `findMatchingPantryItems()` filters out `is_free` items from deduction candidates
- If no non-free items match, `fromPantry` is effectively `false` for that ingredient (cost = null, no deduction)
- Free items' `quantity_remaining` is NOT decremented

### Files Changed

- `supabase/migrations/` — new migration for `is_free` column
- `app/components/meals/types.ts` — `PantryItem.is_free`
- `app/components/meals/PantryManager.tsx` — toggle UI for free items
- `app/components/meals/pantryUtils.ts` — filter free items in matching
- `app/components/meals/costUtils.ts` — skip free items in cost estimation
- `app/components/meals/usePantry.ts` — skip free items in deduction

---

## Testing

- Unit test for `updateMealInWeightEntry()` — verifies macros updated in JSONB and calories recalculated
- Unit test for `getPeriodCosts()` — verifies date range filtering and sum calculation
- Unit test for `findMatchingPantryItems()` — verifies free items excluded
- Existing `estimateCost` tests extended for `is_free` items
