# Meal-to-Tracker Bridge Design

## Problem

Two separate meal systems exist:
1. **Meals module** (`meal_plans` table) - AI meal planning, pantry, shopping
2. **Weight entry meals** (`entries.meals` JSONB) - manual per-entry meal tracking

Users must manually re-enter the same meal data in the weight tracker that they already logged in the meals module.

## Solution

Two-way integration: push from MealCard + pull from EntryModal.

### Constraint

Both directions require an existing weight entry for the target day. If no entry exists, show a toast: "Najpierw dodaj wpis wagi na ten dzień".

---

## Component 1: "Do wagi" button on MealCard

### Visibility

Only for meals with status `accepted` or `eaten`.

### Appearance (X/Twitter style)

- Position: in the action button row alongside "Polub", "Zamień", etc.
- Icon: `ArrowUpFromLine` from lucide (18px, stroke-width 1.5)
- Text: "Do wagi"
- Shape: `rounded-full` (pill)
- Font: 700 weight, 13px
- Color: `bg-[#1d9bf0]/10 text-[#1d9bf0]`, hover `bg-[#1d9bf0]/20`
- Hover: `transition-colors duration-150`
- Active: `scale-95` with `transition-transform duration-75`

### Success animation

- Icon transitions to Check with `opacity-0 scale-75` -> `opacity-100 scale-100` (150ms ease-out)
- Text changes to "Wysłano", color `text-green-500`
- Reverts to normal state after 2 seconds

### Error states

- No weight entry for that day: toast "Najpierw dodaj wpis wagi na ten dzień"
- Duplicate meal (same name already in entry): toast "Ten posiłek już jest we wpisie wagi"

### Data flow

1. Click -> call `pushMealToWeightEntry(userId, date, mealData)`
2. Function checks entry exists for date
3. Adds `{ id, name, type, calories, protein, carbs, fat }` to `entries.meals` JSONB
4. Recalculates `entries.calories` as sum of all meals
5. Returns `{ success, error? }`

---

## Component 2: "Importuj z posiłków" in EntryModal

### Position

In the "Posiłki" section, next to the existing "Dodaj posiłek" button.

### Button appearance (X/Twitter style)

- Icon: `Download` from lucide (18px, stroke-width 1.5)
- Text: "Importuj z posiłków"
- Shape: `rounded-full` (pill)
- Font: 700 weight, 13px
- Color: `bg-[#1d9bf0]/10 text-[#1d9bf0]`, hover `bg-[#1d9bf0]/20`
- When no meals exist for the date: grayed out with tooltip "Brak posiłków na ten dzień"

### Selection dropdown/modal

- Triggered on click, lazy-loads meals from `meal_plans` for the selected date
- Only fetches `status IN ('accepted', 'eaten')`
- Background: `var(--card-bg)`, border `var(--card-border)`

Each row:
- Custom checkbox: 4px border-radius, 2px border, fill `#1d9bf0` when checked
- Meal slot label (e.g. OBIAD) in muted text
- Meal name in white
- Calories summary
- Row hover: `bg-white/5`, padding 12px
- Already-imported meals (name match): grayed checkbox, text "Dodano", not selectable

Submit button:
- Text: "Importuj zaznaczone"
- Style: `bg-[#1d9bf0] text-white font-bold rounded-full px-4 py-2`
- Hover: `bg-[#1a8cd8]`

### Data flow

1. Click "Importuj" -> `fetchMealsByDate(date)` from Supabase
2. Show selection UI
3. User selects meals -> adds to local `meals` state in EntryModal
4. Saved on form submit (existing flow)

### Type mapping

`meal_slot` values ("ŚNIADANIE", "OBIAD", etc.) map to `MealType` enum ("Śniadanie", "Obiad", etc.) via lowercase + capitalize.

---

## Data Layer: `lib/mealTrackerBridge.ts`

New utility file with two functions:

### `pushMealToWeightEntry(userId: string, date: string, meal: MealData): Promise<{success: boolean, error?: string}>`

1. Query `entries` WHERE `user_id = userId AND date = date`
2. If no entry: return `{ success: false, error: 'no_entry' }`
3. Check for duplicate by name in existing `meals` array
4. If duplicate: return `{ success: false, error: 'duplicate' }`
5. Append meal to `meals` JSONB array
6. Recalculate `calories` as sum
7. Update entry in Supabase
8. Return `{ success: true }`

### `fetchMealPlansForDate(userId: string, date: string): Promise<MealPlan[]>`

1. Query `meal_plans` WHERE `user_id = userId AND date = date AND status IN ('accepted', 'eaten')`
2. Return results

This avoids coupling the MealsMode and WeightTracker hooks - both modules call Supabase directly through this bridge.

---

## Visual Style Summary (X/Twitter)

- All action buttons: `rounded-full`, font-bold 13px
- Icons: 18px, stroke-width 1.5
- Primary action color: `#1d9bf0` (X blue)
- Hover transitions: `duration-150` colors, `duration-75` scale
- Pressed state: `scale-95`
- Success state: green check with scale+opacity animation (150ms ease-out), auto-revert after 2s
