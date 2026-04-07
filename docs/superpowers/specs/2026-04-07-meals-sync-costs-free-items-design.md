# Meals: Auto-sync makr, rozwijane koszty, darmowe produkty

**Date:** 2026-04-07
**Status:** Approved

## Overview

Three related improvements to the meals module:
1. Auto-sync meal macros to weight tracker when they change after initial push
2. Expandable cost summary showing weekly/monthly/yearly totals
3. "Free item" flag on pantry items that auto-skips deduction and cost

---

## 1. Auto-sync Meal Macros to Weight Tracker

### Problem

When a meal is pushed to the weight tracker via "Do wagi", its macros are stored as a snapshot in `entries.meals` JSONB. If macros later change (auto-enrichment fixing 0-calorie ingredients, or manual edit), the weight entry becomes stale.

### Solution

**A) Auto-sync:** After any macro update (auto-enrichment or ingredient edit), check if the meal was already pushed to the tracker. If so, automatically update the weight entry.

**B) Manual fallback:** When a meal is already in the tracker, change the "Do wagi" button to "Odswież w wadze" (RefreshCw icon) so the user can manually trigger a resync.

### New Functions in `mealTrackerBridge.ts`

```typescript
isMealInTracker(userId: string, date: string, mealName: string): Promise<boolean>

updateMealInWeightEntry(userId: string, date: string, meal: MealPlan): Promise<{ success: boolean; error?: string }>
```

**Calorie update strategy (delta-based):** `updateMealInWeightEntry` finds the meal by `name + meal_slot` in `entries.meals`, computes `delta = newCalories - oldCalories`, replaces the meal's macros, and applies `entries.calories += delta`. This preserves any manually-entered calories not tracked as meals.

**Matching by name + slot:** To handle the edge case of two meals with the same name on different slots (e.g., "Jajecznica" for breakfast and dinner), matching uses both `name` and `type` (meal slot).

### Detection of "already in tracker"

- `MealsMode` fetches the `entries.meals` JSONB for the selected date (single query)
- Builds a Set of `name+slot` keys from the returned meals array
- Passes `isInTracker` boolean to each `MealCard` via props
- If no weight entry exists for that date, all meals show "Do wagi" (which will fail with `no_entry` — existing behavior)
- Cache refreshed when date changes or after push/update

### Auto-sync Trigger Points

1. After `enrichIngredientsWithNutrition()` completes in `MealsMode.tsx`
2. After `updateIngredients()` in `useMeals.ts` (ingredient edit + save)

Auto-sync is fire-and-forget with toast feedback on success/failure.

### Files Changed

- `lib/mealTrackerBridge.ts` — add `updateMealInWeightEntry()`, `getMealsInTracker()`
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
getPeriodCosts(userId: string): Promise<{ week: number; month: number; year: number }>
```

**Date calculation:** All date ranges computed using `formatLocalDate()` to avoid UTC date shift. Week starts on Monday (ISO). Null `estimated_cost` values coalesced to 0 during summation.

### UI

- Daily cost text gets `cursor-pointer` and subtle hover effect
- Panel slides down with transition, shows 3 rows with labels and amounts
- Close on re-click or click outside

### Files Changed

- `app/components/meals/MealDashboard.tsx` — clickable cost, expandable panel
- `app/components/meals/useMeals.ts` — `getPeriodCosts()` function

---

## 3. Free/Gift Pantry Items

### Problem

User receives some items for free (e.g., eggs from family). These should not be deducted from pantry or counted in cost calculations when used in meals.

### Design Decision

`fromPantry: false` skips BOTH quantity deduction AND cost. This is the intended behavior — free items are conceptually "outside" the pantry tracking system. Their `quantity_remaining` stays unchanged. Users can manually adjust or write off free items if needed.

### Solution

Add `is_free` boolean to `pantry_items` table. When all matching pantry items for an ingredient are `is_free`, the ingredient is treated as `fromPantry: false` (skip deduction and cost). If mixed (some free, some purchased), deduction uses only purchased items (FIFO), free items skipped.

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
- When `is_free` toggled on: `price` set to 0
- When `is_free` toggled off: `price` field becomes editable again (user must enter a price)
- Visual indicator: `Gift` icon from lucide-react next to item name

### Deduction Logic Changes

In `pantryUtils.ts` / `usePantry.ts` / `costUtils.ts`:
- `findMatchingPantryItems()` filters out `is_free` items from deduction candidates
- If no non-free items match, cost = null, no deduction (same as `fromPantry: false`)
- Free items' `quantity_remaining` is NOT decremented
- FIFO ordering preserved among non-free items only

### Write-offs for free items

Free items can still be written off. Cost of write-off for a free item is 0 zl (since `costPerUnit` = 0). This allows tracking waste even for free items.

### Offline support

Out of scope for all three features. They degrade gracefully — if Supabase is unreachable, operations fail silently or queue via existing sync mechanism.

### Files Changed

- `supabase/migrations/` — new migration for `is_free` column
- `app/components/meals/types.ts` — `PantryItem.is_free`
- `app/components/meals/PantryManager.tsx` — toggle UI for free items
- `app/components/meals/pantryUtils.ts` — filter free items in matching
- `app/components/meals/costUtils.ts` — skip free items in cost estimation
- `app/components/meals/usePantry.ts` — skip free items in deduction

---

## Testing

- Unit test for `updateMealInWeightEntry()` — verifies delta-based calorie update and name+slot matching
- Unit test for `getPeriodCosts()` — verifies date range filtering, null coalescing, and sum calculation
- Unit test for `findMatchingPantryItems()` — verifies free items excluded
- Existing `estimateCost` tests extended for `is_free` items

---

## Post-implementation

Update CLAUDE.md data layer documentation to reflect:
- Auto-sync behavior for meal-to-tracker bridge
- Cost summary feature in MealDashboard
- `is_free` flag on PantryItem and its effect on deduction
