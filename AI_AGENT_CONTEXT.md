## Weight Tracker Pro — Opis aplikacji dla agenta AI

### Czym jest aplikacja

Weight Tracker Pro to **PWA (Progressive Web App)** do śledzenia zdrowia i produktywności. Aplikacja jest w języku **polskim** (wszystkie stringi UI, walidacje, komunikaty błędów). Użytkownik po zalogowaniu widzi hub z 4 modułami do wyboru.

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
3. `ModeSelector` — główny hub z 4 kafelkami
4. Wybrany moduł (`tracker` / `challenge` / `todo` / `schedule` / `admin`)

### Hierarchia Context Providerów (layout.tsx)

```
PostHogProvider > ThemeProvider > ErrorBoundary > AuthProvider > OnboardingProvider > NavigationProvider
```

Każdy kontekst ma swój hook (`useAuth`, `useTheme`, `useNavigation`, `useOnboarding`). Używaj ich, nie twórz nowych sposobów dostępu do tych danych.

### Moduły i ich dane

| Moduł | Komponent główny | Hook danych | Tabele Supabase | Pliki |
|-------|-----------------|-------------|-----------------|-------|
| **Tracker** (waga/posiłki) | `WeightTracker.tsx` | `useWeightTracker.ts` | `entries`, `goals`, `profiles`, `goal_history` | `app/components/tracker/` |
| **Nawyki** (challenge) | `ChallengeMode.tsx` | `useChallenges.ts` | `challenges` | `app/components/challenge/` |
| **Zadania** (todo) | `TodoModeWeekly.tsx` | `useTasks.ts` | `tasks` (+ localStorage fallback) | `app/components/todo/` |
| **Harmonogram** (schedule) | `ScheduleModeWeekly.tsx` | `useSchedule.ts` | `schedule_items` (+ agreguje tasks i challenges) | `app/components/schedule/` |
| **Admin** | `AdminMode.tsx` | `useAdmin.ts` | Odczyt ze wszystkich tabel (service role key) | `app/components/admin/` |

### Warstwa danych — szczegóły

**Tracker (`useWeightTracker.ts`):**
- Ładuje wpisy z ostatnich 365 dni z paginacją (100 na stronę)
- Obsługuje cele (goals), profil użytkownika, historię celów
- Automatycznie wykrywa ukończenie celu (osiągnięcie wagi docelowej lub przekroczenie daty)
- Tabele: `entries` (wpisy wagi/kalorii/kroków/treningów/posiłków), `goals`, `profiles`, `goal_history`
- **Posiłki (Meals):** Kolumna `meals` w tabeli `entries` przechowuje dane jako **JSONB**. Każdy posiłek ma: `id`, `name`, `type` (Śniadanie/II Śniadanie/Obiad/Kolacja/Przekąska), `calories`, `protein`, `carbs`, `fat`. Typy zdefiniowane w `app/components/tracker/types.ts` (`Meal`, `MealType`).
- **EntryModal** (`app/components/tracker/EntryModal.tsx`): Formularz wpisu wagowego. Zawiera sekcje: data, waga, kalorie (auto-sumowane z posiłków gdy są obecne), posiłki z makroskładnikami (B/W/T), kroki, treningi, notatki. Sticky podsumowanie dzienne ("Suma dnia") przy przewijaniu. Responsywny grid makro: `grid-cols-2 md:grid-cols-4`. Pole kalorii staje się `readOnly` gdy istnieją posiłki.
- **Pomiary ciała:** Tabela `body_measurements` z polami: `waist`, `hips`, `chest`, `thigh_left/right`, `arm_left/right`, `calf_left/right`. Typy w `app/components/tracker/types.ts` (`BodyMeasurement`).

**Nawyki (`useChallenges.ts`):**
- Każdy challenge ma `startDate`, `endDate`, `completedDays` (mapa data->ilość powtórzeń)
- Opcjonalnie śledzi reps (powtórzenia) z `defaultGoal` i `goalUnit`
- Sync z Supabase z obsługą offline (rate limiter w `lib/rateLimiter.ts`)

**Zadania (`useTasks.ts`):**
- Każde zadanie ma: `title`, `deadline` (w kodzie) / `date` (w bazie), `priority` (high/medium/low/optional), `status` (done/in_progress/not_started/cancelled), `category` (9 kategorii), opcjonalnie `duration` i `time`
- **WAŻNE — mapowanie kolumn:** Aplikacja używa nazwy `deadline` (typ `Task`), ale tabela Supabase `tasks` ma kolumnę `date`. Mapowanie odbywa się w `useTasks.ts`: przy INSERT/UPDATE wysyłane jest `date: task.deadline`, przy SELECT odczytywane jest `deadline: row.date`. Nie zmieniaj nazwy pola w typie `Task` — zmień tylko payload Supabase.
- **RLS (Row Level Security):** Tabela `tasks` wymaga polityk RLS dla SELECT/INSERT/UPDATE/DELETE z warunkiem `auth.uid() = user_id`. Bez polityki INSERT, dodawanie zadań zwraca błąd `new row violates row-level security policy`. Migracja: `supabase/migrations/20260209_fix_tasks_rls_policies.sql`.
- Migracja starych danych z localStorage do Supabase (jednorazowa, kontrolowana flagą `tasks_migrated_to_supabase_{userId}`)
- Optimistic updates z revert-on-failure (addTask cofa `setTasks` w catch)
- Diagnostyczne logowanie: pełny obiekt błędu Supabase (`message`, `details`, `hint`, `code`) + payload insertu w `console.error`

**Harmonogram (`useSchedule.ts`):**
- Agreguje dane z `useTasks` + `useChallenges` + własne custom items
- Widok dzienny — łączy wszystko w jeden timeline

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

### API routes (jedyne 2 server-side endpointy)

- `POST /api/feedback` — zapis feedbacku do Supabase + email przez Resend
- `GET /api/admin/stats` — statystyki admina (wymaga Bearer token + email w liście adminów, używa service role key)
- Oba mają server-side rate limiting (`lib/serverRateLimiter.ts`)

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

### Wspólne komponenty (`app/components/shared/`)

`Calendar.tsx`, `ThemeToggle.tsx`, `KeyboardShortcutsHelp.tsx`, `OfflineIndicator.tsx`, `FeedbackModal.tsx`, `SyncConflictModal.tsx`, `SyncStatusIndicator.tsx`, `SyncIndicator.tsx`, `ErrorBoundary.tsx`, `NotificationSettings.tsx`, `HealthIntegrations.tsx`, `dateUtils.ts`

### Walidacja

Wszystkie formularze powinny korzystać ze schematów Zod z `lib/validation.ts`. Dostępne schematy: `weightEntrySchema` (zawiera `meals` — tablica obiektów z `id`, `name`, `type`, `calories`, `protein`, `carbs`, `fat`), `goalSchema`, `taskSchema`, `challengeSchema`, `bodyMeasurementsSchema`, `feedbackSchema`, `profileSchema`, `emailSchema`, `passwordSchema`. Komunikaty walidacji są po polsku.

### Wzorce do przestrzegania

1. **Komponenty są `"use client"`** — cała aplikacja działa client-side
2. **Dane z Supabase** — używaj istniejącego klienta z `lib/supabase.ts`, sprawdzaj `if (!supabase)` przed operacjami
3. **Typy** — każdy moduł ma swój `types.ts` z interfejsami i typami
4. **Barrel exports** — moduły eksportują przez `index.ts`
5. **Path alias** — `@/*` mapuje do roota projektu
6. **Stylowanie** — Tailwind utility classes, ciemny motyw jako domyślny (slate-950/900 tła, emerald-500 jako accent)
7. **Ikony** — `lucide-react`
8. **SSR safety** — guard `typeof window !== "undefined"` przed dostępem do localStorage/navigator/window
9. **Rate limiting** — operacje Supabase w hookach mają client-side rate limiting (`lib/rateLimiter.ts`)
10. **Nowe stringi UI** pisz po polsku
11. **Formatowanie dat lokalnie** — NIE używaj `new Date().toISOString().split('T')[0]` (daje datę UTC, w Polsce po 23:00 przesuwa dzień). Używaj `formatLocalDate(date)` z `app/components/todo/types.ts` lub `formatDate(date)` z `app/components/tracker/types.ts` — obie używają `getFullYear()/getMonth()/getDate()`.
12. **Mapowanie nazw kolumn** — nazwy pól w TypeScript mogą różnić się od kolumn Supabase (np. `deadline` vs `date`, `createdAt` vs `created_at`). Mapowanie odbywa się w hookach danych (`rowToTask`, `insertPayload` itp.), nie w typach.

### Migracje SQL

Pliki migracji w `supabase/migrations/`:
- `20260209_add_meals_column.sql` — dodaje kolumnę `meals JSONB` do tabeli `entries` + indeks GIN
- `20260209_fix_tasks_rls_policies.sql` — włącza RLS na tabeli `tasks` i tworzy polityki SELECT/INSERT/UPDATE/DELETE

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

### Testy

- Pliki testów: `__tests__/*.test.ts`
- Setup: `vitest.setup.ts` — globalny mock Supabase i `crypto.randomUUID`
- Środowisko: jsdom
- Istniejące testy: `dateUtils`, `rateLimiter`, `retry`, `useChallenges`, `useWeightTracker`

### Znane wzorce w kodzie

- Hooki danych (np. `useWeightTracker`) zwracają obiekt z danymi, stanami ładowania, i funkcjami CRUD
- Modalne formularze (np. `EntryModal`, `TaskFormModal`) otrzymują `isOpen`/`onClose` props
- Każdy moduł ma komponent `*ModeWeekly` lub `*Mode` jako widok tygodniowy/główny
- Strona główna (`page.tsx`) decyduje co renderować na podstawie `currentMode` z `useNavigation()`
- Optimistic updates: stan UI aktualizowany natychmiast, revert w catch jeśli Supabase zwróci błąd
