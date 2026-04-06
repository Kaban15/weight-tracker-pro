## Weight Tracker Pro — Opis aplikacji dla agenta AI

### Czym jest aplikacja

Weight Tracker Pro to **PWA (Progressive Web App)** do śledzenia zdrowia i produktywności. Aplikacja jest w języku **polskim** (wszystkie stringi UI, walidacje, komunikaty błędów). Użytkownik po zalogowaniu widzi Dashboard z podsumowaniem danych i nawigację do 6 modułów.

### Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Supabase** — autentykacja (email/password) i baza danych (PostgreSQL z RLS)
- **Tailwind CSS v4** (przez `@tailwindcss/postcss`)
- **Zod v4** — walidacja danych (`lib/validation.ts`)
- **Vitest** + jsdom + React Testing Library — testy w `__tests__/`
- **Sentry** — error tracking (opcjonalny, warunkowy na `NEXT_PUBLIC_SENTRY_DSN`)
- **PostHog** — analytics (opcjonalny, warunkowy na `NEXT_PUBLIC_POSTHOG_KEY`)
- **Resend** — wysyłka emaili (feedback)
- **Recharts** — wykresy
- **IndexedDB** — offline storage z kolejką synchronizacji
- **OpenAI SDK** — AI chat w module posiłków (proxy przez API route)

### Komendy

```
npm run dev              # serwer deweloperski (localhost:3000)
npm run build            # build produkcyjny
npm run lint             # ESLint (flat config, next/core-web-vitals + typescript)
npm run test             # Vitest watch mode
npm run test:run         # Vitest jednorazowo
npm run test:run -- __tests__/plik.test.ts   # pojedynczy test
```

### Architektura — KLUCZOWA INFORMACJA

Aplikacja **NIE korzysta z file-based routing** Next.js do nawigacji między widokami. Cała aplikacja to **jedna strona** (`app/page.tsx`) która renderuje różne "tryby" na podstawie stanu w `NavigationContext`. Jedyny osobny route to `app/reset-password/page.tsx`.

**Flow nawigacji:**
1. `Auth` (logowanie/rejestracja) — jeśli brak sesji
2. `WelcomeModal` — onboarding przy pierwszej wizycie
3. `AppShell` (persistent navigation) z `Dashboard` jako widok domowy
4. Wybrany moduł (`tracker` / `challenge` / `todo` / `schedule` / `meals` / `admin`)

### System nawigacji

Nawigacja używa persistent `AppShell` (`app/components/layout/AppShell.tsx`):
- **Mobile (< 768px):** Dolny pasek nawigacji z 5 pozycjami (Home, Waga, Wyzwania, Zadania, Więcej). "Więcej" otwiera bottom sheet z pozostałymi modułami.
- **Desktop (>= 768px):** Zwijany lewy sidebar ze wszystkimi modułami.
- **Dashboard** (`app/components/Dashboard.tsx`) — widok główny z danymi live (ostatnia waga, postęp wyzwań, streak, nadchodzące zadania).
- `useIsDesktop()` hook z `app/hooks/useMediaQuery.ts` steruje przełączaniem responsywnym.

### Hierarchia Context Providerów (layout.tsx)

```
PostHogProvider > ThemeProvider > ErrorBoundary > AuthProvider > OnboardingProvider > NavigationProvider
```

Każdy kontekst ma swój hook (`useAuth`, `useTheme`, `useNavigation`, `useOnboarding`). Używaj ich, nie twórz nowych sposobów dostępu do tych danych.

### Moduły i ich dane

| Moduł | Komponent główny | Hook danych | Tabele Supabase | Pliki |
|-------|-----------------|-------------|-----------------|-------|
| **Dashboard** | `Dashboard.tsx` | korzysta z hooków modułów | — | `app/components/Dashboard.tsx` |
| **Tracker** (waga/pomiary) | `WeightTracker.tsx` | `useWeightTracker.ts` | `entries`, `goals`, `profiles`, `goal_history`, `body_measurements` | `app/components/tracker/` |
| **Nawyki** (challenge) | `ChallengeMode.tsx` | `useChallenges.ts` | `challenges` | `app/components/challenge/` |
| **Zadania** (todo) | `TodoModeWeekly.tsx` | `useTasks.ts` | `tasks` (+ localStorage fallback) | `app/components/todo/` |
| **Harmonogram** (schedule) | `ScheduleModeWeekly.tsx` | `useSchedule.ts` | `schedule_items` (+ agreguje tasks i challenges) | `app/components/schedule/` |
| **Posiłki** (meals) | `MealsMode.tsx` | `useMeals.ts`, `usePantry.ts`, `useShoppingList.ts`, `useMealAI.ts` | `meal_preferences`, `meal_plans`, `pantry_items`, `shopping_lists`, `ai_conversations` | `app/components/meals/` |
| **Admin** | `AdminMode.tsx` | `useAdmin.ts` | Odczyt ze wszystkich tabel (service role key) | `app/components/admin/` |

### Warstwa danych — szczegóły

**Dashboard (`Dashboard.tsx`):**
- Agreguje dane z `useWeightTracker`, `useChallenges`, `useTasks`
- Wyświetla: ostatnią wagę, wyzwania na dziś (X/Y), zadania do zrobienia, streak
- "Nadchodzące" — lista nieukończonych zadań i niedokończonych wyzwań na dziś
- Streak liczy kolejne dni gdzie WSZYSTKIE aktywne wyzwania były ukończone (włączając dziś jeśli wszystko zrobione)

**Tracker (`useWeightTracker.ts`):**
- Ładuje wpisy z ostatnich 365 dni z paginacją (100 na stronę)
- Obsługuje cele (goals), profil użytkownika, historię celów
- Automatycznie wykrywa ukończenie celu (osiągnięcie wagi docelowej lub przekroczenie daty)
- Tabele: `entries` (wpisy wagi/kalorii/kroków/treningów/posiłków), `goals`, `profiles`, `goal_history`
- **Posiłki (Meals):** Kolumna `meals` w tabeli `entries` przechowuje dane jako **JSONB**. Każdy posiłek ma: `id`, `name`, `type` (Śniadanie/II Śniadanie/Obiad/Kolacja/Przekąska), `calories`, `protein`, `carbs`, `fat`. Typy zdefiniowane w `app/components/tracker/types.ts` (`Meal`, `MealType`).
- **EntryModal** (`app/components/tracker/EntryModal.tsx`): Formularz wpisu wagowego. Zawiera sekcje: data, waga, kalorie (auto-sumowane z posiłków gdy są obecne), posiłki z makroskładnikami (B/W/T), kroki, treningi, notatki. Sticky podsumowanie dzienne ("Suma dnia") przy przewijaniu. Responsywny grid makro: `grid-cols-2 md:grid-cols-4`. Pole kalorii staje się `readOnly` gdy istnieją posiłki. Przycisk "Importuj z posiłków" (styl X/Twitter, `#1d9bf0` blue pill) pobiera posiłki z modułu Meals na wybraną datę i pozwala wybrać które zaimportować. Wymaga prop `userId`.
- **Pomiary ciała:** Tabela `body_measurements` z polami: `waist`, `hips`, `chest`, `thigh_left/right`, `arm_left/right`, `calf_left/right`. Typy w `app/components/tracker/types.ts` (`BodyMeasurement`).

**Nawyki (`useChallenges.ts`):**
- Każdy challenge ma `startDate`, `endDate`, `completedDays` (mapa data->ilość powtórzeń, np. `{"2026-04-01": 1}`)
- Opcjonalnie śledzi reps (powtórzenia) z `defaultGoal` i `goalUnit`
- Sync z Supabase z obsługą offline (rate limiter w `lib/rateLimiter.ts`)
- Sprawdzanie ukończenia dnia: `(completedDays[dateStr] ?? 0) > 0`

**Zadania (`useTasks.ts`):**
- Każde zadanie ma: `title`, `deadline` (w kodzie) / `date` (w bazie), `priority` (high/medium/low/optional), `status` (done/in_progress/not_started/cancelled), `category` (9 kategorii), `completed` (boolean), opcjonalnie `duration` i `time`
- **WAŻNE — mapowanie kolumn:** Aplikacja używa nazwy `deadline` (typ `Task`), ale tabela Supabase `tasks` ma kolumnę `date`. Mapowanie odbywa się w `useTasks.ts`: przy INSERT/UPDATE wysyłane jest `date: task.deadline`, przy SELECT odczytywane jest `deadline: row.date`. Nie zmieniaj nazwy pola w typie `Task` — zmień tylko payload Supabase.
- **RLS (Row Level Security):** Tabela `tasks` wymaga polityk RLS dla SELECT/INSERT/UPDATE/DELETE z warunkiem `auth.uid() = user_id`. Bez polityki INSERT, dodawanie zadań zwraca błąd `new row violates row-level security policy`. Migracja: `supabase/migrations/20260209_fix_tasks_rls_policies.sql`.
- Migracja starych danych z localStorage do Supabase (jednorazowa, kontrolowana flagą `tasks_migrated_to_supabase_{userId}`)
- Optimistic updates z revert-on-failure (addTask cofa `setTasks` w catch)

**Harmonogram (`useSchedule.ts`):**
- Agreguje dane z `useTasks` + `useChallenges` + własne custom items
- Widok dzienny — łączy wszystko w jeden timeline

**Posiłki ("Co zjem?" — `useMeals.ts`, `useMealAI.ts`, `usePantry.ts`, `useShoppingList.ts`):**
- **Onboarding wizard** (`MealWizard.tsx`): Zbiera dane hard (wiek, waga, wzrost, aktywność, cel) + AI interview (`MealWizardAIInterview.tsx`) dla preferencji kulinarnych
- **Preferencje** (`meal_preferences`): diet_type, goal_type, target_calories, TDEE, alergie, nie-lubi, lubi, kuchnie, has_thermomix, preferences_text
- **Plany posiłków** (`meal_plans`): name, meal_slot, ingredients (JSONB), calories/protein/carbs/fat, recipe_steps, estimated_cost, status (planned/accepted/eaten/rejected), rating, is_favorite
- **Spiżarnia** (`pantry_items`): name, quantity_total/remaining, unit (g/ml/szt), price. Każdy składnik posiłku ma pole `fromPantry?: boolean` (domyślnie `true`) — gdy `false`, składnik jest pomijany przy odliczaniu ze spiżarni i kalkulacji kosztu. Toggle dostępny w trybie edycji składników w MealCard (ikonka Warehouse). Przycisk "Edytuj skład" jest dostępny zarówno dla posiłków zaakceptowanych (`accepted`) jak i zjedzonych (`eaten`).
- **Most Meals↔Tracker** (`lib/mealTrackerBridge.ts`): Łączy moduł posiłków (`meal_plans`) z wpisami wagi (`entries.meals` JSONB). Dwa kierunki: przycisk "Do wagi" na MealCard wysyła nazwę+makro do wpisu wagi na dany dzień; przycisk "Importuj z posiłków" w EntryModal pobiera zaakceptowane/zjedzone posiłki na wybraną datę i pozwala wybrać które importować. Duplikaty wykrywane po nazwie posiłku. Wymaga istniejącego wpisu wagi. Feedback przez Toast (`app/components/ui/Toast.tsx`).
- **Lista zakupów** (`shopping_lists`): name, amount, unit, bought
- **AI chat** (`MealChat.tsx` + `useMealAI.ts`): Rozmowa z AI o posiłkach, structured JSON output z Zod schema. System prompt zawiera rolę eksperta (dietetyka, gotowanie, Thermomix), profil użytkownika, ulubione posiłki, ostatnie posiłki, dostępne produkty w spiżarni.
- **Ulubione** (`FavoriteMeals.tsx`): Lista ulubionych posiłków z akcją "zjedz ponownie"
- **Edytor preferencji** (`PreferencesEditor.tsx`): Tag-based editor + toggle Thermomix + przycisk wywiadu AI
- **Dashboard posiłków** (`MealDashboard.tsx`): Karty posiłków na wybrany dzień + chat + nawigacja do spiżarni/zakupów/kalendarza/ulubionych
- **API route:** `POST /api/meals/chat` — proxy do OpenAI z structured output
- **API route:** `POST /api/meals/nutrition` — Gemini nutrition lookup per składnik. Zwraca `{calories, protein, carbs, fat}`. Rate limit 60/dzień. Odrzuca zerowe odpowiedzi (422).
- **Auto-enrichment makr** (`MealsMode.tsx`): Gdy AI zwraca 0 kcal na składnikach, makra są dociągane sekwencyjnie (300ms przerwy, do 3 prób per składnik). Działa przy akceptacji nowych posiłków ORAZ jednorazowo przy ładowaniu modułu (auto-naprawa istniejących). Zerowe odpowiedzi AI odrzucane na 3 poziomach: API (422), klient (`useNutritionLookup` → null), cache (`nutritionCache` evictuje zera).
- **Nutrition cache** (`nutritionCache.ts`): localStorage, klucze `nutrition:{nazwa}:{unit}`, TTL 30 dni, normalizacja per 100g/ml lub 1 szt. Automatycznie usuwa wpisy z samymi zerami.
- **TDEE:** `lib/tdee.ts` — Mifflin-St Jeor calculation (pure function)

### Offline support i bezpieczeństwo synchronizacji

- `lib/offlineStorage.ts` — IndexedDB (`weight-tracker-offline`, wersja 2) z 4 store'ami: `entries`, `goals`, `syncQueue`, `failedSync`
- `lib/syncManager.ts` — kolejkuje operacje offline, przetwarza po powrocie online, max 3 retry, potem przenosi do failedSync
- Komponenty: `SyncStatusIndicator`, `SyncConflictModal`, `OfflineIndicator`

**SyncStatusIndicator (`app/components/shared/SyncStatusIndicator.tsx`):**
- Zielony flash "Zapisano" (auto-hide po 3s) gdy synchronizacja zakończy się sukcesem (pending spada z >0 do 0)
- Tryb OFFLINE: czerwona etykieta z liczbą oczekujących zmian
- Tryb syncing: niebieski spinner "Zapisywanie..."
- Błędy sync: czerwona etykieta z `animate-pulse`, klikalna aby otworzyć `SyncConflictModal`
- **Ochrona przed utratą danych:** `beforeunload` event blokuje zamknięcie karty gdy `pending > 0 || syncing`

**Banner błędów sync w TodoModeWeekly:**
- Czerwony banner z komunikatem `syncError` i przyciskiem "Ponów" (wywołuje `reloadTasks`)

### API routes (3 server-side endpointy)

- `POST /api/feedback` — zapis feedbacku do Supabase + email przez Resend
- `GET /api/admin/stats` — statystyki admina (wymaga Bearer token + email w liście adminów, używa service role key)
- `POST /api/meals/chat` — proxy do OpenAI/Gemini, structured JSON output z Zod schema
- `POST /api/meals/nutrition` — Gemini nutrition lookup per składnik, rate limit 60/dzień, odrzuca zerowe odpowiedzi (422)
- Wszystkie API routes mają server-side rate limiting (`lib/serverRateLimiter.ts`)

### Biblioteka `lib/`

| Plik | Rola |
|------|------|
| `supabase.ts` | Singleton klienta Supabase (null jeśli brak env vars) |
| `AuthContext.tsx` | Autentykacja: signUp, signIn, signOut, resetPassword, updatePassword |
| `NavigationContext.tsx` | Nawigacja SPA: historia, navigateTo, goBack, goHome |
| `ThemeContext.tsx` | Dark/light theme (localStorage) |
| `OnboardingContext.tsx` | Stan onboardingu per user (localStorage) |
| `PostHogProvider.tsx` | Analytics wrapper (warunkowy) |
| `validation.ts` | Schematy Zod dla wszystkich typów danych + helpery `validateForm`, `getFirstError` |
| `offlineStorage.ts` | IndexedDB CRUD |
| `syncManager.ts` | Kolejka synchronizacji offline->online |
| `rateLimiter.ts` | Client-side rate limiter |
| `serverRateLimiter.ts` | Server-side rate limiter (API routes) |
| `trendAnalysis.ts` | Analiza trendów wagi |
| `retry.ts` | Utility do retry z backoff |
| `notifications.ts` | Web Push notifications |
| `healthIntegrations.ts` | Integracje z Google Fit/Apple Health |
| `useKeyboardShortcuts.ts` | Skróty klawiaturowe |
| `tdee.ts` | Mifflin-St Jeor TDEE calculation (pure function) |
| `mealTrackerBridge.ts` | Most Meals↔Tracker: push meal to entry, fetch meals for date |

### Wspólne komponenty

**UI (`app/components/ui/`):** HeroCard, StatCard, SubtleCard, Badge, ProgressBar, AnimatedCounter, PageTransition, Toast

**Layout (`app/components/layout/`):** AppShell, BottomNav, Sidebar, MoreSheet

**Shared (`app/components/shared/`):** Calendar.tsx, ThemeToggle.tsx, KeyboardShortcutsHelp.tsx, OfflineIndicator.tsx, FeedbackModal.tsx, SyncConflictModal.tsx, SyncStatusIndicator.tsx, SyncIndicator.tsx, ErrorBoundary.tsx, NotificationSettings.tsx, HealthIntegrations.tsx, dateUtils.ts

### Walidacja

Wszystkie formularze powinny korzystać ze schematów Zod z `lib/validation.ts`. Dostępne schematy: `weightEntrySchema` (zawiera `meals` — tablica obiektów z `id`, `name`, `type`, `calories`, `protein`, `carbs`, `fat`), `goalSchema`, `taskSchema`, `challengeSchema`, `bodyMeasurementsSchema`, `feedbackSchema`, `profileSchema`, `emailSchema`, `passwordSchema`. Komunikaty walidacji są po polsku. Moduł posiłków ma własne schematy w `app/components/meals/types.ts`: `aiMealSchema`, `aiInterviewSchema`.

### Wzorce do przestrzegania

1. **Komponenty są `"use client"`** — cała aplikacja działa client-side
2. **Dane z Supabase** — używaj istniejącego klienta z `lib/supabase.ts`, sprawdzaj `if (!supabase)` przed operacjami
3. **Typy** — każdy moduł ma swój `types.ts` z interfejsami i typami
4. **Barrel exports** — moduły eksportują przez `index.ts`
5. **Path alias** — `@/*` mapuje do roota projektu
6. **Stylowanie** — Tailwind utility classes, CSS custom properties: `var(--background)`, `var(--card-bg)`, `var(--card-border)`, `var(--foreground)`, `var(--muted)`, `var(--accent)`, `var(--surface)` (zdefiniowane w `globals.css`)
7. **Kolory motywu** — Light theme domyślny: warm white `#FAFAF9` tło, coral `#FF6B4A` accent. Dark mode: `#13131F` tło, `#FF7B5C` accent. Font: Space Grotesk.
8. **Kolory modułów** — Tracker=coral, Challenges=amber, Todo=blue, Schedule=cyan, Meals=violet, Admin=indigo
9. **Ikony** — `lucide-react`
10. **SSR safety** — guard `typeof window !== "undefined"` przed dostępem do localStorage/navigator/window
11. **Rate limiting** — operacje Supabase w hookach mają client-side rate limiting (`lib/rateLimiter.ts`)
12. **Nowe stringi UI** pisz po polsku
13. **Formatowanie dat lokalnie** — NIE używaj `new Date().toISOString().split('T')[0]` (daje datę UTC, w Polsce po 23:00 przesuwa dzień). Używaj `formatDate(date)` z `app/components/shared/dateUtils.ts` — używa `getFullYear()/getMonth()/getDate()`.
14. **Mapowanie nazw kolumn** — nazwy pól w TypeScript mogą różnić się od kolumn Supabase (np. `deadline` vs `date`, `createdAt` vs `created_at`). Mapowanie odbywa się w hookach danych (`rowToTask`, `insertPayload` itp.), nie w typach.
15. **Optimistic updates** — stan UI aktualizowany natychmiast, revert w catch jeśli Supabase zwróci błąd

### Supabase RLS

Wszystkie tabele używają Row Level Security z politykami `auth.uid() = user_id`. Dotyczy tabel: `entries`, `goals`, `profiles`, `goal_history`, `body_measurements`, `challenges`, `tasks`, `schedule_items`, `meal_preferences`, `meal_plans`, `pantry_items`, `shopping_lists`, `ai_conversations`, `feedback`.

### Migracje SQL

Pliki migracji w `supabase/migrations/`:
- `20241228_create_feedback_table.sql`
- `20251228_create_goal_history_table.sql`
- `20260101_create_body_measurements.sql`
- `20260110_add_workouts_column.sql`
- `20260112_create_tasks_table.sql`
- `20260209_add_meals_column.sql` — kolumna `meals JSONB` w tabeli `entries` + indeks GIN
- `20260209_fix_tasks_rls_policies.sql` — RLS na tabeli `tasks`
- `20260214_add_last_active_to_profiles.sql`
- `20260331_create_meals_tables.sql` — 5 tabel modułu posiłków + RLS
- `20260331_meals_enhancements.sql` — `is_favorite` na `meal_plans`, `has_thermomix` na `meal_preferences`

Migracje uruchamia się ręcznie w Supabase Dashboard > SQL Editor lub przez `supabase db push`.

### Zmienne środowiskowe

**Wymagane:**
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Server-side (API routes):**
- `SUPABASE_SERVICE_ROLE_KEY`

**Opcjonalne:**
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `RESEND_API_KEY`, `FEEDBACK_EMAIL`
- `NEXT_PUBLIC_ADMIN_EMAILS` (lista emaili adminów, comma-separated)
- `OPENAI_API_KEY` — fallback dla AI (chat + nutrition) w module posiłków
- `GEMINI_API_KEY` — główny klucz AI (Gemini 2.0 Flash) dla chat i nutrition lookup

### Testy

- Pliki testów: `__tests__/*.test.ts`
- Setup: `vitest.setup.ts` — globalny mock Supabase i `crypto.randomUUID`
- Środowisko: jsdom
- Istniejące testy: `dateUtils`, `rateLimiter`, `retry`, `useChallenges`, `useWeightTracker`, `tdee`

### Znane wzorce w kodzie

- Hooki danych (np. `useWeightTracker`) zwracają obiekt z danymi, stanami ładowania, i funkcjami CRUD
- Modalne formularze (np. `EntryModal`, `TaskFormModal`) otrzymują `isOpen`/`onClose` props
- Każdy moduł ma komponent `*ModeWeekly` lub `*Mode` jako widok tygodniowy/główny
- Strona główna (`page.tsx`) decyduje co renderować na podstawie `currentMode` z `useNavigation()`
- Optimistic updates: stan UI aktualizowany natychmiast, revert w catch jeśli Supabase zwróci błąd
- Moduł posiłków ma wiele widoków wewnętrznych (dashboard, wizard, interview, pantry, shopping, calendar, charts, settings, favorites, preferences)
