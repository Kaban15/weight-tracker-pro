# Meals: Auto Macro Calculation & Pantry Cost Estimation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-calculate macros via Gemini when ingredients are added/edited, and show estimated cost from pantry immediately (not only after "Zjedzony").

**Architecture:** Three changes: (1) Fix AI prompt + add zero-macro validation, (2) New `/api/meals/nutrition` route + `useNutritionLookup` hook with debounce + localStorage cache, (3) New `estimateCost()` in `usePantry` called on meal create/edit. MealCard gets loading spinners per ingredient and "brak ceny" labels.

**Tech Stack:** Next.js API route, Gemini 2.0 Flash (OpenAI-compatible SDK), Zod, React hooks, localStorage

**Spec:** `docs/superpowers/specs/2026-04-02-meals-macro-cost-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `app/components/meals/types.ts` | Add zero-calorie whitelist, nutrition schema |
| Modify | `app/components/meals/constants.ts` | Add `ZERO_CALORIE_INGREDIENTS` constant |
| Modify | `app/components/meals/useMealAI.ts` | Strengthen prompt, add post-response zero-macro validation |
| Create | `app/api/meals/nutrition/route.ts` | Gemini nutrition lookup endpoint |
| Create | `app/components/meals/useNutritionLookup.ts` | Hook: debounced Gemini lookup + localStorage cache |
| Modify | `app/components/meals/usePantry.ts` | Add `estimateCost()` function |
| Modify | `app/components/meals/MealCard.tsx` | Integrate nutrition lookup on edit, show cost/brak ceny |
| Modify | `app/components/meals/MealDashboard.tsx` | Pass `estimateCost` down, recalc on pantry change |
| Modify | `app/components/meals/MealsMode.tsx` | Wire `estimateCost` into meal creation + edit flows |
| Create | `__tests__/nutritionLookup.test.ts` | Tests for cache, debounce, normalization |
| Create | `__tests__/estimateCost.test.ts` | Tests for pantry cost estimation |

---

### Task 1: Add zero-calorie whitelist and nutrition Zod schema

**Files:**
- Modify: `app/components/meals/constants.ts`
- Modify: `app/components/meals/types.ts`

- [ ] **Step 1: Add ZERO_CALORIE_INGREDIENTS to constants.ts**

Add after line 23 in `app/components/meals/constants.ts`:

```typescript
/** Ingredients that legitimately have ~0 calories — don't flag as AI error */
export const ZERO_CALORIE_INGREDIENTS = [
  'woda', 'sól', 'sol', 'pieprz', 'ocet', 'herbata', 'kawa',
  'przyprawy', 'cynamon', 'kurkuma', 'papryka ostra', 'imbir',
  'bazylia', 'oregano', 'tymianek', 'rozmaryn', 'liść laurowy',
  'czosnek suszony', 'pieprz cayenne',
];
```

- [ ] **Step 2: Add nutritionSchema to types.ts**

Add after line 133 in `app/components/meals/types.ts`:

```typescript
/** Schema for Gemini nutrition lookup response */
export const nutritionSchema = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export type NutritionData = z.infer<typeof nutritionSchema>;
```

- [ ] **Step 3: Commit**

```bash
git add app/components/meals/constants.ts app/components/meals/types.ts
git commit -m "feat(meals): add zero-calorie whitelist and nutrition schema"
```

---

### Task 2: Fix AI prompt and add zero-macro validation

**Files:**
- Modify: `app/components/meals/useMealAI.ts`

- [ ] **Step 1: Strengthen system prompt**

In `app/components/meals/useMealAI.ts`, in the `buildSystemPrompt` function, add to the `Zasady` section (after line 77):

```typescript
    '- KRYTYCZNE: Każdy składnik MUSI mieć realistyczne, NIEZEROWE wartości kcal, białka, węglowodanów i tłuszczów. NIGDY nie zwracaj zer (wyjątek: woda, sól, pieprz, przyprawy).',
    '- Przykład: pierś z kurczaka 500g ≈ 550 kcal, 103g białka, 0g węgli, 12g tłuszczu. Ryż 100g ≈ 130 kcal, 2.7g białka, 28g węgli, 0.3g tłuszczu.',
```

- [ ] **Step 2: Add post-response validation with retry**

In `useMealAI.ts`, add import at top:

```typescript
import { ZERO_CALORIE_INGREDIENTS } from './constants';
```

Then add a validation helper function before `useMealAI`:

```typescript
function hasZeroMacroIngredients(meals: Array<{ ingredients: Array<{ name: string; calories: number }> }>): boolean {
  for (const meal of meals) {
    for (const ing of meal.ingredients) {
      const isZeroCal = ZERO_CALORIE_INGREDIENTS.some(z =>
        ing.name.toLowerCase().includes(z)
      );
      if (!isZeroCal && ing.calories === 0) return true;
    }
  }
  return false;
}
```

In the `sendMessage` callback, after getting the parsed response (after `return data;` on line ~145), add retry logic:

```typescript
      // Validate macros — retry once if AI returned zeros
      if (mode === 'chat' && data.meals && hasZeroMacroIngredients(data.meals)) {
        const retryMessages = [
          ...apiMessages,
          { role: 'assistant' as const, content: JSON.stringify(data) },
          { role: 'user' as const, content: 'Błąd: składniki mają 0 kcal. Przelicz ponownie wartości odżywcze dla KAŻDEGO składnika. Użyj realistycznych wartości.' },
        ];
        const retryRes = await fetch('/api/meals/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ messages: retryMessages, systemPrompt, mode }),
        });
        if (retryRes.ok) {
          const { data: retryData } = await retryRes.json();
          if (retryData && !hasZeroMacroIngredients(retryData.meals || [])) {
            return retryData;
          }
        }
      }
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add app/components/meals/useMealAI.ts
git commit -m "fix(meals): strengthen AI prompt and add zero-macro retry validation"
```

---

### Task 3: Create nutrition lookup API route

**Files:**
- Create: `app/api/meals/nutrition/route.ts`

- [ ] **Step 1: Create the API route**

Create `app/api/meals/nutrition/route.ts`:

```typescript
// app/api/meals/nutrition/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/serverRateLimiter';
import { nutritionSchema } from '@/app/components/meals/types';
import { zodResponseFormat } from 'openai/helpers/zod';

const NUTRITION_RATE_LIMIT = { maxRequests: 60, windowMs: 86400000 } as const; // 60/day

function getAIClient() {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return {
      client: new OpenAI({
        apiKey: geminiKey,
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
      }),
      model: 'gemini-2.0-flash',
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      client: new OpenAI({ apiKey: openaiKey }),
      model: 'gpt-4o-mini',
    };
  }

  throw new Error('No AI API key configured (GEMINI_API_KEY or OPENAI_API_KEY)');
}

export async function POST(request: NextRequest) {
  const { allowed, remaining, resetTime } = checkRateLimit(request, NUTRITION_RATE_LIMIT);
  const rateLimitHeaders = getRateLimitHeaders(remaining, resetTime, NUTRITION_RATE_LIMIT.maxRequests);

  if (!allowed) {
    return NextResponse.json(
      { error: 'Przekroczono dzienny limit zapytań. Spróbuj jutro.' },
      { status: 429, headers: Object.fromEntries(rateLimitHeaders.entries()) }
    );
  }

  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Brak autoryzacji' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: userData, error: authError } = await supabaseAnon.auth.getUser(token);
    if (authError || !userData.user) {
      return NextResponse.json({ error: 'Nieprawidłowy token' }, { status: 401 });
    }

    const { name, amount, unit } = await request.json();
    if (!name || !amount || !unit) {
      return NextResponse.json({ error: 'Brak wymaganych pól: name, amount, unit' }, { status: 400 });
    }

    const { client, model } = getAIClient();

    const response = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'Jesteś ekspertem od wartości odżywczych. Podaj dokładne wartości odżywcze dla podanego produktu spożywczego. Wartości muszą być realistyczne i niezerowe (chyba że to woda/przyprawy). Odpowiadaj w formacie JSON.',
        },
        {
          role: 'user',
          content: `Podaj wartości odżywcze dla: ${name} — ${amount} ${unit}. Zwróć: calories (kcal), protein (g), carbs (g), fat (g).`,
        },
      ],
      response_format: zodResponseFormat(nutritionSchema, 'nutrition_response'),
      temperature: 0.3,
      max_tokens: 200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ error: 'Brak odpowiedzi AI' }, { status: 500 });
    }

    const parsed = nutritionSchema.parse(JSON.parse(content));

    return NextResponse.json({ data: parsed }, {
      headers: Object.fromEntries(rateLimitHeaders.entries()),
    });
  } catch (error) {
    console.error('Nutrition lookup error:', error);
    return NextResponse.json(
      { error: 'Błąd podczas wyliczania wartości odżywczych' },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Verify build compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 3: Commit**

```bash
git add app/api/meals/nutrition/route.ts
git commit -m "feat(meals): add Gemini nutrition lookup API route"
```

---

### Task 4: Create useNutritionLookup hook with debounce and cache

**Files:**
- Create: `app/components/meals/useNutritionLookup.ts`
- Create: `__tests__/nutritionLookup.test.ts`

- [ ] **Step 1: Write tests for cache and normalization logic**

Create `__tests__/nutritionLookup.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import {
  getCachedNutrition,
  setCachedNutrition,
  clearNutritionCache,
  scaleNutrition,
} from '../app/components/meals/nutritionCache';

beforeEach(() => {
  clearNutritionCache();
});

describe('nutritionCache', () => {
  it('returns null for uncached items', () => {
    expect(getCachedNutrition('kurczak', 'g')).toBeNull();
  });

  it('stores and retrieves normalized values (per 100g)', () => {
    setCachedNutrition('kurczak', 'g', {
      calories: 110, protein: 23, carbs: 0, fat: 1.3,
    });
    const cached = getCachedNutrition('kurczak', 'g');
    expect(cached).toEqual({ calories: 110, protein: 23, carbs: 0, fat: 1.3 });
  });

  it('scales nutrition from per-100 base', () => {
    const base = { calories: 110, protein: 23, carbs: 0, fat: 1.3 };
    const scaled = scaleNutrition(base, 500, 'g');
    expect(scaled.calories).toBeCloseTo(550);
    expect(scaled.protein).toBeCloseTo(115);
  });

  it('scales for szt unit (base = per 1 szt)', () => {
    const base = { calories: 70, protein: 6, carbs: 0.5, fat: 5 };
    const scaled = scaleNutrition(base, 4, 'szt');
    expect(scaled.calories).toBeCloseTo(280);
    expect(scaled.protein).toBeCloseTo(24);
  });

  it('ignores expired cache entries (TTL 30 days)', () => {
    // Manually set with old timestamp
    const key = 'nutrition:mleko:ml';
    const entry = {
      data: { calories: 42, protein: 3.4, carbs: 5, fat: 1 },
      timestamp: Date.now() - 31 * 24 * 60 * 60 * 1000,
    };
    localStorage.setItem(key, JSON.stringify(entry));
    expect(getCachedNutrition('mleko', 'ml')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- __tests__/nutritionLookup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create nutritionCache utility**

Create `app/components/meals/nutritionCache.ts`:

```typescript
// app/components/meals/nutritionCache.ts
import type { NutritionData } from './types';
import type { PantryUnit } from './types';

const CACHE_PREFIX = 'nutrition:';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  data: NutritionData;  // Normalized: per 100g/100ml or per 1 szt
  timestamp: number;
}

function cacheKey(name: string, unit: PantryUnit): string {
  return `${CACHE_PREFIX}${name.toLowerCase().trim()}:${unit}`;
}

export function getCachedNutrition(name: string, unit: PantryUnit): NutritionData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(cacheKey(name, unit));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(name, unit));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCachedNutrition(name: string, unit: PantryUnit, normalizedData: NutritionData): void {
  if (typeof window === 'undefined') return;
  try {
    const entry: CacheEntry = { data: normalizedData, timestamp: Date.now() };
    localStorage.setItem(cacheKey(name, unit), JSON.stringify(entry));
  } catch {
    // localStorage full — ignore
  }
}

/** Scale normalized nutrition (per 100g/ml or 1 szt) to actual amount */
export function scaleNutrition(base: NutritionData, amount: number, unit: PantryUnit): NutritionData {
  const divisor = unit === 'szt' ? 1 : 100;
  const factor = amount / divisor;
  return {
    calories: Math.round(base.calories * factor * 10) / 10,
    protein: Math.round(base.protein * factor * 10) / 10,
    carbs: Math.round(base.carbs * factor * 10) / 10,
    fat: Math.round(base.fat * factor * 10) / 10,
  };
}

export function clearNutritionCache(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- __tests__/nutritionLookup.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Create useNutritionLookup hook**

Create `app/components/meals/useNutritionLookup.ts`:

```typescript
// app/components/meals/useNutritionLookup.ts
"use client";

import { useState, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import type { NutritionData, PantryUnit } from './types';
import { getCachedNutrition, setCachedNutrition, scaleNutrition } from './nutritionCache';

const DEBOUNCE_MS = 800;

export function useNutritionLookup() {
  const { session } = useAuth();
  const [loadingIngredients, setLoadingIngredients] = useState<Set<number>>(new Set());
  const debounceTimers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const lookupNutrition = useCallback(async (
    name: string,
    amount: number,
    unit: PantryUnit,
  ): Promise<NutritionData | null> => {
    if (!name.trim() || amount <= 0) return null;

    // Check cache first
    const cached = getCachedNutrition(name, unit);
    if (cached) {
      return scaleNutrition(cached, amount, unit);
    }

    if (!session?.access_token) return null;

    try {
      const res = await fetch('/api/meals/nutrition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, amount, unit }),
      });

      if (!res.ok) return null;

      const { data } = await res.json();
      if (!data) return null;

      // Normalize and cache: store per 100g/100ml or per 1 szt
      const divisor = unit === 'szt' ? amount : amount / 100;
      const normalized: NutritionData = {
        calories: Math.round((data.calories / divisor) * 10) / 10,
        protein: Math.round((data.protein / divisor) * 10) / 10,
        carbs: Math.round((data.carbs / divisor) * 10) / 10,
        fat: Math.round((data.fat / divisor) * 10) / 10,
      };
      setCachedNutrition(name, unit, normalized);

      return data as NutritionData;
    } catch {
      return null;
    }
  }, [session?.access_token]);

  /** Debounced lookup for ingredient at given index */
  const debouncedLookup = useCallback((
    index: number,
    name: string,
    amount: number,
    unit: PantryUnit,
    onResult: (index: number, data: NutritionData) => void,
  ) => {
    // Clear existing timer for this index
    const existing = debounceTimers.current.get(index);
    if (existing) clearTimeout(existing);

    // Check cache synchronously — no debounce needed
    const cached = getCachedNutrition(name, unit);
    if (cached) {
      onResult(index, scaleNutrition(cached, amount, unit));
      return;
    }

    // Debounce the API call
    const timer = setTimeout(async () => {
      setLoadingIngredients(prev => new Set(prev).add(index));
      const result = await lookupNutrition(name, amount, unit);
      setLoadingIngredients(prev => {
        const next = new Set(prev);
        next.delete(index);
        return next;
      });
      if (result) onResult(index, result);
    }, DEBOUNCE_MS);

    debounceTimers.current.set(index, timer);
  }, [lookupNutrition]);

  /** Quick recalc from cache when only amount changes */
  const recalcFromCache = useCallback((
    name: string,
    amount: number,
    unit: PantryUnit,
  ): NutritionData | null => {
    const cached = getCachedNutrition(name, unit);
    if (!cached) return null;
    return scaleNutrition(cached, amount, unit);
  }, []);

  return {
    debouncedLookup,
    recalcFromCache,
    lookupNutrition,
    loadingIngredients,
  };
}
```

- [ ] **Step 6: Commit**

```bash
git add app/components/meals/nutritionCache.ts app/components/meals/useNutritionLookup.ts __tests__/nutritionLookup.test.ts
git commit -m "feat(meals): add nutrition lookup hook with debounce and localStorage cache"
```

---

### Task 5: Add estimateCost to usePantry

**Files:**
- Modify: `app/components/meals/usePantry.ts`
- Create: `__tests__/estimateCost.test.ts`

- [ ] **Step 1: Write tests for estimateCost**

Create `__tests__/estimateCost.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { estimateCostFromPantry } from '../app/components/meals/costUtils';
import type { MealIngredient, PantryItem } from '../app/components/meals/types';

const makePantryItem = (overrides: Partial<PantryItem>): PantryItem => ({
  id: '1', user_id: 'u1', name: 'kurczak', quantity_total: 1000,
  quantity_remaining: 800, unit: 'g', price: 30, purchased_at: '2026-04-01',
  created_at: '2026-04-01', updated_at: '2026-04-01',
  ...overrides,
});

const makeIngredient = (overrides: Partial<MealIngredient>): MealIngredient => ({
  name: 'kurczak', amount: 500, unit: 'g',
  calories: 550, protein: 103, carbs: 0, fat: 12, cost: null,
  ...overrides,
});

describe('estimateCostFromPantry', () => {
  it('calculates cost for matching pantry item', () => {
    const items = [makePantryItem({})];
    const ingredients = [makeIngredient({})];
    const result = estimateCostFromPantry(ingredients, items);
    // 30 zł / 1000g * 500g = 15.00
    expect(result.totalCost).toBe(15);
    expect(result.costs.get('kurczak')).toBe(15);
  });

  it('returns null cost for missing pantry item', () => {
    const result = estimateCostFromPantry(
      [makeIngredient({ name: 'ryż' })],
      [makePantryItem({})]
    );
    expect(result.totalCost).toBe(0);
    expect(result.costs.get('ryż')).toBeNull();
  });

  it('ignores pantry items with 0 remaining', () => {
    const items = [makePantryItem({ quantity_remaining: 0 })];
    const result = estimateCostFromPantry([makeIngredient({})], items);
    expect(result.costs.get('kurczak')).toBeNull();
  });

  it('requires matching unit', () => {
    const items = [makePantryItem({ unit: 'ml' })];
    const result = estimateCostFromPantry([makeIngredient({ unit: 'g' })], items);
    expect(result.costs.get('kurczak')).toBeNull();
  });

  it('handles multiple ingredients', () => {
    const items = [
      makePantryItem({ name: 'kurczak', price: 30, quantity_total: 1000 }),
      makePantryItem({ id: '2', name: 'ryż', price: 5, quantity_total: 1000, unit: 'g' }),
    ];
    const ingredients = [
      makeIngredient({ name: 'pierś z kurczaka', amount: 500 }),
      makeIngredient({ name: 'ryż', amount: 100 }),
    ];
    const result = estimateCostFromPantry(ingredients, items);
    // kurczak: 30/1000*500=15, ryż: 5/1000*100=0.50
    expect(result.totalCost).toBe(15.5);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- __tests__/estimateCost.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Create costUtils with estimateCostFromPantry**

Create `app/components/meals/costUtils.ts`:

```typescript
// app/components/meals/costUtils.ts
import type { MealIngredient, PantryItem } from './types';

export function estimateCostFromPantry(
  ingredients: MealIngredient[],
  pantryItems: PantryItem[],
): { costs: Map<string, number | null>; totalCost: number } {
  let totalCost = 0;
  const costs = new Map<string, number | null>();

  for (const ing of ingredients) {
    const pantryItem = pantryItems.find(p =>
      p.unit === ing.unit &&
      p.quantity_remaining > 0 &&
      p.name.toLowerCase().includes(ing.name.toLowerCase())
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- __tests__/estimateCost.test.ts`
Expected: All 5 tests PASS

- [ ] **Step 5: Add estimateCost to usePantry hook**

In `app/components/meals/usePantry.ts`, add import at top:

```typescript
import { estimateCostFromPantry } from './costUtils';
```

Add before `useEffect` (before line 116):

```typescript
  /** Estimate cost from pantry without deducting — for preview display */
  const estimateCost = useCallback((ingredients: MealIngredient[]) => {
    return estimateCostFromPantry(ingredients, items);
  }, [items]);
```

Add `estimateCost` to the return object (line 125):

```typescript
  return { items, isLoading, addItem, updateItem, deleteItem, deductIngredients, estimateCost, loadItems };
```

- [ ] **Step 6: Commit**

```bash
git add app/components/meals/costUtils.ts app/components/meals/usePantry.ts __tests__/estimateCost.test.ts
git commit -m "feat(meals): add pantry cost estimation without deduction"
```

---

### Task 6: Integrate nutrition lookup into MealCard editing

**Files:**
- Modify: `app/components/meals/MealCard.tsx`

- [ ] **Step 1: Add nutrition lookup to MealCard**

In `app/components/meals/MealCard.tsx`:

Add to imports (line 3):

```typescript
import { Loader2 } from 'lucide-react';
```

Add new prop to `MealCardProps` interface (after line 16):

```typescript
  onNutritionLookup?: (index: number, name: string, amount: number, unit: PantryUnit, onResult: (index: number, data: { calories: number; protein: number; carbs: number; fat: number }) => void) => void;
  nutritionLoading?: Set<number>;
```

Add state for manual override tracking inside the component (after line 25):

```typescript
  const [manualOverride, setManualOverride] = useState<Set<number>>(new Set());
```

Update `updateIngredientField` function (replace lines 63-67) to trigger nutrition lookup on name change:

```typescript
  const updateIngredientField = (index: number, field: keyof MealIngredient, value: string | number) => {
    setEditedIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, [field]: value } : ing
    ));

    // If user manually edits a macro field, mark as override
    if (['calories', 'protein', 'carbs', 'fat'].includes(field)) {
      setManualOverride(prev => new Set(prev).add(index));
      return;
    }

    // Trigger nutrition lookup on name or unit change (if not manually overridden)
    if ((field === 'name' || field === 'unit') && !manualOverride.has(index) && onNutritionLookup) {
      const ing = { ...editedIngredients[index], [field]: value };
      if (ing.name.trim() && ing.amount > 0) {
        onNutritionLookup(index, ing.name, ing.amount, ing.unit, handleNutritionResult);
      }
    }
  };

  const handleNutritionResult = (index: number, data: { calories: number; protein: number; carbs: number; fat: number }) => {
    setEditedIngredients(prev => prev.map((ing, i) =>
      i === index ? { ...ing, ...data } : ing
    ));
  };
```

Update `handleAmountChange` (replace lines 44-61) to use cache or trigger lookup:

```typescript
  const handleAmountChange = (index: number, newAmount: number) => {
    const ing = editedIngredients[index];
    if (!ing || newAmount <= 0) return;

    // Update amount immediately
    setEditedIngredients(prev => prev.map((item, i) =>
      i === index ? { ...item, amount: newAmount } : item
    ));

    // If not manually overridden, lookup/recalc macros
    if (!manualOverride.has(index) && onNutritionLookup) {
      onNutritionLookup(index, ing.name, newAmount, ing.unit, handleNutritionResult);
    } else {
      // Fallback: proportional recalc from original
      const original = meal.ingredients[index];
      if (original && original.amount > 0) {
        const ratio = newAmount / original.amount;
        setEditedIngredients(prev => prev.map((item, i) =>
          i !== index ? item : {
            ...item,
            amount: newAmount,
            calories: Math.round(original.calories * ratio * 10) / 10,
            protein: Math.round(original.protein * ratio * 10) / 10,
            carbs: Math.round(original.carbs * ratio * 10) / 10,
            fat: Math.round(original.fat * ratio * 10) / 10,
          }
        ));
      }
    }
  };
```

Add loading spinner in the edit row (inside the editing grid, after the name input at line 220):

In the ingredient editing row, add a loading indicator. Replace the name input cell to include a spinner:

```typescript
                    <div className="relative">
                      <input value={ing.name} onChange={e => updateIngredientField(i, 'name', e.target.value)}
                        placeholder="Składnik"
                        className="bg-[var(--background)] border border-[var(--card-border)] rounded px-1.5 py-1 text-white text-xs w-full" />
                      {nutritionLoading?.has(i) && (
                        <Loader2 className="w-3 h-3 animate-spin text-violet-400 absolute right-1 top-1.5" />
                      )}
                    </div>
```

- [ ] **Step 2: Update cost display in non-editing view**

In the ingredient list (non-editing, lines 268-284), replace the cost display to show "brak ceny":

```typescript
              <ul className="space-y-1">
                {meal.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between text-xs text-[var(--muted)]">
                    <span>{ing.name} — {ing.amount} {ing.unit}</span>
                    <span className="flex items-center gap-3">
                      <span>{Math.round(ing.calories)} kcal</span>
                      <span className="w-20 text-right">
                        {costs[ing.name] !== undefined
                          ? costs[ing.name] !== null
                            ? `${(costs[ing.name] as number).toFixed(2)} zł`
                            : <span className="text-[var(--muted)]/50 italic">brak ceny</span>
                          : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
```

Update the meal header cost display (line 118-120) to show partial indicator:

```typescript
          {totalCost > 0 && (
            <span className="text-[var(--muted)] ml-auto">
              {totalCost.toFixed(2)} zł
              {Object.values(costs).some(c => c === null) && (
                <span className="text-[var(--muted)]/50 text-[10px] ml-1">(częściowy)</span>
              )}
            </span>
          )}
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add app/components/meals/MealCard.tsx
git commit -m "feat(meals): integrate nutrition lookup and cost display in MealCard"
```

---

### Task 7: Wire everything together in MealsMode and MealDashboard

**Files:**
- Modify: `app/components/meals/MealsMode.tsx`
- Modify: `app/components/meals/MealDashboard.tsx`

- [ ] **Step 1: Add cost estimation to MealsMode on meal creation**

In `app/components/meals/MealsMode.tsx`:

Add import:

```typescript
import { estimateCostFromPantry } from './costUtils';
```

In `handleAcceptMeals` (lines 85-87), add cost estimation after accepting:

```typescript
  const handleAcceptMeals = async (date: string, meals: AIGeneratedMeal[]) => {
    const result = await acceptMeals(date, meals);
    if (result?.data) {
      // Estimate cost from pantry for each new meal
      for (const savedMeal of result.data as MealPlan[]) {
        const { costs, totalCost } = pantry.estimateCost(savedMeal.ingredients as MealIngredient[]);
        if (totalCost > 0 || costs.size > 0) {
          const costObj: Record<string, number | null> = {};
          costs.forEach((v, k) => { costObj[k] = v; });
          await updateMealPlan(savedMeal.id, {
            estimated_cost: totalCost,
            ingredient_costs: costObj,
          });
        }
      }
    }
  };
```

Add import for `MealPlan`:

Make sure `MealPlan` is imported from types (it should already be available via useMeals).

In `handleSaveManualMeal` (lines 110-131), add cost estimation:

```typescript
  const handleSaveManualMeal = async (meal: {
    name: string; meal_slot: string; ingredients: MealIngredient[];
    calories: number; protein: number; carbs: number; fat: number; recipe_steps: string[];
  }) => {
    // Estimate cost before saving
    const { costs, totalCost } = pantry.estimateCost(meal.ingredients);
    const costObj: Record<string, number | null> = {};
    costs.forEach((v, k) => { costObj[k] = v; });

    await saveMealPlan({
      date: formatDate(new Date()),
      meal_slot: meal.meal_slot,
      name: meal.name,
      ingredients: meal.ingredients,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      recipe_steps: meal.recipe_steps,
      estimated_cost: totalCost,
      ingredient_costs: costObj,
      status: 'accepted',
      rating: null,
      rating_comment: null,
      is_favorite: false,
    });
  };
```

- [ ] **Step 2: Pass nutrition lookup + estimateCost to MealDashboard**

In `app/components/meals/MealDashboard.tsx`:

Add imports:

```typescript
import { useNutritionLookup } from './useNutritionLookup';
import { estimateCostFromPantry } from './costUtils';
```

Add to props interface:

```typescript
  onEstimateCost: (ingredients: MealIngredient[]) => { costs: Map<string, number | null>; totalCost: number };
```

Inside the component, init the nutrition lookup hook:

```typescript
  const { debouncedLookup, loadingIngredients } = useNutritionLookup();
```

Create a wrapper for `onUpdateIngredients` that recalculates cost:

```typescript
  const handleUpdateIngredients = (id: string, ingredients: MealIngredient[]) => {
    // Recalculate cost from pantry
    const { costs, totalCost } = onEstimateCost(ingredients);
    const costObj: Record<string, number | null> = {};
    costs.forEach((v, k) => { costObj[k] = v; });

    onUpdateIngredients(id, ingredients);
    onUpdateMeal(id, { estimated_cost: totalCost, ingredient_costs: costObj });
  };
```

Pass to MealCard:

```typescript
          <MealCard key={meal.id} meal={meal}
            onRate={handleRate}
            onReplace={handleReplace}
            onAccept={id => onUpdateMeal(id, { status: 'accepted' })}
            onReject={id => onUpdateMeal(id, { status: 'rejected' })}
            onMarkEaten={onMarkEaten}
            onToggleFavorite={onToggleFavorite}
            onUpdateIngredients={handleUpdateIngredients}
            onNutritionLookup={debouncedLookup}
            nutritionLoading={loadingIngredients}
          />
```

- [ ] **Step 3: Update MealsMode to pass estimateCost to Dashboard**

In `MealsMode.tsx`, update the MealDashboard render to include the new prop:

```typescript
          <MealDashboard
            preferences={preferences}
            mealPlans={mealPlans}
            pantryItems={pantry.items}
            favoriteMeals={getFavorites()}
            onAcceptMeals={handleAcceptMeals}
            onUpdateMeal={updateMealPlan}
            onToggleFavorite={toggleFavorite}
            onUpdateIngredients={updateIngredients}
            onMarkEaten={handleMarkEaten}
            onSaveManualMeal={handleSaveManualMeal}
            onNavigate={(v) => setView(v as View)}
            onEstimateCost={pantry.estimateCost}
          />
```

- [ ] **Step 4: Verify build compiles and all tests pass**

Run: `npm run build && npm run test:run`
Expected: Build succeeds, all tests pass

- [ ] **Step 5: Commit**

```bash
git add app/components/meals/MealsMode.tsx app/components/meals/MealDashboard.tsx
git commit -m "feat(meals): wire cost estimation and nutrition lookup into meal flows"
```

---

### Task 8: Final integration test and cleanup

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

- [ ] **Step 2: Run linter**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: Builds successfully

- [ ] **Step 4: Manual verification checklist**

Verify in browser (`npm run dev`):
1. Generate a meal via AI → macros are non-zero for all real ingredients
2. Click "Edytuj skład" → change ingredient name → after 800ms, macros auto-update
3. Change ingredient amount → macros recalculate (from cache if available)
4. Manually edit a macro field → auto-lookup disabled for that ingredient
5. Cost shows immediately based on pantry items (not 0.00 zł)
6. Ingredients not in pantry show "brak ceny"
7. Header shows cost with "(częściowy)" if some ingredients missing from pantry
8. "Zjedzony" still deducts from pantry and finalizes cost

- [ ] **Step 5: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(meals): integration fixes for macro and cost features"
```
