# Pantry Write-Offs — Spisywanie strat ze spiżarni

## Problem

Użytkownik kupuje produkt, częściowo go wykorzystuje w posiłkach, ale reszta się psuje, ktoś ją zabiera albo zostaje wyrzucona. Dziś jedyna opcja to usunięcie produktu ze spiżarni — bez rejestrowania ile zostało stracone i za ile. Brak widoczności kosztów marnotrawstwa.

## Rozwiązanie

Nowy system spisywania strat: ręczne oznaczanie resztek produktów z powodami, pełna historia spisań, widoczność kosztów strat na Dashboard i w spiżarni.

## Podejście

Minimalne (Podejście A) — nowa tabela ze snapshot danymi, modal spisania, widget na Dashboard, lista chronologiczna w spiżarni. Bez zmian w istniejącym kodzie dedukcji posiłków.

---

## 1. Model danych

### Nowa tabela `pantry_write_offs`

```sql
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
```

`pantry_item_id` jest opcjonalnym FK — snapshot danych (name, unit, cost) zapewnia niezależność historii, ale FK umożliwia przywrócenie `quantity_remaining` przy usuwaniu wpisu spisania. `ON DELETE SET NULL` — jeśli produkt zostanie usunięty, historia przetrwa.

**RLS policies:** `auth.uid() = user_id` na SELECT, INSERT, DELETE. Bez UPDATE — spisania są immutable.

### TypeScript typ

```typescript
export type WriteOffReason = 'spoiled' | 'taken' | 'discarded' | 'other';

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

### Mapowanie powodów (UI labels)

| reason     | Label PL         |
|------------|------------------|
| spoiled    | Zepsute          |
| taken      | Ktoś wziął       |
| discarded  | Wyrzucone        |
| other      | Inne             |

---

## 2. Interakcja użytkownika

### Przycisk "Spisz" w PantryManager

- Ikonka `PackageMinus` (lucide-react, fallback: `PackageX`) przy każdym produkcie z `quantity_remaining > 0`
- Kolor muted — nie jest to główna akcja
- Otwiera `WriteOffModal`

### WriteOffModal

Pola:
1. **Nazwa produktu** — nagłówek, read-only
2. **Ilość do spisania** — number input, domyślnie `quantity_remaining`, max = `quantity_remaining`, min = 0.1
3. **Koszt straty** — wyliczony automatycznie (`ilość × cost_per_unit`), read-only
4. **Powód** — 4 przyciski do wyboru: Zepsute, Ktoś wziął, Wyrzucone, Inne
5. **Notatka** — textarea, opcjonalna
6. **Przycisk "Spisz"** — potwierdza

Po zatwierdzeniu:
1. INSERT do `pantry_write_offs` (snapshot danych)
2. UPDATE `pantry_items` set `quantity_remaining -= quantity`
3. Toast: "Spisano {ilość}{unit} {nazwa} ({koszt} zł)"
4. Zamknij modal, odśwież listę spiżarni

---

## 3. Widget na Dashboard

- Komponent: `SubtleCard` (istniejący)
- Kolor: violet (moduł meals)
- Ikona: `PackageMinus`
- Treść:
  - Nagłówek: "Straty"
  - Główna liczba: **X zł** (suma `total_cost` z bieżącego miesiąca)
  - Podpis: "w tym miesiącu" + liczba produktów
- Kliknięcie → `navigateTo('meals')` + localStorage flag `pantry-show-write-offs=true`, którą `MealsMode` czyta przy montowaniu i otwiera spiżarnię z zakładką strat
- Dane: lekkie query `SUM(total_cost)` + `COUNT(*)` z filtrem na bieżący miesiąc

---

## 4. Historia strat w spiżarni

- Nowa sekcja/zakładka "Historia strat" w `PantryManager`
- Filtr: dropdown z miesiącami, domyślnie bieżący
- Podsumowanie na górze: "Łącznie: X zł z Y produktów"
- Lista chronologiczna (najnowsze na górze), każdy wpis:
  - Nazwa + ilość z jednostką (np. "Masło — 250g")
  - Powód po polsku
  - Notatka (jeśli jest)
  - Koszt straty
  - Data spisania
- Usuwanie wpisu z potwierdzeniem (na wypadek pomyłki) — jeśli `pantry_item_id` istnieje w bazie, przywraca `quantity_remaining += quantity`

---

## 5. Hook `usePantryWriteOffs`

```typescript
interface UsePantryWriteOffs {
  writeOffs: PantryWriteOff[];
  monthlyTotal: number;
  monthlyCount: number;
  loading: boolean;

  loadWriteOffs(month: string): void;    // format "2026-04"
  createWriteOff(data: {
    pantryItem: PantryItem;
    quantity: number;
    reason: WriteOffReason;
    note?: string;
  }): Promise<void>;
  deleteWriteOff(id: string): Promise<void>;
}
```

### `createWriteOff` flow:
1. Oblicz `cost_per_unit = pantryItem.price / pantryItem.quantity_total`
2. Oblicz `total_cost = quantity × cost_per_unit` (zaokrąglone do 2 miejsc)
3. INSERT do `pantry_write_offs` ze snapshot danymi + `pantry_item_id: pantryItem.id`
4. UPDATE `pantry_items` set `quantity_remaining -= quantity`
5. Optimistic update UI, revert w catch

### Integracja:
- Osobny hook, nie modyfikuje `usePantry`
- **Architektura prop-driven:** `PantryManager` jest komponentem prezentacyjnym (props z `MealsMode.tsx`). `usePantryWriteOffs` hook żyje w `MealsMode.tsx` obok `usePantry`. Write-off callbacki (`onWriteOff`, `onDeleteWriteOff`) + dane (`writeOffs`, `monthlyTotal`) przekazywane jako nowe propsy do `PantryManager`.
- Po `createWriteOff` wywołuje `usePantry.loadItems()` w `MealsMode.tsx` do odświeżenia

### `deleteWriteOff` flow:
1. Pobierz write-off z listy (potrzebne `pantry_item_id`, `quantity`)
2. DELETE z `pantry_write_offs`
3. Jeśli `pantry_item_id` nie jest null — UPDATE `pantry_items` set `quantity_remaining += quantity` (przywrócenie)
4. Odśwież `usePantry.loadItems()`

### Dashboard widget:
- Osobne lekkie query: `SELECT SUM(total_cost), COUNT(*) FROM pantry_write_offs WHERE user_id = ? AND written_off_at >= ?`
- Nie ładuje pełnej listy write-offs

---

## 6. Nowe pliki

| Plik | Opis |
|------|------|
| `supabase/migrations/2026XXXX_create_pantry_write_offs.sql` | Tabela + RLS |
| `app/components/meals/usePantryWriteOffs.ts` | Hook CRUD + agregacje |
| `app/components/meals/WriteOffModal.tsx` | Modal spisywania |
| Modyfikacja: `app/components/meals/PantryManager.tsx` | Przycisk + sekcja historii |
| Modyfikacja: `app/components/Dashboard.tsx` | Widget strat |
| Modyfikacja: `app/components/meals/types.ts` | Nowe typy |

---

## 7. Czego NIE robimy

- Nie zmieniamy istniejącej logiki dedukcji posiłków (`usePantry.deductIngredients`)
- Nie tworzymy event log / uniwersalnego systemu zdarzeń
- Nie dodajemy wykresów ani grupowania — na start lista chronologiczna wystarczy
- Nie dodajemy automatycznego spisywania (np. po przeterminowaniu)

---

## 8. Edge cases

- **`quantity_remaining` = 0 po spisaniu:** Produkt zostaje w spiżarni ale z wizualnym oznaczeniem "Zużyty" (badge). Przycisk "Spisz" znika. Użytkownik może usunąć produkt ręcznie.
- **Usunięcie write-off gdy produkt już nie istnieje:** `pantry_item_id` będzie NULL (ON DELETE SET NULL). Ilość nie jest przywracana — toast informuje "Produkt już nie istnieje w spiżarni".
- **Cena produktu = 0:** `total_cost` = 0 zł. Poprawne — darmowy produkt to zerowa strata finansowa.
- **`SubtleCard` na Dashboard:** Komponent nie ma `onClick` — owinąć w klikalny `<div>` z `cursor-pointer` i `role="button"`.
