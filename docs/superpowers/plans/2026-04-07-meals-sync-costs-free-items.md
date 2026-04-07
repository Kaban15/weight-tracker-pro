# Meals: Auto-sync, Cost Summaries, Free Pantry Items — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix stale meal macros in weight tracker, add weekly/monthly/yearly cost summaries, and add "free item" pantry flag.

**Architecture:** Three independent features sharing the meals module. Feature 1 extends `mealTrackerBridge.ts` with update/detection functions and wires auto-sync in `MealsMode.tsx`. Feature 2 adds expandable cost panel to `MealDashboard.tsx` with Supabase date-range queries. Feature 3 adds `is_free` column to `pantry_items` and filters free items from deduction/cost logic.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Supabase, Tailwind CSS v4, Vitest

**Spec:** `docs/superpowers/specs/2026-04-07-meals-sync-costs-free-items-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `lib/mealTrackerBridge.ts` | Add `updateMealInWeightEntry()`, `getMealsInTracker()` |
| Modify | `app/components/meals/MealCard.tsx` | `isInTracker` prop, toggle "Do wagi" / "Odśwież w wadze" |
| Modify | `app/components/meals/MealDashboard.tsx` | `isInTracker` map prop, pass to MealCard; expandable cost panel |
| Modify | `app/components/meals/MealsMode.tsx` | Fetch tracker status, auto-sync after enrichment/edit, wire `getPeriodCosts` |
| Modify | `app/components/meals/useMeals.ts` | Add `getPeriodCosts()` function |
| Modify | `app/components/meals/types.ts` | Add `is_free` to `PantryItem` |
| Modify | `app/components/meals/pantryUtils.ts` | Filter `is_free` items in `findMatchingPantryItems()` |
| Modify | `app/components/meals/costUtils.ts` | Skip `is_free` items in estimation |
| Modify | `app/components/meals/usePantry.ts` | Skip `is_free` items in deduction, pass `is_free` in `addItem` |
| Modify | `app/components/meals/PantryItemModal.tsx` | Add "Nie kupowane (prezent)" toggle |
| Modify | `app/components/meals/PantryManager.tsx` | Show Gift icon on free items |
| Create | `supabase/migrations/20260407_add_is_free_to_pantry.sql` | `ALTER TABLE pantry_items ADD COLUMN is_free BOOLEAN DEFAULT FALSE` |
| Create | `__tests__/mealTrackerBridge.test.ts` | Tests for update/detection functions |
| Modify | `__tests__/estimateCost.test.ts` | Tests for `is_free` filtering |

---

## Task 1: `updateMealInWeightEntry()` and `getMealsInTracker()` in bridge

**Files:**
- Modify: `lib/mealTrackerBridge.ts`
- Create: `__tests__/mealTrackerBridge.test.ts`

- [ ] **Step 1: Write failing tests for `getMealsInTracker` and `updateMealInWeightEntry`**

In `__tests__/mealTrackerBridge.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mockSelect.mockReturnThis(),
      update: mockUpdate.mockReturnThis(),
      eq: mockEq.mockReturnThis(),
      single: mockSingle,
    })),
  },
}));

import { getMealsInTracker, updateMealInWeightEntry } from '@/lib/mealTrackerBridge';

describe('getMealsInTracker', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns set of name+slot keys from entries.meals', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: '1',
        meals: [
          { name: 'Jajecznica', type: 'Śniadanie', calories: 300, protein: 20, carbs: 5, fat: 22 },
          { name: 'Kurczak', type: 'Obiad', calories: 500, protein: 40, carbs: 30, fat: 15 },
        ],
        calories: 800,
      },
      error: null,
    });

    const result = await getMealsInTracker('user1', '2026-04-07');
    expect(result).toEqual(new Set(['Jajecznica::Śniadanie', 'Kurczak::Obiad']));
  });

  it('returns empty set when no entry exists', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    const result = await getMealsInTracker('user1', '2026-04-07');
    expect(result).toEqual(new Set());
  });
});

describe('updateMealInWeightEntry', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates meal macros using delta-based calorie adjustment', async () => {
    const existingMeals = [
      { id: 'a', name: 'Kurczak', type: 'Obiad', calories: 300, protein: 30, carbs: 10, fat: 15 },
    ];
    mockSingle.mockResolvedValue({
      data: { id: 'entry1', meals: existingMeals, calories: 500 }, // 500 = 300 meal + 200 manual
      error: null,
    });
    mockEq.mockReturnValue({ error: null }); // for update

    const meal = {
      name: 'Kurczak',
      meal_slot: 'Obiad',
      calories: 450, protein: 45, carbs: 20, fat: 25,
    } as any;

    const result = await updateMealInWeightEntry('user1', '2026-04-07', meal);
    expect(result.success).toBe(true);

    // Should have called update with delta: 500 + (450 - 300) = 650
    const updateCall = mockUpdate.mock.calls[0][0];
    expect(updateCall.calories).toBe(650);
    expect(updateCall.meals[0].calories).toBe(450);
    expect(updateCall.meals[0].protein).toBe(45);
  });

  it('returns not_found when meal not in tracker', async () => {
    mockSingle.mockResolvedValue({
      data: { id: 'entry1', meals: [], calories: 0 },
      error: null,
    });

    const meal = { name: 'Pizza', meal_slot: 'Obiad', calories: 800 } as any;
    const result = await updateMealInWeightEntry('user1', '2026-04-07', meal);
    expect(result).toEqual({ success: false, error: 'not_found' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/mealTrackerBridge.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement `getMealsInTracker` and `updateMealInWeightEntry`**

Add to `lib/mealTrackerBridge.ts` (after existing exports):

```typescript
/**
 * Get a Set of "name::type" keys for meals already pushed to a weight entry.
 */
export async function getMealsInTracker(
  userId: string,
  date: string,
): Promise<Set<string>> {
  if (!supabase) return new Set();

  const { data, error } = await supabase
    .from('entries')
    .select('meals')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (error || !data || !data.meals) return new Set();
  const meals = data.meals as Meal[];
  return new Set(meals.map(m => `${m.name}::${m.type}`));
}

/**
 * Update an existing meal's macros in a weight entry (delta-based calorie update).
 * Matches by name + meal_slot (type).
 */
export async function updateMealInWeightEntry(
  userId: string,
  date: string,
  meal: MealPlan,
): Promise<{ success: boolean; error?: 'no_entry' | 'not_found' | 'supabase_error' }> {
  if (!supabase) return { success: false, error: 'supabase_error' };

  const { data: existing, error: fetchError } = await supabase
    .from('entries')
    .select('id, meals, calories')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (fetchError || !existing) return { success: false, error: 'no_entry' };

  const currentMeals = (existing.meals as Meal[]) || [];
  const mealType = MEAL_TYPE_MAP[meal.meal_slot] || 'Przekąska';
  const idx = currentMeals.findIndex(m => m.name === meal.name && m.type === mealType);

  if (idx === -1) return { success: false, error: 'not_found' };

  const oldCalories = currentMeals[idx].calories || 0;
  const newMeal = mealPlanToTrackerMeal(meal);
  // Preserve the original id
  newMeal.id = currentMeals[idx].id;

  const updatedMeals = [...currentMeals];
  updatedMeals[idx] = newMeal;

  const delta = Math.round(meal.calories) - oldCalories;
  const newTotalCalories = (existing.calories || 0) + delta;

  const { error: updateError } = await supabase
    .from('entries')
    .update({
      meals: updatedMeals,
      calories: newTotalCalories,
    })
    .eq('id', existing.id);

  if (updateError) return { success: false, error: 'supabase_error' };
  return { success: true };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/mealTrackerBridge.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add lib/mealTrackerBridge.ts __tests__/mealTrackerBridge.test.ts
git commit -m "feat: add updateMealInWeightEntry and getMealsInTracker to bridge"
```

---

## Task 2: Wire auto-sync and "Odśwież w wadze" button in UI

**Files:**
- Modify: `app/components/meals/MealCard.tsx` (lines 8-9 for props, lines 220-253 for button)
- Modify: `app/components/meals/MealDashboard.tsx` (lines 14-28 for props, lines 246-258 for MealCard rendering)
- Modify: `app/components/meals/MealsMode.tsx` (lines 1-11 for imports, lines 90-123 for auto-repair, lines 141-180 for accept, lines 208-226 for send handler)

- [ ] **Step 1: Add `isInTracker` prop to MealCard**

In `app/components/meals/MealCard.tsx`, add prop to interface (line 19):

```typescript
  isInTracker?: boolean;
```

Add to destructured props (line 22):

```typescript
export default function MealCard({ meal, onRate, onReplace, onAccept, onReject, onMarkEaten, onToggleFavorite, onUpdateIngredients, onSendToTracker, onNutritionLookup, nutritionLoading, isInTracker }: MealCardProps) {
```

- [ ] **Step 2: Change "Do wagi" button to toggle between push and refresh**

Replace the button block at lines 220-253 in `MealCard.tsx`:

```typescript
          {onSendToTracker && (meal.status === 'accepted' || meal.status === 'eaten') && (
            <button
              onClick={async () => {
                if (sendStatus !== 'idle') return;
                setSendStatus('sending');
                try {
                  const result = await onSendToTracker(meal);
                  if (result.success) {
                    setSendStatus('sent');
                    setTimeout(() => setSendStatus('idle'), 2000);
                  } else {
                    setSendStatus('idle');
                  }
                } catch {
                  setSendStatus('idle');
                }
              }}
              disabled={sendStatus === 'sending'}
              className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-bold rounded-full transition-all duration-150 active:scale-95 ${
                sendStatus === 'sent'
                  ? 'bg-green-500/20 text-green-500'
                  : isInTracker
                    ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                    : 'bg-[#1d9bf0]/10 text-[#1d9bf0] hover:bg-[#1d9bf0]/20'
              }`}
            >
              {sendStatus === 'sent' ? (
                <Check className="w-[18px] h-[18px] animate-[scaleIn_150ms_ease-out]" strokeWidth={1.5} />
              ) : sendStatus === 'sending' ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
              ) : isInTracker ? (
                <RefreshCw className="w-[18px] h-[18px]" strokeWidth={1.5} />
              ) : (
                <ArrowUpFromLine className="w-[18px] h-[18px]" strokeWidth={1.5} />
              )}
              {sendStatus === 'sent' ? 'Zaktualizowano' : isInTracker ? 'Odśwież w wadze' : 'Do wagi'}
            </button>
          )}
```

- [ ] **Step 3: Add `isInTracker` map to MealDashboard props and pass to MealCard**

In `app/components/meals/MealDashboard.tsx`, add to props interface (around line 27):

```typescript
  trackerMealKeys?: Set<string>;
```

Add to destructured props. Then update MealCard rendering (line 247):

```typescript
            onSendToTracker={onSendToTracker}
            isInTracker={trackerMealKeys?.has(`${meal.name}::${meal.meal_slot}`)}
```

- [ ] **Step 4: Wire tracker status fetching and auto-sync in MealsMode**

In `app/components/meals/MealsMode.tsx`:

1. Update React import to include `useCallback` (line 4):

```typescript
import { useState, useEffect, useRef, useCallback } from 'react';
```

2. Add imports (line 5):

```typescript
import { pushMealToWeightEntry, getMealsInTracker, updateMealInWeightEntry } from '@/lib/mealTrackerBridge';
```

3. Add state for tracker keys after line 50:

```typescript
  const [trackerMealKeys, setTrackerMealKeys] = useState<Set<string>>(new Set());
```

4. Add a function to refresh tracker status (after toast state):

```typescript
  const refreshTrackerStatus = useCallback(async (date: string) => {
    if (!user?.id) return;
    const keys = await getMealsInTracker(user.id, date);
    setTrackerMealKeys(keys);
  }, [user?.id]);
```

5. Add effect to fetch tracker status when mealPlans change — after the auto-repair effect (around line 123):

```typescript
  // Refresh tracker status for the current day's meals
  const currentDate = formatDate(new Date());
  useEffect(() => {
    refreshTrackerStatus(currentDate);
  }, [currentDate, mealPlans.length, refreshTrackerStatus]);
```

6. Add auto-sync helper (after `enrichIngredientsWithNutrition`):

```typescript
  /** Auto-sync updated meal macros to weight tracker if already pushed */
  const autoSyncToTracker = useCallback(async (meal: MealPlan) => {
    if (!user?.id) return;
    const key = `${meal.name}::${meal.meal_slot}`;
    if (!trackerMealKeys.has(key)) return;
    const result = await updateMealInWeightEntry(user.id, meal.date, meal);
    if (result.success) {
      setToast({ message: 'Zaktualizowano makra we wpisie wagi', type: 'success' });
    }
  }, [user?.id, trackerMealKeys]);
```

7. Wire auto-sync in `handleAcceptMeals` — after enrichment updates (after line 165):

```typescript
          // Auto-sync to tracker if already pushed
          const enrichedMeal = { ...savedMeal, ingredients: enriched, calories: totalCal, protein: totalPro, carbs: totalCarb, fat: totalFat };
          await autoSyncToTracker(enrichedMeal);
```

8. Wire auto-sync in auto-repair effect — after `updateMealPlan` (around line 118):

```typescript
          const repairedMeal = { ...meal, ingredients: enriched, calories: totalCal, protein: enriched.reduce((s, i) => s + i.protein, 0), carbs: enriched.reduce((s, i) => s + i.carbs, 0), fat: enriched.reduce((s, i) => s + i.fat, 0) };
          await autoSyncToTracker(repairedMeal);
```

9. Update `handleSendToTracker` to handle both push and update:

```typescript
  const handleSendToTracker = async (meal: MealPlan): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'no_user' };
    try {
      const key = `${meal.name}::${meal.meal_slot}`;
      const isUpdate = trackerMealKeys.has(key);

      const result = isUpdate
        ? await updateMealInWeightEntry(user.id, meal.date, meal)
        : await pushMealToWeightEntry(user.id, meal.date, meal);

      if (result.success) {
        setToast({ message: isUpdate ? 'Zaktualizowano we wpisie wagi' : 'Wysłano do wpisu wagi', type: 'success' });
        await refreshTrackerStatus(meal.date);
      } else if (result.error === 'no_entry') {
        setToast({ message: 'Najpierw dodaj wpis wagi na ten dzień', type: 'error' });
      } else if (result.error === 'duplicate') {
        setToast({ message: 'Ten posiłek już jest we wpisie wagi', type: 'error' });
      } else if (result.error === 'not_found') {
        // Meal was deleted from tracker — push fresh
        const pushResult = await pushMealToWeightEntry(user.id, meal.date, meal);
        if (pushResult.success) {
          setToast({ message: 'Wysłano do wpisu wagi', type: 'success' });
          await refreshTrackerStatus(meal.date);
        }
        return pushResult;
      } else {
        setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      }
      return result;
    } catch {
      setToast({ message: 'Błąd zapisu do wpisu wagi', type: 'error' });
      return { success: false, error: 'supabase_error' };
    }
  };
```

10. Pass `trackerMealKeys` to `MealDashboard` in the render (find where `<MealDashboard` is rendered):

```typescript
            trackerMealKeys={trackerMealKeys}
```

- [ ] **Step 5: Run the app and verify**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add lib/mealTrackerBridge.ts app/components/meals/MealCard.tsx app/components/meals/MealDashboard.tsx app/components/meals/MealsMode.tsx
git commit -m "feat: auto-sync meal macros to weight tracker and add refresh button"
```

---

## Task 3: Expandable cost summary panel

**Files:**
- Modify: `app/components/meals/useMeals.ts` (add `getPeriodCosts`)
- Modify: `app/components/meals/MealDashboard.tsx` (expandable panel UI)
- Modify: `app/components/meals/MealsMode.tsx` (wire `getPeriodCosts` prop)

- [ ] **Step 1: Add `getPeriodCosts` to `useMeals.ts`**

Add before the `return` statement (around line 310):

```typescript
  /** Fetch cost totals for week, month, and year */
  const getPeriodCosts = useCallback(async (): Promise<{ week: number; month: number; year: number }> => {
    if (!userId || !supabase) return { week: 0, month: 0, year: 0 };

    const now = new Date();
    // Week: Monday to Sunday
    const dayOfWeek = now.getDay() || 7; // Sunday = 7
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayOfWeek + 1);
    const weekStart = formatDate(monday);

    // Month: 1st of current month
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    // Year: Jan 1
    const yearStart = `${now.getFullYear()}-01-01`;

    const today = formatDate(now);

    const [weekRes, monthRes, yearRes] = await Promise.all([
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', weekStart).lte('date', today),
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', monthStart).lte('date', today),
      supabase.from('meal_plans').select('estimated_cost').eq('user_id', userId).gte('date', yearStart).lte('date', today),
    ]);

    const sum = (data: any[] | null) =>
      (data || []).reduce((s: number, r: { estimated_cost: number | null }) => s + (r.estimated_cost || 0), 0);

    return {
      week: Math.round(sum(weekRes.data) * 100) / 100,
      month: Math.round(sum(monthRes.data) * 100) / 100,
      year: Math.round(sum(yearRes.data) * 100) / 100,
    };
  }, [userId]);
```

Add `getPeriodCosts` to the return object (around line 327):

```typescript
  return {
    // ... existing fields
    getPeriodCosts,
  };
```

- [ ] **Step 2: Add expandable cost panel to MealDashboard**

In `app/components/meals/MealDashboard.tsx`:

Update React import (line 4) to include `useRef` and `useEffect`:

```typescript
import { useState, useRef, useEffect } from 'react';
```

Add to props interface:

```typescript
  onGetPeriodCosts?: () => Promise<{ week: number; month: number; year: number }>;
```

Add state after existing state declarations (around line 50):

```typescript
  const [costExpanded, setCostExpanded] = useState(false);
  const [periodCosts, setPeriodCosts] = useState<{ week: number; month: number; year: number } | null>(null);
  const [costLoading, setCostLoading] = useState(false);
```

Add click handler:

```typescript
  const handleCostClick = async () => {
    if (costExpanded) {
      setCostExpanded(false);
      return;
    }
    setCostExpanded(true);
    if (!periodCosts && onGetPeriodCosts) {
      setCostLoading(true);
      const costs = await onGetPeriodCosts();
      setPeriodCosts(costs);
      setCostLoading(false);
    }
  };
```

Replace the cost display span (line 218) with:

```typescript
        <button
          onClick={handleCostClick}
          className="text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          {dayTotals.cost.toFixed(2)} zł {costExpanded ? '▲' : '▼'}
        </button>
```

Add the expandable panel right after the day summary bar div (after line 219, before the generate buttons):

```typescript
      {/* Expandable cost summary */}
      {costExpanded && (
        <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3 text-xs space-y-1 animate-in slide-in-from-top-2 duration-200">
          {costLoading ? (
            <div className="flex items-center gap-2 text-[var(--muted)]">
              <Loader2 className="w-3 h-3 animate-spin" /> Ładowanie...
            </div>
          ) : periodCosts ? (
            <>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Ten tydzień</span>
                <span className="text-[var(--foreground)]">{periodCosts.week.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Ten miesiąc</span>
                <span className="text-[var(--foreground)]">{periodCosts.month.toFixed(2)} zł</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Ten rok</span>
                <span className="text-[var(--foreground)]">{periodCosts.year.toFixed(2)} zł</span>
              </div>
            </>
          ) : null}
        </div>
      )}
```

Update the lucide-react import (line 5) to include `Loader2`:

```typescript
import { CalendarDays, ChevronLeft, ChevronRight, Sparkles, ShoppingCart, Package, BarChart3, ToggleLeft, ToggleRight, Heart, PlusCircle, Loader2 } from 'lucide-react';
```

- [ ] **Step 3: Wire `getPeriodCosts` in MealsMode**

In `MealsMode.tsx`, find where `<MealDashboard` is rendered and add:

```typescript
            onGetPeriodCosts={getPeriodCosts}
```

Also add `getPeriodCosts` to the destructured return from `useMeals`.

- [ ] **Step 4: Add click-outside handler and cache invalidation**

In `MealDashboard.tsx`, add `useRef` and `useEffect` imports if not present. Add a ref for the cost panel and a click-outside effect:

```typescript
  const costPanelRef = useRef<HTMLDivElement>(null);

  // Close cost panel on click outside
  useEffect(() => {
    if (!costExpanded) return;
    const handler = (e: MouseEvent) => {
      if (costPanelRef.current && !costPanelRef.current.contains(e.target as Node)) {
        setCostExpanded(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [costExpanded]);

  // Reset period costs cache when meals change
  useEffect(() => {
    setPeriodCosts(null);
  }, [mealPlans]);
```

Wrap the cost button + panel in a div with the ref:

```typescript
        <div ref={costPanelRef} className="relative">
          <button onClick={handleCostClick} ...>
            {dayTotals.cost.toFixed(2)} zł {costExpanded ? '▲' : '▼'}
          </button>
        </div>
```

And place the expandable panel div inside this wrapper.

- [ ] **Step 5: Build and verify**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 6: Commit**

```bash
git add app/components/meals/useMeals.ts app/components/meals/MealDashboard.tsx app/components/meals/MealsMode.tsx
git commit -m "feat: add expandable weekly/monthly/yearly cost summary"
```

---

## Task 4: SQL migration and type for `is_free`

**Files:**
- Create: `supabase/migrations/20260407_add_is_free_to_pantry.sql`
- Modify: `app/components/meals/types.ts` (line 79, PantryItem interface)

- [ ] **Step 1: Create migration file**

```sql
-- Add is_free flag to pantry_items for items received as gifts
ALTER TABLE pantry_items ADD COLUMN is_free BOOLEAN DEFAULT FALSE;
```

- [ ] **Step 2: Add `is_free` to PantryItem type**

In `app/components/meals/types.ts`, add to `PantryItem` interface (after line 79, before `}`):

```typescript
  is_free: boolean;
```

- [ ] **Step 3: Fix existing test helpers to include `is_free` default**

In `__tests__/estimateCost.test.ts`, update `makePantryItem` to include `is_free: false` as default (line 5-10):

```typescript
const makePantryItem = (overrides: Partial<PantryItem>): PantryItem => ({
  id: '1', user_id: 'u1', name: 'kurczak', quantity_total: 1000,
  quantity_remaining: 800, unit: 'g', price: 30, purchased_at: '2026-04-01',
  created_at: '2026-04-01', updated_at: '2026-04-01', is_free: false,
  ...overrides,
});
```

Also update inline `PantryItem` objects in the `fromPantry === false` test (lines 54-56) to include `is_free: false`:

```typescript
    const pantryItems: PantryItem[] = [
      { id: '1', user_id: 'u', name: 'Mąka pszenna', quantity_total: 1000, quantity_remaining: 800, unit: 'g', price: 5, purchased_at: '', created_at: '', updated_at: '', is_free: false },
      { id: '2', user_id: 'u', name: 'Masło', quantity_total: 200, quantity_remaining: 200, unit: 'g', price: 8, purchased_at: '', created_at: '', updated_at: '', is_free: false },
    ];
```

- [ ] **Step 4: Run existing tests to verify they still pass**

Run: `npx vitest run __tests__/estimateCost.test.ts`
Expected: PASS (all existing tests still green)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260407_add_is_free_to_pantry.sql app/components/meals/types.ts __tests__/estimateCost.test.ts
git commit -m "feat: add is_free column to pantry_items"
```

---

## Task 5: Filter free items from deduction and cost logic

**Files:**
- Modify: `app/components/meals/pantryUtils.ts` (lines 22-39, `findMatchingPantryItems`)
- Modify: `app/components/meals/costUtils.ts` (lines 23-26)
- Modify: `app/components/meals/usePantry.ts` (lines 99)
- Modify: `__tests__/estimateCost.test.ts`

- [ ] **Step 1: Write failing test for free item filtering**

In `__tests__/estimateCost.test.ts`, add:

```typescript
it('excludes is_free pantry items from cost estimation', () => {
  const ingredients: MealIngredient[] = [
    { name: 'jajka', amount: 3, unit: 'szt', calories: 234, protein: 18, carbs: 2, fat: 15, cost: null },
  ];
  const pantryItems: PantryItem[] = [
    { id: '1', user_id: 'u', name: 'jajka', quantity_total: 30, quantity_remaining: 27, unit: 'szt', price: 0, purchased_at: '2026-04-01', created_at: '', updated_at: '', is_free: true },
  ];

  const result = estimateCostFromPantry(ingredients, pantryItems);
  expect(result.costs.get('jajka')).toBeNull();
  expect(result.totalCost).toBe(0);
});

it('uses only non-free items when mixed free and purchased exist', () => {
  const ingredients: MealIngredient[] = [
    { name: 'jajka', amount: 5, unit: 'szt', calories: 390, protein: 30, carbs: 3, fat: 25, cost: null },
  ];
  const pantryItems: PantryItem[] = [
    { id: '1', user_id: 'u', name: 'jajka', quantity_total: 30, quantity_remaining: 27, unit: 'szt', price: 0, purchased_at: '2026-04-01', created_at: '', updated_at: '', is_free: true },
    { id: '2', user_id: 'u', name: 'jajka', quantity_total: 10, quantity_remaining: 10, unit: 'szt', price: 15, purchased_at: '2026-04-02', created_at: '', updated_at: '', is_free: false },
  ];

  const result = estimateCostFromPantry(ingredients, pantryItems);
  // Should use only the purchased eggs: 5 * (15/10) = 7.50
  expect(result.costs.get('jajka')).toBe(7.5);
  expect(result.totalCost).toBe(7.5);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/estimateCost.test.ts`
Expected: FAIL — `is_free` not handled

- [ ] **Step 3: Filter free items in `findMatchingPantryItems`**

In `app/components/meals/pantryUtils.ts`, update the filter (line 29-37):

```typescript
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
```

The single `!p.is_free` addition handles both `costUtils.ts` (which calls `findMatchingPantryItems`) and `usePantry.ts` deduction (which also calls it). No changes needed in those files — they already use this function.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/estimateCost.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/components/meals/pantryUtils.ts __tests__/estimateCost.test.ts
git commit -m "feat: filter is_free pantry items from deduction and cost calculation"
```

---

## Task 6: UI for "Nie kupowane" toggle in PantryItemModal and PantryManager

**Files:**
- Modify: `app/components/meals/PantryItemModal.tsx` (add toggle + auto-zero price)
- Modify: `app/components/meals/PantryManager.tsx` (show Gift icon on free items)
- Modify: `app/components/meals/usePantry.ts` (pass `is_free` in addItem)

- [ ] **Step 1: Add `is_free` toggle to PantryItemModal**

In `app/components/meals/PantryItemModal.tsx`:

Add `Gift` to imports:

```typescript
import { Gift } from 'lucide-react';
```

Update the `onSave` prop type and add `is_free` state:

```typescript
  onSave: (item: { name: string; quantity: number; inputUnit: string; price: number; is_free: boolean }) => void;
```

Add state (after `price` state):

```typescript
  const [isFree, setIsFree] = useState(false);
```

Update `handleSubmit`:

```typescript
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !quantity || (!isFree && !price)) return;
    onSave({ name: name.trim(), quantity: +quantity, inputUnit: unit, price: isFree ? 0 : +price, is_free: isFree });
    setName(''); setQuantity(''); setUnit('g'); setPrice(''); setIsFree(false);
    onClose();
  };
```

Add toggle before the price field:

```typescript
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => { setIsFree(!isFree); if (!isFree) setPrice('0'); }}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isFree
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30'
                : 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--card-border)]'
            }`}
          >
            <Gift className="w-4 h-4" />
            Nie kupowane (prezent)
          </button>
        </div>
```

Conditionally hide price field when `isFree`:

```typescript
        {!isFree && (
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">Cena (zł)</label>
            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)}
              placeholder="np. 25.99"
              className="w-full bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg px-3 py-2 text-white" />
          </div>
        )}
```

- [ ] **Step 2: Update `usePantry.addItem` to accept `is_free`**

In `app/components/meals/usePantry.ts`, update `addItem` parameter type (line 25-30):

```typescript
  const addItem = useCallback(async (item: {
    name: string;
    quantity: number;
    inputUnit: string;
    price: number;
    is_free?: boolean;
  }) => {
```

Add `is_free` to the payload (after `purchased_at`):

```typescript
      is_free: item.is_free || false,
```

- [ ] **Step 3: Update PantryManager to pass `is_free` and show Gift icon**

In `app/components/meals/PantryManager.tsx`:

Add `Gift` to lucide-react imports:

```typescript
import { Plus, Trash2, ArrowLeft, Package, PackageX, Gift } from 'lucide-react';
```

In the active items list (around line 146, after the item name span):

```typescript
                        <span className="text-[var(--foreground)] font-medium">{item.name}</span>
                        {item.is_free && <Gift className="w-3.5 h-3.5 text-emerald-400" title="Nie kupowane (prezent)" />}
```

- [ ] **Step 4: Build and verify**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add app/components/meals/PantryItemModal.tsx app/components/meals/usePantry.ts app/components/meals/PantryManager.tsx
git commit -m "feat: add free/gift toggle for pantry items with auto-skip deduction"
```

---

## Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update data layer documentation**

In the **Meals** data layer section, add after the `fromPantry` paragraph:

```
**Auto-sync to Tracker**: When meal macros change (auto-enrichment or ingredient edit), if the meal was already pushed to the weight tracker, macros are automatically updated in the weight entry using delta-based calorie adjustment. Manual "Odśwież w wadze" button also available in MealCard.
```

After the cost estimation paragraph, add:

```
**Cost Summary Panel**: Clicking the daily cost amount in MealDashboard expands a panel showing weekly (Mon-Sun), monthly (1st-today), and yearly (Jan 1-today) cost totals. Data fetched via `getPeriodCosts()` in `useMeals.ts`.
```

In the pantry deduction paragraph, add:

```
Pantry items can be marked `is_free: true` (gift/not purchased) — these are excluded from `findMatchingPantryItems()`, so they're never deducted and never contribute to cost. Toggle in PantryItemModal via "Nie kupowane (prezent)" button.
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with auto-sync, cost summary, and free pantry items"
```
