# Meal-to-Tracker Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to push meals from the Meals module to weight tracker entries (and import them in EntryModal) to avoid duplicating data entry, with X/Twitter-styled UI.

**Architecture:** Extract shared bridge logic into `lib/mealTrackerBridge.ts` with two functions (`pushMealToWeightEntry`, `fetchMealPlansForDate`). Refactor existing `syncToTracker` in `useMeals.ts` to use the bridge. Add "Do wagi" button to MealCard and "Importuj z posiłków" to EntryModal. Add a lightweight toast component for feedback.

**Tech Stack:** React 19, TypeScript, Supabase, Tailwind CSS, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-04-06-meal-tracker-bridge-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `lib/mealTrackerBridge.ts` | Bridge functions: push meal to entry, fetch meal plans for date |
| Create | `app/components/ui/Toast.tsx` | Lightweight toast notification component |
| Modify | `app/components/meals/MealCard.tsx` | Add "Do wagi" button with X styling + success animation |
| Modify | `app/components/meals/MealDashboard.tsx` | Pass new `onSendToTracker` prop to MealCard |
| Modify | `app/components/meals/MealsMode.tsx` | Wire up `pushMealToWeightEntry` handler, add toast state |
| Modify | `app/components/meals/useMeals.ts` | Refactor `syncToTracker` to use bridge, export `MEAL_TYPE_MAP` |
| Modify | `app/components/tracker/EntryModal.tsx` | Add "Importuj z posiłków" button + import selection UI |

---

### Task 1: Create `lib/mealTrackerBridge.ts`

**Files:**
- Create: `lib/mealTrackerBridge.ts`

- [ ] **Step 1: Create the bridge module**

```typescript
// lib/mealTrackerBridge.ts
import { supabase } from '@/lib/supabase';
import type { MealPlan } from '@/app/components/meals/types';
import type { Meal, MealType } from '@/app/components/tracker/types';

const MEAL_TYPE_MAP: Record<string, MealType> = {
  'Śniadanie': 'Śniadanie',
  'II Śniadanie': 'II Śniadanie',
  'Obiad': 'Obiad',
  'Kolacja': 'Kolacja',
  'Przekąska': 'Przekąska',
};

export function mealPlanToTrackerMeal(meal: MealPlan): Meal {
  return {
    id: crypto.randomUUID(),
    name: meal.name,
    type: MEAL_TYPE_MAP[meal.meal_slot] || 'Przekąska',
    calories: Math.round(meal.calories),
    protein: Math.round(meal.protein),
    carbs: Math.round(meal.carbs),
    fat: Math.round(meal.fat),
  };
}

export async function pushMealToWeightEntry(
  userId: string,
  date: string,
  meal: MealPlan
): Promise<{ success: boolean; error?: 'no_entry' | 'duplicate' | 'supabase_error' }> {
  if (!supabase) return { success: false, error: 'supabase_error' };

  // Check if entry exists for this date
  const { data: existing, error: fetchError } = await supabase
    .from('entries')
    .select('id, meals')
    .eq('user_id', userId)
    .eq('date', date)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'no_entry' };
  }

  // Check for duplicate by name
  const currentMeals = (existing.meals as Meal[]) || [];
  if (currentMeals.some(m => m.name === meal.name)) {
    return { success: false, error: 'duplicate' };
  }

  // Append meal and recalculate calories
  const trackerMeal = mealPlanToTrackerMeal(meal);
  const updatedMeals = [...currentMeals, trackerMeal];
  const totalCalories = updatedMeals.reduce((s, m) => s + (m.calories || 0), 0);

  const { error: updateError } = await supabase
    .from('entries')
    .update({
      meals: updatedMeals,
      calories: totalCalories,
      updated_at: new Date().toISOString(),
    })
    .eq('id', existing.id);

  if (updateError) return { success: false, error: 'supabase_error' };
  return { success: true };
}

export async function fetchMealPlansForDate(
  userId: string,
  date: string
): Promise<MealPlan[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('date', date)
    .in('status', ['accepted', 'eaten']);

  if (error || !data) return [];
  return data as MealPlan[];
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit lib/mealTrackerBridge.ts 2>&1 | head -20`
Expected: No errors (or only unrelated ones)

- [ ] **Step 3: Commit**

```bash
git add lib/mealTrackerBridge.ts
git commit -m "feat: add mealTrackerBridge utility for meal-to-entry sync"
```

---

### Task 2: Create Toast component

**Files:**
- Create: `app/components/ui/Toast.tsx`

The app has no toast system. Need a minimal one for bridge feedback.

- [ ] **Step 1: Create Toast component**

```tsx
// app/components/ui/Toast.tsx
"use client";

import { useEffect, useState } from 'react';
import { Check, AlertTriangle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 150);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-4 py-3 rounded-full shadow-lg transition-all duration-150 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      } ${
        type === 'success'
          ? 'bg-green-600 text-white'
          : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success'
        ? <Check className="w-[18px] h-[18px]" strokeWidth={1.5} />
        : <AlertTriangle className="w-[18px] h-[18px]" strokeWidth={1.5} />}
      <span className="text-[13px] font-bold">{message}</span>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/ui/Toast.tsx
git commit -m "feat: add lightweight Toast component"
```

---

### Task 3: Add "Do wagi" button to MealCard

**Files:**
- Modify: `app/components/meals/MealCard.tsx:8-21` (props interface, add `onSendToTracker`)
- Modify: `app/components/meals/MealCard.tsx:166-222` (action buttons section)

- [ ] **Step 1: Add new prop and state to MealCard**

In `MealCard.tsx`:

Add import at line 5:
```tsx
import { ChevronDown, ChevronUp, Star, RefreshCw, Check, X, Heart, Pencil, Plus, Trash2, Loader2, Warehouse, ArrowUpFromLine } from 'lucide-react';
```

Add prop to interface (line 8-19):
```typescript
interface MealCardProps {
  meal: MealPlan;
  onRate: (id: string, rating: number, comment: string) => void;
  onReplace: (meal: MealPlan) => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onMarkEaten: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onUpdateIngredients: (id: string, ingredients: MealIngredient[]) => void;
  onSendToTracker?: (meal: MealPlan) => Promise<{ success: boolean; error?: string }>;
  onNutritionLookup?: (index: number, name: string, amount: number, unit: PantryUnit, onResult: (index: number, data: { calories: number; protein: number; carbs: number; fat: number }) => void) => void;
  nutritionLoading?: Set<number>;
}
```

Destructure in component (line 21):
```tsx
export default function MealCard({ meal, onRate, onReplace, onAccept, onReject, onMarkEaten, onToggleFavorite, onUpdateIngredients, onSendToTracker, onNutritionLookup, nutritionLoading }: MealCardProps) {
```

Add state after line 26:
```tsx
const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
```

- [ ] **Step 2: Add the "Do wagi" button in the action buttons section**

After the "Zamień" button (line 216) and before the expand chevron button (line 218), add:

```tsx
{onSendToTracker && (meal.status === 'accepted' || meal.status === 'eaten') && (
  <button
    onClick={async () => {
      if (sendStatus !== 'idle') return;
      setSendStatus('sending');
      const result = await onSendToTracker(meal);
      if (result.success) {
        setSendStatus('sent');
        setTimeout(() => setSendStatus('idle'), 2000);
      } else {
        setSendStatus('idle');
      }
    }}
    disabled={sendStatus === 'sending'}
    className={`flex items-center gap-1.5 px-3 py-1 text-[13px] font-bold rounded-full transition-all duration-150 active:scale-95 ${
      sendStatus === 'sent'
        ? 'bg-green-500/20 text-green-500'
        : 'bg-[#1d9bf0]/10 text-[#1d9bf0] hover:bg-[#1d9bf0]/20'
    }`}
  >
    {sendStatus === 'sent' ? (
      <Check className="w-[18px] h-[18px] animate-[scaleIn_150ms_ease-out]" strokeWidth={1.5} />
    ) : sendStatus === 'sending' ? (
      <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
    ) : (
      <ArrowUpFromLine className="w-[18px] h-[18px]" strokeWidth={1.5} />
    )}
    {sendStatus === 'sent' ? 'Wysłano' : 'Do wagi'}
  </button>
)}
```

- [ ] **Step 3: Add CSS keyframe for scaleIn animation**

In `app/globals.css`, add:
```css
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.75); }
  to { opacity: 1; transform: scale(1); }
}
```

- [ ] **Step 4: Verify it renders without errors**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add app/components/meals/MealCard.tsx app/globals.css
git commit -m "feat: add 'Do wagi' button on MealCard with X-style animation"
```

---

### Task 4: Wire up MealDashboard and MealsMode

**Files:**
- Modify: `app/components/meals/MealDashboard.tsx` (pass `onSendToTracker` prop to MealCard)
- Modify: `app/components/meals/MealsMode.tsx` (create handler using bridge, add toast)

- [ ] **Step 1: Add prop to MealDashboard**

Read `MealDashboard.tsx` to find the interface and where MealCard is rendered. Add `onSendToTracker` to its props interface and pass through to each `<MealCard>`.

The prop type:
```typescript
onSendToTracker?: (meal: MealPlan) => Promise<{ success: boolean; error?: string }>;
```

- [ ] **Step 2: Create handler in MealsMode.tsx**

Add imports at top of `MealsMode.tsx`:
```tsx
import { pushMealToWeightEntry } from '@/lib/mealTrackerBridge';
import Toast from '@/app/components/ui/Toast';
```

Add toast state:
```tsx
const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
```

Add handler:
```tsx
const handleSendToTracker = async (meal: MealPlan): Promise<{ success: boolean; error?: string }> => {
  if (!user?.id) return { success: false, error: 'no_user' };
  const result = await pushMealToWeightEntry(user.id, meal.date, meal);
  if (result.success) {
    setToast({ message: 'Wysłano do wpisu wagi', type: 'success' });
  } else if (result.error === 'no_entry') {
    setToast({ message: 'Najpierw dodaj wpis wagi na ten dzień', type: 'error' });
  } else if (result.error === 'duplicate') {
    setToast({ message: 'Ten posiłek już jest we wpisie wagi', type: 'error' });
  }
  return result;
};
```

Pass to MealDashboard:
```tsx
<MealDashboard ... onSendToTracker={handleSendToTracker} />
```

Add Toast render at end of component JSX:
```tsx
{toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add app/components/meals/MealDashboard.tsx app/components/meals/MealsMode.tsx
git commit -m "feat: wire up 'Do wagi' button with bridge and toast feedback"
```

---

### Task 5: Refactor `syncToTracker` in `useMeals.ts` to use bridge

**Files:**
- Modify: `app/components/meals/useMeals.ts:288-331`

- [ ] **Step 1: Replace syncToTracker with bridge call**

Replace lines 288-331 in `useMeals.ts`:

```typescript
// ── Sync eaten meal to tracker entries ──
const syncToTracker = useCallback(async (meal: MealPlan) => {
  if (!userId || !supabase) return;

  const result = await pushMealToWeightEntry(userId, meal.date, meal);

  // If no entry exists, create one with placeholder weight (existing behavior)
  if (!result.success && result.error === 'no_entry') {
    const trackerMeal = mealPlanToTrackerMeal(meal);
    await supabase
      .from('entries')
      .insert({
        user_id: userId,
        date: meal.date,
        weight: 0,
        calories: Math.round(meal.calories),
        meals: [trackerMeal],
      });
  }
}, [userId]);
```

Add import at top of file:
```typescript
import { pushMealToWeightEntry, mealPlanToTrackerMeal } from '@/lib/mealTrackerBridge';
```

Remove the local `MEAL_TYPE_MAP` constant (lines 9-15) since it now lives in the bridge.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add app/components/meals/useMeals.ts
git commit -m "refactor: use mealTrackerBridge in syncToTracker"
```

---

### Task 6: Add "Importuj z posiłków" to EntryModal

**Files:**
- Modify: `app/components/tracker/EntryModal.tsx:2-5` (imports)
- Modify: `app/components/tracker/EntryModal.tsx:7-15` (props interface)
- Modify: `app/components/tracker/EntryModal.tsx:371-379` (after meal cards, before "Dodaj posiłek")

- [ ] **Step 1: Add props and state for import**

Add to imports (line 4):
```tsx
import { X, Scale, Flame, Footprints, Dumbbell, UtensilsCrossed, Trash2, AlertTriangle, Plus, Download, Check as CheckIcon } from 'lucide-react';
```

Add import:
```tsx
import { fetchMealPlansForDate, mealPlanToTrackerMeal } from '@/lib/mealTrackerBridge';
import type { MealPlan } from '@/app/components/meals/types';
```

Add to EntryModalProps interface:
```typescript
userId?: string;
```

Destructure `userId` in component params.

Add state inside component:
```tsx
const [showImportPicker, setShowImportPicker] = useState(false);
const [availableMealPlans, setAvailableMealPlans] = useState<MealPlan[]>([]);
const [selectedImports, setSelectedImports] = useState<Set<string>>(new Set());
const [importLoading, setImportLoading] = useState(false);
```

- [ ] **Step 2: Add import handler functions**

```tsx
const handleOpenImport = async () => {
  if (!userId) return;
  setImportLoading(true);
  const plans = await fetchMealPlansForDate(userId, date);
  setAvailableMealPlans(plans);
  setSelectedImports(new Set());
  setShowImportPicker(true);
  setImportLoading(false);
};

const handleImportSelected = () => {
  const newMeals = availableMealPlans
    .filter(mp => selectedImports.has(mp.id))
    .map(mp => mealPlanToTrackerMeal(mp));
  setMeals(prev => [...prev, ...newMeals]);
  setShowImportPicker(false);
};

const isMealAlreadyImported = (mealPlan: MealPlan) =>
  meals.some(m => m.name === mealPlan.name);

const toggleImportSelection = (id: string) => {
  setSelectedImports(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
};
```

- [ ] **Step 3: Add "Importuj z posiłków" button next to "Dodaj posiłek"**

Replace the "Dodaj posiłek" button section (lines 372-379) with:

```tsx
<div className="flex gap-2 mt-2">
  <button
    type="button"
    onClick={addMeal}
    className="flex-1 py-2 px-4 bg-[var(--card-bg)] hover:bg-[var(--surface)] text-[var(--foreground)] rounded-xl border-2 border-dashed border-[var(--card-border)] hover:border-amber-500 transition-colors flex items-center justify-center gap-2"
  >
    <Plus className="w-4 h-4" />
    Dodaj posiłek
  </button>
  {userId && (
    <button
      type="button"
      onClick={handleOpenImport}
      disabled={importLoading}
      className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold rounded-full bg-[#1d9bf0]/10 text-[#1d9bf0] hover:bg-[#1d9bf0]/20 transition-colors duration-150 active:scale-95 disabled:opacity-50"
    >
      <Download className="w-[18px] h-[18px]" strokeWidth={1.5} />
      Importuj
    </button>
  )}
</div>
```

- [ ] **Step 4: Add import selection dropdown**

After the buttons div from step 3, add:

```tsx
{showImportPicker && (
  <div className="mt-2 bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl overflow-hidden">
    {availableMealPlans.length === 0 ? (
      <p className="p-4 text-sm text-[var(--muted)] text-center">Brak posiłków na ten dzień</p>
    ) : (
      <>
        {availableMealPlans.map(mp => {
          const alreadyImported = isMealAlreadyImported(mp);
          const isSelected = selectedImports.has(mp.id);
          return (
            <button
              key={mp.id}
              type="button"
              disabled={alreadyImported}
              onClick={() => toggleImportSelection(mp.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                alreadyImported ? 'opacity-40 cursor-not-allowed' : ''
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                alreadyImported
                  ? 'border-[var(--muted)]/30 bg-[var(--muted)]/10'
                  : isSelected
                    ? 'border-[#1d9bf0] bg-[#1d9bf0]'
                    : 'border-[var(--card-border)]'
              }`}>
                {(isSelected || alreadyImported) && (
                  <CheckIcon className="w-3 h-3 text-white" strokeWidth={2.5} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[var(--muted)] uppercase">{mp.meal_slot}</span>
                  {alreadyImported && <span className="text-[10px] text-green-500">Dodano</span>}
                </div>
                <p className="text-sm text-white font-medium truncate">{mp.name}</p>
              </div>
              <span className="text-xs text-[var(--muted)] shrink-0">{Math.round(mp.calories)} kcal</span>
            </button>
          );
        })}
        <div className="flex gap-2 p-3 border-t border-[var(--card-border)]">
          <button
            type="button"
            onClick={() => setShowImportPicker(false)}
            className="flex-1 py-2 text-sm text-[var(--foreground)] bg-[var(--surface)] rounded-full hover:bg-[var(--card-border)] transition-colors"
          >
            Anuluj
          </button>
          <button
            type="button"
            onClick={handleImportSelected}
            disabled={selectedImports.size === 0}
            className="flex-1 py-2 text-sm font-bold text-white bg-[#1d9bf0] rounded-full hover:bg-[#1a8cd8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Importuj ({selectedImports.size})
          </button>
        </div>
      </>
    )}
  </div>
)}
```

- [ ] **Step 5: Pass `userId` prop from WeightTracker to EntryModal**

Read `app/components/WeightTracker.tsx` to find where `<EntryModal>` is rendered and add `userId={user?.id}` prop. The user comes from `useAuth()` which is already imported in WeightTracker.

- [ ] **Step 6: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 7: Commit**

```bash
git add app/components/tracker/EntryModal.tsx app/components/WeightTracker.tsx
git commit -m "feat: add 'Importuj z posiłków' button to EntryModal with selection picker"
```

---

### Task 7: Manual QA verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify "Do wagi" button appears on accepted/eaten meal cards**

- Navigate to Meals module
- Find an accepted or eaten meal
- Verify "Do wagi" button appears with X-style blue pill shape
- Click it — should show "Wysłano" with green check animation (if entry exists for that day)
- Click it when no entry exists — should show error toast

- [ ] **Step 3: Verify import in EntryModal**

- Navigate to Weight tracker
- Open an existing entry for a day that has meals in the Meals module
- Click "Importuj" button
- Verify meal selection picker appears with correct meals
- Select meals and click "Importuj" — verify they appear in the form
- Verify already-imported meals show "Dodano" and are not selectable

- [ ] **Step 4: Commit any fixes needed**
