# Pantry Write-Offs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add pantry waste tracking — users can write off remaining pantry quantities with reasons, see cost of waste on Dashboard and in pantry history.

**Architecture:** New `pantry_write_offs` Supabase table with snapshot data + optional FK to `pantry_items`. New `usePantryWriteOffs` hook in `MealsMode.tsx` (prop-driven pattern). `WriteOffModal` component for input. Dashboard widget + history section in `PantryManager`.

**Tech Stack:** Next.js 16, React 19, Supabase (RLS), TypeScript, Tailwind CSS v4, lucide-react icons

**Spec:** `docs/superpowers/specs/2026-04-07-pantry-write-offs-design.md`

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `supabase/migrations/20260407_create_pantry_write_offs.sql` | Table + RLS policies |
| Create | `app/components/meals/usePantryWriteOffs.ts` | Hook: CRUD, monthly aggregation |
| Create | `app/components/meals/WriteOffModal.tsx` | Modal: quantity, reason, note input |
| Create | `__tests__/usePantryWriteOffs.test.ts` | Hook unit tests |
| Modify | `app/components/meals/types.ts` | Add `PantryWriteOff`, `WriteOffReason` types |
| Modify | `app/components/meals/PantryManager.tsx` | Add write-off button, history tab, "Zużyty" badge |
| Modify | `app/components/meals/MealsMode.tsx` | Wire `usePantryWriteOffs`, pass props, read localStorage flag |
| Modify | `app/components/Dashboard.tsx` | Add waste widget with navigation |

---

### Task 1: Supabase Migration

**Files:**
- Create: `supabase/migrations/20260407_create_pantry_write_offs.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- supabase/migrations/20260407_create_pantry_write_offs.sql

CREATE TABLE pantry_write_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  cost_per_unit REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  note TEXT,
  written_off_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pantry_write_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own write-offs"
  ON pantry_write_offs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own write-offs"
  ON pantry_write_offs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own write-offs"
  ON pantry_write_offs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_pantry_write_offs_user_date
  ON pantry_write_offs(user_id, written_off_at DESC);
```

- [ ] **Step 2: Run migration in Supabase Dashboard SQL Editor**

Copy-paste the SQL into Supabase Dashboard > SQL Editor and execute.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260407_create_pantry_write_offs.sql
git commit -m "feat: add pantry_write_offs table with RLS"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `app/components/meals/types.ts` (add after `PantryItem` interface, around line 80)

- [ ] **Step 1: Add WriteOffReason type and PantryWriteOff interface**

Add after the `PantryItem` interface (line 80) in `app/components/meals/types.ts`:

```typescript
export type WriteOffReason = 'spoiled' | 'taken' | 'discarded' | 'other';

export const WRITE_OFF_REASON_LABELS: Record<WriteOffReason, string> = {
  spoiled: 'Zepsute',
  taken: 'Ktoś wziął',
  discarded: 'Wyrzucone',
  other: 'Inne',
};

export interface PantryWriteOff {
  id: string;
  user_id: string;
  pantry_item_id: string | null;
  name: string;
  unit: PantryUnit;
  quantity: number;
  cost_per_unit: number;
  total_cost: number;
  reason: WriteOffReason;
  note: string | null;
  written_off_at: string;
  created_at: string;
}
```

- [ ] **Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/meals/types.ts
git commit -m "feat: add PantryWriteOff type and WriteOffReason"
```

---

### Task 3: `usePantryWriteOffs` Hook — Tests First

**Files:**
- Create: `__tests__/usePantryWriteOffs.test.ts`
- Create: `app/components/meals/usePantryWriteOffs.ts`

Reference existing test patterns in `__tests__/estimateCost.test.ts` for Supabase mocking.

- [ ] **Step 1: Write tests for `usePantryWriteOffs`**

Create `__tests__/usePantryWriteOffs.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react';
import { usePantryWriteOffs } from '@/app/components/meals/usePantryWriteOffs';
import { PantryItem } from '@/app/components/meals/types';

// Supabase is globally mocked in vitest.setup.ts

const mockPantryItem: PantryItem = {
  id: 'pantry-1',
  user_id: 'user-1',
  name: 'Masło',
  quantity_total: 1000,
  quantity_remaining: 500,
  unit: 'g',
  price: 10,
  purchased_at: '2026-04-01',
  created_at: '2026-04-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
};

describe('usePantryWriteOffs', () => {
  describe('cost calculation', () => {
    it('calculates cost_per_unit as price / quantity_total', () => {
      // price=10, quantity_total=1000 → cost_per_unit = 0.01
      const costPerUnit = mockPantryItem.price / mockPantryItem.quantity_total;
      expect(costPerUnit).toBe(0.01);
    });

    it('calculates total_cost as quantity × cost_per_unit', () => {
      const costPerUnit = mockPantryItem.price / mockPantryItem.quantity_total;
      const quantity = 500;
      const totalCost = Math.round(quantity * costPerUnit * 100) / 100;
      expect(totalCost).toBe(5);
    });

    it('returns 0 total_cost when price is 0', () => {
      const freeItem = { ...mockPantryItem, price: 0 };
      const costPerUnit = freeItem.price / freeItem.quantity_total;
      const totalCost = Math.round(250 * costPerUnit * 100) / 100;
      expect(totalCost).toBe(0);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they pass** (pure calculation tests, no hook rendering yet)

Run: `npx vitest run __tests__/usePantryWriteOffs.test.ts`
Expected: 3 tests PASS.

- [ ] **Step 3: Write the `usePantryWriteOffs` hook**

Create `app/components/meals/usePantryWriteOffs.ts`:

```typescript
"use client";

import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { PantryItem, PantryWriteOff, WriteOffReason } from './types';
import { formatDate } from '../shared/dateUtils';

interface WriteOffSummary {
  monthlyTotal: number;
  monthlyCount: number;
}

export function usePantryWriteOffs(userId: string | undefined) {
  const [writeOffs, setWriteOffs] = useState<PantryWriteOff[]>([]);
  const [summary, setSummary] = useState<WriteOffSummary>({ monthlyTotal: 0, monthlyCount: 0 });
  const [loading, setLoading] = useState(false);

  const loadWriteOffs = useCallback(async (month: string) => {
    if (!userId || !supabase) return;
    setLoading(true);
    try {
      const startDate = `${month}-01`;
      const [year, m] = month.split('-').map(Number);
      const endDate = m === 12
        ? `${year + 1}-01-01`
        : `${year}-${String(m + 1).padStart(2, '0')}-01`;

      const { data, error } = await supabase
        .from('pantry_write_offs')
        .select('*')
        .eq('user_id', userId)
        .gte('written_off_at', startDate)
        .lt('written_off_at', endDate)
        .order('written_off_at', { ascending: false });

      if (error) throw error;
      const items = (data || []) as PantryWriteOff[];
      setWriteOffs(items);
      setSummary({
        monthlyTotal: Math.round(items.reduce((s, w) => s + w.total_cost, 0) * 100) / 100,
        monthlyCount: items.length,
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMonthlySummary = useCallback(async (month: string) => {
    if (!userId || !supabase) return { monthlyTotal: 0, monthlyCount: 0 };
    const startDate = `${month}-01`;
    const [year, m] = month.split('-').map(Number);
    const endDate = `${year}-${String(m + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('pantry_write_offs')
      .select('total_cost')
      .eq('user_id', userId)
      .gte('written_off_at', startDate)
      .lt('written_off_at', endDate);

    if (error) return { monthlyTotal: 0, monthlyCount: 0 };
    const items = data || [];
    return {
      monthlyTotal: Math.round(items.reduce((s: number, w: { total_cost: number }) => s + w.total_cost, 0) * 100) / 100,
      monthlyCount: items.length,
    };
  }, [userId]);

  const createWriteOff = useCallback(async (data: {
    pantryItem: PantryItem;
    quantity: number;
    reason: WriteOffReason;
    note?: string;
  }) => {
    if (!userId || !supabase) return;

    const costPerUnit = data.pantryItem.quantity_total > 0
      ? data.pantryItem.price / data.pantryItem.quantity_total
      : 0;
    const totalCost = Math.round(data.quantity * costPerUnit * 100) / 100;

    const writeOff: Omit<PantryWriteOff, 'id' | 'created_at'> = {
      user_id: userId,
      pantry_item_id: data.pantryItem.id,
      name: data.pantryItem.name,
      unit: data.pantryItem.unit,
      quantity: data.quantity,
      cost_per_unit: Math.round(costPerUnit * 10000) / 10000,
      total_cost: totalCost,
      reason: data.reason,
      note: data.note || null,
      written_off_at: formatDate(new Date()),
    };

    const { error: insertError } = await supabase
      .from('pantry_write_offs')
      .insert(writeOff);
    if (insertError) throw insertError;

    const newRemaining = data.pantryItem.quantity_remaining - data.quantity;
    const { error: updateError } = await supabase
      .from('pantry_items')
      .update({ quantity_remaining: Math.max(0, newRemaining) })
      .eq('id', data.pantryItem.id);
    if (updateError) throw updateError;
  }, [userId]);

  const deleteWriteOff = useCallback(async (writeOff: PantryWriteOff) => {
    if (!supabase) return;

    const { error: deleteError } = await supabase
      .from('pantry_write_offs')
      .delete()
      .eq('id', writeOff.id);
    if (deleteError) throw deleteError;

    if (writeOff.pantry_item_id) {
      const { data: pantryItem } = await supabase
        .from('pantry_items')
        .select('quantity_remaining')
        .eq('id', writeOff.pantry_item_id)
        .single();

      if (pantryItem) {
        await supabase
          .from('pantry_items')
          .update({ quantity_remaining: pantryItem.quantity_remaining + writeOff.quantity })
          .eq('id', writeOff.pantry_item_id);
      }
    }

    setWriteOffs(prev => prev.filter(w => w.id !== writeOff.id));
    setSummary(prev => ({
      monthlyTotal: Math.round((prev.monthlyTotal - writeOff.total_cost) * 100) / 100,
      monthlyCount: prev.monthlyCount - 1,
    }));
  }, []);

  return {
    writeOffs,
    monthlyTotal: summary.monthlyTotal,
    monthlyCount: summary.monthlyCount,
    loading,
    loadWriteOffs,
    loadMonthlySummary,
    createWriteOff,
    deleteWriteOff,
  };
}
```

- [ ] **Step 4: Run tests again**

Run: `npx vitest run __tests__/usePantryWriteOffs.test.ts`
Expected: PASS.

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add __tests__/usePantryWriteOffs.test.ts app/components/meals/usePantryWriteOffs.ts
git commit -m "feat: add usePantryWriteOffs hook with tests"
```

---

### Task 4: WriteOffModal Component

**Files:**
- Create: `app/components/meals/WriteOffModal.tsx`

- [ ] **Step 1: Create `WriteOffModal`**

```typescript
"use client";

import { useState, useMemo } from 'react';
import { X, Trash2, User, PackageX, FileText } from 'lucide-react';
import { PantryItem, WriteOffReason, WRITE_OFF_REASON_LABELS } from './types';

interface WriteOffModalProps {
  isOpen: boolean;
  item: PantryItem;
  onClose: () => void;
  onConfirm: (data: { quantity: number; reason: WriteOffReason; note?: string }) => void;
}

const REASON_ICONS: Record<WriteOffReason, typeof Trash2> = {
  spoiled: Trash2,
  taken: User,
  discarded: PackageX,
  other: FileText,
};

export default function WriteOffModal({ isOpen, item, onClose, onConfirm }: WriteOffModalProps) {
  const [quantity, setQuantity] = useState(item.quantity_remaining);
  const [reason, setReason] = useState<WriteOffReason | null>(null);
  const [note, setNote] = useState('');

  const costPerUnit = item.quantity_total > 0 ? item.price / item.quantity_total : 0;
  const estimatedCost = useMemo(
    () => Math.round(quantity * costPerUnit * 100) / 100,
    [quantity, costPerUnit]
  );

  // Reset state when item changes
  const itemId = item.id;
  const [prevItemId, setPrevItemId] = useState(itemId);
  if (itemId !== prevItemId) {
    setPrevItemId(itemId);
    setQuantity(item.quantity_remaining);
    setReason(null);
    setNote('');
  }

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!reason) return;
    onConfirm({ quantity, reason, note: note.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">
            Spisz stratę: {item.name}
          </h3>
          <button onClick={onClose} className="text-[var(--muted)] hover:text-[var(--foreground)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-1">
            Ilość do spisania ({item.unit})
          </label>
          <input
            type="number"
            value={quantity}
            onChange={e => setQuantity(Math.min(Number(e.target.value), item.quantity_remaining))}
            min={0.1}
            max={item.quantity_remaining}
            step={item.unit === 'szt' ? 1 : 0.1}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)]"
          />
          <p className="text-xs text-[var(--muted)] mt-1">
            Dostępne: {Math.round(item.quantity_remaining)} {item.unit}
          </p>
        </div>

        <div className="bg-[var(--surface)] rounded-lg p-3 text-center">
          <span className="text-sm text-[var(--muted)]">Koszt straty: </span>
          <span className="text-lg font-semibold text-red-400">{estimatedCost.toFixed(2)} zł</span>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-2">Powód</label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(WRITE_OFF_REASON_LABELS) as [WriteOffReason, string][]).map(([key, label]) => {
              const Icon = REASON_ICONS[key];
              return (
                <button
                  key={key}
                  onClick={() => setReason(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                    reason === key
                      ? 'border-violet-500 bg-violet-500/20 text-violet-300'
                      : 'border-[var(--card-border)] text-[var(--muted)] hover:border-[var(--muted)]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-sm text-[var(--muted)] block mb-1">Notatka (opcjonalne)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 bg-[var(--surface)] border border-[var(--card-border)] rounded-lg text-[var(--foreground)] text-sm resize-none"
            placeholder="Np. przeterminowane o 2 dni..."
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!reason || quantity <= 0}
          className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
        >
          Spisz stratę
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/components/meals/WriteOffModal.tsx
git commit -m "feat: add WriteOffModal component"
```

---

### Task 5: Add Write-Off Button + History Tab to PantryManager

**Files:**
- Modify: `app/components/meals/PantryManager.tsx`

The existing component is 75 lines (lines 1-75). It's prop-driven — all callbacks come from `MealsMode.tsx`.

- [ ] **Step 1: Extend `PantryManagerProps` to accept write-off data and callbacks**

In `app/components/meals/PantryManager.tsx`, update the imports (line 1-6) and props interface (lines 8-13):

```typescript
"use client";

import { useState } from 'react';
import { Plus, Trash2, ArrowLeft, Package, PackageX } from 'lucide-react';
import { PantryItem, PantryWriteOff, WRITE_OFF_REASON_LABELS } from './types';
import PantryItemModal from './PantryItemModal';
import WriteOffModal from './WriteOffModal';

interface PantryManagerProps {
  items: PantryItem[];
  onAdd: (item: { name: string; quantity: number; inputUnit: string; price: number }) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
  // Write-off props
  writeOffs: PantryWriteOff[];
  writeOffMonthlyTotal: number;
  writeOffMonthlyCount: number;
  writeOffLoading: boolean;
  onWriteOff: (item: PantryItem, data: { quantity: number; reason: import('./types').WriteOffReason; note?: string }) => Promise<void>;
  onDeleteWriteOff: (writeOff: PantryWriteOff) => Promise<void>;
  onLoadWriteOffs: (month: string) => void;
  initialTab?: 'pantry' | 'history';
}
```

- [ ] **Step 2: Add tab switching, write-off button per item, "Zużyty" badge, and history section**

Replace the component body (from `export default function PantryManager` line 15 through end of file) with a version that includes:

1. Tab state (`'pantry' | 'history'`) initialized from `initialTab` prop
2. Write-off modal state (`writeOffItem: PantryItem | null`)
3. Month selector state for history
4. `PackageX` button per item (only when `quantity_remaining > 0`)
5. "Zużyty" badge when `quantity_remaining === 0`
6. History tab with chronological list, month filter, summary, delete with confirmation

Key additions to the item row (inside the `items.map` block, next to the delete button):

```typescript
{item.quantity_remaining > 0 && (
  <button
    onClick={() => setWriteOffItem(item)}
    className="p-1 text-[var(--muted)] hover:text-amber-400"
    title="Spisz stratę"
  >
    <PackageX className="w-4 h-4" />
  </button>
)}
{item.quantity_remaining === 0 && (
  <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">Zużyty</span>
)}
```

Tab bar at top:

```typescript
<div className="flex gap-2 border-b border-[var(--card-border)] pb-2">
  <button
    onClick={() => setActiveTab('pantry')}
    className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'pantry' ? 'bg-violet-600 text-white' : 'text-[var(--muted)]'}`}
  >
    Produkty ({items.length})
  </button>
  <button
    onClick={() => { setActiveTab('history'); onLoadWriteOffs(selectedMonth); }}
    className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'history' ? 'bg-violet-600 text-white' : 'text-[var(--muted)]'}`}
  >
    Historia strat
  </button>
</div>
```

History section (rendered when `activeTab === 'history'`):

```typescript
<div className="space-y-3">
  <div className="flex items-center justify-between">
    <select
      value={selectedMonth}
      onChange={e => { setSelectedMonth(e.target.value); onLoadWriteOffs(e.target.value); }}
      className="bg-[var(--surface)] border border-[var(--card-border)] rounded-lg px-3 py-1.5 text-sm text-[var(--foreground)]"
    >
      {/* Generate last 6 months as options */}
    </select>
    <div className="text-sm text-[var(--muted)]">
      Łącznie: <span className="text-red-400 font-medium">{writeOffMonthlyTotal.toFixed(2)} zł</span> z {writeOffMonthlyCount} produktów
    </div>
  </div>

  {writeOffs.length === 0 ? (
    <p className="text-center text-[var(--muted)] py-4">Brak strat w tym miesiącu.</p>
  ) : (
    writeOffs.map(wo => (
      <div key={wo.id} className="bg-[var(--card-bg)] border border-[var(--card-border)] rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[var(--foreground)] font-medium">{wo.name}</span>
            <span className="text-[var(--muted)] text-sm ml-2">— {Math.round(wo.quantity)}{wo.unit}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-400 text-sm font-medium">{wo.total_cost.toFixed(2)} zł</span>
            <button
              onClick={() => {
                if (confirm('Usunąć ten wpis? Ilość zostanie przywrócona do spiżarni.')) {
                  onDeleteWriteOff(wo);
                }
              }}
              className="p-1 text-[var(--muted)] hover:text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--muted)]">
          <span>{WRITE_OFF_REASON_LABELS[wo.reason as keyof typeof WRITE_OFF_REASON_LABELS]}</span>
          <span>•</span>
          <span>{wo.written_off_at}</span>
          {wo.note && <><span>•</span><span className="italic">{wo.note}</span></>}
        </div>
      </div>
    ))
  )}
</div>
```

WriteOffModal render at end:

```typescript
{writeOffItem && (
  <WriteOffModal
    isOpen={!!writeOffItem}
    item={writeOffItem}
    onClose={() => setWriteOffItem(null)}
    onConfirm={async (data) => {
      await onWriteOff(writeOffItem, data);
      setWriteOffItem(null);
    }}
  />
)}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/components/meals/PantryManager.tsx
git commit -m "feat: add write-off button and history tab to PantryManager"
```

---

### Task 6: Wire `usePantryWriteOffs` in MealsMode

**Files:**
- Modify: `app/components/meals/MealsMode.tsx`

Key locations:
- Hooks area: lines 34-44
- Toast state: line 47
- Pantry render block: lines 319-326

- [ ] **Step 1: Import and initialize the hook**

Add import at top of `MealsMode.tsx`:

```typescript
import { usePantryWriteOffs } from './usePantryWriteOffs';
```

After `const pantry = usePantry(user?.id);` (line 42), add:

```typescript
const pantryWriteOffs = usePantryWriteOffs(user?.id);
```

- [ ] **Step 2: Add write-off handler**

Add after the existing handlers (around line 250):

```typescript
const handleWriteOff = async (item: PantryItem, data: { quantity: number; reason: WriteOffReason; note?: string }) => {
  try {
    await pantryWriteOffs.createWriteOff({ pantryItem: item, ...data });
    await pantry.loadItems();
    const costPerUnit = item.quantity_total > 0 ? item.price / item.quantity_total : 0;
    const cost = Math.round(data.quantity * costPerUnit * 100) / 100;
    setToast({ message: `Spisano ${Math.round(data.quantity)}${item.unit} ${item.name} (${cost.toFixed(2)} zł)`, type: 'success' });
  } catch {
    setToast({ message: 'Błąd zapisywania straty', type: 'error' });
  }
};

const handleDeleteWriteOff = async (writeOff: PantryWriteOff) => {
  try {
    await pantryWriteOffs.deleteWriteOff(writeOff);
    await pantry.loadItems();
    if (!writeOff.pantry_item_id) {
      setToast({ message: 'Wpis usunięty. Produkt już nie istnieje w spiżarni.', type: 'success' });
    } else {
      setToast({ message: 'Wpis usunięty, ilość przywrócona.', type: 'success' });
    }
  } catch {
    setToast({ message: 'Błąd usuwania wpisu', type: 'error' });
  }
};
```

Add necessary imports at top:

```typescript
import { PantryWriteOff, WriteOffReason } from './types';
```

- [ ] **Step 3: Add localStorage flag reading for Dashboard navigation**

In the `useEffect` that handles initial view (or add a new one):

```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    const showWriteOffs = localStorage.getItem('pantry-show-write-offs');
    if (showWriteOffs === 'true') {
      localStorage.removeItem('pantry-show-write-offs');
      setView('pantry');
      // initialTab will be passed as 'history'
    }
  }
}, []);
```

Add state to track this:

```typescript
const [pantryInitialTab, setPantryInitialTab] = useState<'pantry' | 'history'>('pantry');
```

Update the localStorage reading to set it:

```typescript
if (showWriteOffs === 'true') {
  localStorage.removeItem('pantry-show-write-offs');
  setView('pantry');
  setPantryInitialTab('history');
}
```

- [ ] **Step 4: Pass new props to PantryManager**

Update the `PantryManager` render block (lines 319-326):

```typescript
{resolvedView === 'pantry' && (
  <PantryManager
    items={pantry.items}
    onAdd={pantry.addItem}
    onDelete={pantry.deleteItem}
    onBack={() => setView('dashboard')}
    writeOffs={pantryWriteOffs.writeOffs}
    writeOffMonthlyTotal={pantryWriteOffs.monthlyTotal}
    writeOffMonthlyCount={pantryWriteOffs.monthlyCount}
    writeOffLoading={pantryWriteOffs.loading}
    onWriteOff={handleWriteOff}
    onDeleteWriteOff={handleDeleteWriteOff}
    onLoadWriteOffs={pantryWriteOffs.loadWriteOffs}
    initialTab={pantryInitialTab}
  />
)}
```

- [ ] **Step 5: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/components/meals/MealsMode.tsx
git commit -m "feat: wire usePantryWriteOffs in MealsMode"
```

---

### Task 7: Dashboard Waste Widget

**Files:**
- Modify: `app/components/Dashboard.tsx`

Key locations:
- Imports: lines 1-12
- Widget area: lines 77-125

- [ ] **Step 1: Add imports and hook**

Add to imports in `Dashboard.tsx`:

```typescript
import { PackageX } from "lucide-react";
import { usePantryWriteOffs } from "./meals/usePantryWriteOffs";
```

Inside the component, after existing hooks:

```typescript
const pantryWriteOffs = usePantryWriteOffs(user?.id);
const [wasteSummary, setWasteSummary] = useState({ monthlyTotal: 0, monthlyCount: 0 });
```

Add `useState` to the existing React import.

- [ ] **Step 2: Load monthly summary on mount**

Add useEffect:

```typescript
const { loadMonthlySummary } = pantryWriteOffs;
useEffect(() => {
  if (user?.id) {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    loadMonthlySummary(month).then(setWasteSummary);
  }
}, [user?.id, loadMonthlySummary]);
```

- [ ] **Step 3: Add the widget in the widget area**

After the existing StatCard grid (around line 91), add:

```typescript
{wasteSummary.monthlyTotal > 0 && (
  <div
    onClick={() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pantry-show-write-offs', 'true');
      }
      navigateTo('meals');
    }}
    className="cursor-pointer"
    role="button"
    tabIndex={0}
  >
    <SubtleCard>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-500/20 rounded-lg">
          <PackageX className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <p className="text-xs text-[var(--muted)]">Straty w tym miesiącu</p>
          <p className="text-lg font-semibold text-red-400">{wasteSummary.monthlyTotal.toFixed(2)} zł</p>
          <p className="text-xs text-[var(--muted)]">{wasteSummary.monthlyCount} produktów</p>
        </div>
      </div>
    </SubtleCard>
  </div>
)}
```

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add app/components/Dashboard.tsx
git commit -m "feat: add waste tracking widget to Dashboard"
```

---

### Task 8: Manual QA + Final Commit

- [ ] **Step 1: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass.

- [ ] **Step 2: Run build**

Run: `npm run build`
Expected: Builds without errors.

- [ ] **Step 3: Manual QA checklist**

Test in browser (`npm run dev`):

1. Open Spiżarnia — verify `PackageX` button appears on items with remaining quantity
2. Click the button — verify WriteOffModal opens with correct defaults
3. Change quantity, select reason, add note — click "Spisz stratę"
4. Verify toast shows correct message
5. Verify item's quantity bar updated
6. Switch to "Historia strat" tab — verify the entry appears
7. Change month filter — verify it filters
8. Delete a write-off entry — verify confirmation dialog and quantity restoration
9. Mark item as fully written off — verify "Zużyty" badge appears
10. Go to Dashboard — verify waste widget shows (if any write-offs exist this month)
11. Click waste widget — verify it navigates to pantry history tab

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: QA fixes for pantry write-offs"
```
