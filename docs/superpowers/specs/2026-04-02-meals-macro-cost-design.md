# Meals: Auto Macro Calculation & Pantry Cost Estimation

**Date:** 2026-04-02
**Status:** Approved

## Problem

1. AI-generated meals return ingredients with 0 kcal / 0g macros despite schema requiring these fields
2. No macro lookup when user manually edits ingredient names/amounts
3. Cost shown as "0.00 zl" until meal is marked as "eaten" — no upfront cost estimation from pantry

## Requirements

1. **Macro at generation** — Fix Gemini prompt and add validation so AI never returns zero macros for real ingredients
2. **Macro at edit** — When user edits ingredient name or amount, Gemini recalculates macros in background
3. **Cost from pantry immediately** — Display estimated cost based on pantry prices as soon as meal is generated/edited
4. **Missing pantry items** — Show "brak ceny" (no price) for ingredients not in pantry; don't estimate

## Design

### Section 1: Fix Macro Generation

**Files:** `useMealAI.ts`, `types.ts`

- Strengthen system prompt in `useMealAI.ts`:
  - Add explicit instruction: "Kazdy skladnik MUSI miec realistyczne, niezerowe wartosci kcal/bialko/wegle/tluszcze. NIE zwracaj zer."
- Add post-response validation in `useMealAI.ts`:
  - If any ingredient has `calories === 0` and is not in a zero-calorie whitelist (water, salt, pepper, spices), retry once with a corrective prompt
- Add Zod refinement on `aiMealSchema` in `types.ts`:
  - `calories` must be > 0 for ingredients not in the zero-calorie whitelist

### Section 2: Gemini Nutrition Lookup on Edit

**New files:**
- `app/components/meals/useNutritionLookup.ts` — hook
- `app/api/meals/nutrition/route.ts` — API route

**Hook: `useNutritionLookup.ts`**

Exports:
- `lookupNutrition(name: string, amount: number, unit: PantryUnit): Promise<{calories, protein, carbs, fat}>`
- `isLoading: Map<string, boolean>` — loading state per ingredient name

Behavior:
- Calls `/api/meals/nutrition` API route
- **Debounce 800ms** — timer resets on each keystroke during inline edit
- **localStorage cache** with key `nutrition:{name_lowercase}:{amount}:{unit}`, TTL 30 days
- Cache normalized to per-100g/100ml/1szt values, scaled to requested amount
- If cached value exists for same name+unit (any amount), recalculate proportionally without API call

**API route: `/api/meals/nutrition/route.ts`**

- Calls Gemini 2.0 Flash (same model as meal chat)
- Prompt: "Podaj wartosci odzywcze dla: {name} {amount}{unit}. Zwroc JSON: {calories, protein, carbs, fat}"
- Response validated via Zod schema:
  ```typescript
  z.object({
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  })
  ```
- Rate limiting via existing `serverRateLimiter.ts`

**Integration with `MealCard.tsx`:**

- Edit ingredient name → debounce 800ms → `lookupNutrition()` → update macros
- Edit ingredient amount → if cache exists for name+unit, recalculate locally (proportion). Otherwise → `lookupNutrition()`
- Small spinner next to ingredient during loading
- Manual macro override disables auto-lookup for that ingredient (flag `manualOverride: boolean` on ingredient)

### Section 3: Automatic Cost Estimation from Pantry

**Files:** `usePantry.ts`, `MealCard.tsx`, `MealDashboard.tsx`, `useMeals.ts`

**New function in `usePantry.ts`: `estimateCost(ingredients: MealIngredient[])`**

Returns: `{ costs: Map<string, number | null>, totalCost: number }`

Logic:
- For each ingredient, find matching pantry item (name includes + same unit + quantity_remaining > 0)
- If found: `cost = (price / quantity_total) * ingredient.amount`
- If not found: `cost = null`
- `totalCost` = sum of non-null costs

**When called:**
- After AI generates a meal
- After ingredient edit (name, amount, unit change)
- After pantry changes (add/remove/edit item) — recalculate for all meals of the day

**Does NOT deduct from pantry** — estimation only. Deduction remains on "Zjedzony" click.

**UI changes in `MealCard.tsx`:**
- Per ingredient: if `cost !== null` → show formatted cost (e.g., "2.50 zl"); if `null` → gray text "brak ceny"
- Meal header total: sum of known costs; if any ingredient has null cost → append "(czesciowy)" label
- Day summary bar in `MealDashboard.tsx`: sum of all meal costs for the day

## Data Flow

```
Meal Generated/Edited
  |
  +---> Gemini: calculate macros per ingredient
  |       (debounce 800ms on edit, cache in localStorage)
  |
  +---> Local: estimate cost from pantry
          (price/quantity_total * amount, or null if not in pantry)
  |
  v
UI Updated: macros + cost per ingredient, totals in header
  |
  v
User clicks "Zjedzony"
  |
  +---> deductIngredients() — existing flow
          (deduct from pantry, finalize cost)
```

## Zero-Calorie Whitelist

Ingredients that legitimately have ~0 calories and should not trigger retry:
- woda, sol, pieprz, ocet, herbata, kawa (czarna), przyprawy (bez cukru)

Stored as a constant array in `types.ts` or `constants.ts`.

## Edge Cases

- **Pantry item partially covers ingredient:** If pantry has 200g chicken but recipe needs 500g, cost estimated on full 500g (using price-per-unit from pantry). Deduction at "Zjedzony" handles the partial deduct.
- **Multiple pantry items match:** Use first match (same as current `deductIngredients` behavior).
- **Gemini API failure:** Keep existing macro values, show small error indicator. Don't zero out.
- **Offline:** Cache serves previously looked-up ingredients. New lookups queued or skipped with "brak danych" indicator.
- **Manual override:** If user manually edits a macro field, set `manualOverride: true` on that ingredient. Auto-lookup skipped for overridden ingredients.

## Non-Goals

- External food database API (USDA, Open Food Facts)
- Price estimation for items not in pantry
- Barcode scanning
- Nutrition label OCR
