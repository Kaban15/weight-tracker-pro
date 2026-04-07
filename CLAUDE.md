# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Next.js on localhost:3000)
npm run build        # Production build
npm run lint         # ESLint (flat config, next core-web-vitals + typescript)
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:run -- __tests__/dateUtils.test.ts  # Run a single test file
npm run test:coverage  # Vitest with v8 coverage
```

## Tech Stack

- **Next.js 16** (App Router) with **React 19** and **TypeScript** (strict mode)
- **Supabase** for auth and database (client in `lib/supabase.ts`)
- **Tailwind CSS v4** via `@tailwindcss/postcss`
- **Zod v4** for validation (`lib/validation.ts`, `lib/env.ts`)
- **Vitest** with jsdom + React Testing Library for tests
- **Sentry** for error tracking (conditional, only when `NEXT_PUBLIC_SENTRY_DSN` is set)
- **PostHog** for analytics (conditional, only when `NEXT_PUBLIC_POSTHOG_KEY` is set)
- **Resend** for transactional emails (feedback route)
- **Recharts** for data visualization
- **PWA** with service worker registration in layout

## Architecture

### Single-Page App with Client-Side Navigation

This is effectively a single-page app despite using Next.js App Router. The entire app is a single route (`app/page.tsx`) that renders different "modes" based on client-side navigation state managed by `NavigationContext`. There is no file-based routing for app views (except `app/reset-password/page.tsx`).

The navigation flow is: **Auth** -> **WelcomeModal** (first visit) -> **AppShell** (persistent nav) with **Dashboard** (home) or one of the modes:
- `tracker` - Weight/body tracking with goals, entries, charts, body measurements
- `challenge` - Daily habit tracking (e.g., push-ups, exercises)
- `todo` - Task management with priorities, categories, deadlines
- `schedule` - Combined daily view aggregating tasks + habits
- `meals` - Meal planning, AI suggestions, pantry, shopping list, auto macro calculation, cost estimation
- `admin` - Admin dashboard (email-gated)

### Navigation System

Navigation uses persistent `AppShell` (`app/components/layout/AppShell.tsx`) instead of the old ModeSelector hub:
- **Mobile (< 768px):** Bottom navigation bar with 5 items (Home, Waga, Wyzwania, Zadania, Więcej). "Więcej" opens a bottom sheet with remaining modules.
- **Desktop (>= 768px):** Collapsible left sidebar with all modules listed.
- **Dashboard** (`app/components/Dashboard.tsx`) replaces ModeSelector as the home view, showing live data (latest weight, challenge progress, upcoming tasks).
- `useIsDesktop()` hook from `app/hooks/useMediaQuery.ts` controls responsive switching.

### Context Provider Stack (in `app/layout.tsx`)

PostHogProvider > ThemeProvider > ErrorBoundary > AuthProvider > OnboardingProvider > NavigationProvider

### Data Layer

- **Weight tracker** (`app/components/tracker/useWeightTracker.ts`): All data in Supabase tables (`entries`, `goals`, `profiles`, `goal_history`). Implements paginated loading (365 days initially, load-more for older).
- **Challenges/Habits** (`app/components/challenge/useChallenges.ts`): Supabase `challenges` table with offline sync support.
- **Tasks** (`app/components/todo/useTasks.ts`): Supabase `tasks` table with localStorage fallback/migration.
- **Schedule** (`app/components/schedule/useSchedule.ts`): Aggregates data from tasks + challenges modules. Has its own `schedule_items` Supabase table for custom items.
- **Meals** (`app/components/meals/useMeals.ts`): Supabase `meal_plans` + `meal_preferences` tables. AI-generated meals via Gemini. Nutrition lookup (`useNutritionLookup.ts`) calls Gemini per ingredient with 800ms debounce and localStorage cache (30-day TTL, normalized per 100g/ml). Cost estimation (`costUtils.ts`) matches ingredients to pantry items by name+unit without deducting. Pantry deduction happens only on "Zjedzony" using FIFO (oldest `purchased_at` first) with spillover — if one pantry item doesn't have enough, the remainder is deducted from the next matching item. Matching logic and cost-per-unit calculation live in shared `pantryUtils.ts` (`findMatchingPantryItems`, `costPerUnit`, `getMonthDateRange`). Each ingredient has `fromPantry?: boolean` (default `true`) — when `false`, the ingredient is skipped during pantry deduction and cost calculation. Toggle is available in MealCard edit mode (Warehouse icon per ingredient). "Edytuj skład" button is available for both `accepted` and `eaten` meals. **Auto-enrichment** (`useMealEnrichment.ts`): when meals are accepted or loaded with 0 kcal ingredients, macros are re-fetched sequentially (300ms delay between ingredients, up to 3 retries each). All-zero AI responses are rejected at API, client, and cache levels. **Meal-to-Tracker Sync** (`useMealTrackerSync.ts`): Handles meal-to-weight-tracker sync via `lib/mealTrackerBridge.ts`. Connects the Meals module (`meal_plans`) with Weight Tracker entries (`entries.meals` JSONB). Two directions: "Do wagi" button on MealCard pushes meal name+macros to the weight entry for that day; "Importuj z posiłków" button in EntryModal (via `MealImportPicker` component) fetches accepted/eaten meals for the selected date and lets user pick which to import. Duplicate detection by meal name. Requires existing weight entry (no auto-create). Toast feedback via `app/components/ui/Toast.tsx`. **Auto-sync to Tracker**: When meal macros change (auto-enrichment or ingredient edit), if the meal was already pushed to the weight tracker, macros are automatically updated in the weight entry using delta-based calorie adjustment (`updateMealInWeightEntry` in bridge). Manual "Odśwież w wadze" button also available in MealCard when meal is already in tracker. **Cost Summary Panel**: Clicking the daily cost amount in MealDashboard expands a dropdown showing weekly (Mon-Sun), monthly (1st-today), and yearly (Jan 1-today) cost totals. Data fetched via `getPeriodCosts()` in `useMeals.ts`. Pantry items can be marked `is_free: true` (gift/not purchased) — these are excluded from `findMatchingPantryItems()`, so they're never deducted and never contribute to cost. Toggle in PantryItemModal via "Nie kupowane (prezent)" button. **Pantry Item Editing**: Inline editing in `PantryManager` (Pencil icon) allows changing name, price, remaining quantity, and `is_free` toggle. Uses `usePantry.updateItem()`. **PantryManager props** use grouped `writeOffs` object to reduce prop drilling.
- **Pantry Write-Offs** (`app/components/meals/usePantryWriteOffs.ts`): Supabase `pantry_write_offs` table with snapshot data + optional FK to `pantry_items` (ON DELETE SET NULL). Users can write off remaining pantry quantities with reasons (spoiled/taken/discarded/other), partial quantities supported. Cost calculated as `quantity × costPerUnit`. Deleting a write-off restores `quantity_remaining` if the pantry item still exists. `PantryManager` has 3 tabs: "Produkty" (active items with `quantity_remaining > 0`), "Archiwum" (used-up items with `quantity_remaining === 0`), "Straty" (chronological write-off history with month filter). Dashboard shows a waste widget with monthly total when > 0 zł, navigates to pantry history via localStorage flag `pantry-show-write-offs`.
- **Steps-to-Challenge Sync** (`lib/stepsChallengeSync.ts`): When saving a weight entry with steps > 0, automatically syncs to active challenges matching "krok" in name or goalUnit (must have `trackReps=true`). Updates `completedDays` with step count. If challenge has `dailyGoals`, goal completion is automatic. Multiple matching challenges supported. Toast feedback in WeightTracker.
- **Onboarding state**: localStorage only (per-user key).
- **Theme preference**: localStorage only.

### Offline Support

IndexedDB-based offline storage (`lib/offlineStorage.ts`) with a sync queue (`lib/syncManager.ts`). Operations are queued when offline and processed when connectivity returns. Failed syncs are tracked separately and can be retried or discarded.

### API Routes

- `app/api/feedback/route.ts` - Saves feedback to Supabase + sends email via Resend. Zod-validated input (`feedbackRequestSchema`), HTML-escaped email template.
- `app/api/admin/stats/route.ts` - Admin statistics endpoint (uses Supabase service role key to bypass RLS). Generic error responses (no internal detail leaking).
- `app/api/meals/chat/route.ts` - AI meal generation via Gemini 2.0 Flash (or GPT-4o-mini fallback). Rate limited to 30/day. Zod-validated input (`mealsChatRequestSchema`).
- `app/api/meals/nutrition/route.ts` - Gemini-powered nutrition lookup for single ingredients. Returns `{calories, protein, carbs, fat}`. Rate limited to 60/day. Rejects all-zero responses with 422. Zod-validated input (`nutritionRequestSchema`).

All use server-side rate limiting from `lib/serverRateLimiter.ts`. All use `getServerEnv()` from `lib/env.ts` for typed, Zod-validated environment variable access (no raw `process.env` or `!` assertions).

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

### UI Language

The app UI is in **Polish**. Validation messages, labels, and user-facing strings are in Polish.

## Important Patterns and Gotchas

### Date Formatting (Critical)

**Never** use `new Date().toISOString().split('T')[0]` — it returns UTC date, which shifts to the wrong day in Poland after 23:00. Always use `formatLocalDate(date)` from `app/components/todo/types.ts` or `formatDate(date)` from `app/components/tracker/types.ts` — both use `getFullYear()/getMonth()/getDate()` for local time.

### Column Name Mapping (Tasks)

The `Task` TypeScript type uses `deadline`, but the Supabase `tasks` table column is `date`. Mapping happens in `useTasks.ts` (`rowToTask` for reads, insert payload for writes). Don't rename the TypeScript field — only adjust the Supabase payload.

### Security

- **API input validation**: All API routes validate input with Zod schemas (`.strip()` + `.safeParse()`). Schemas defined in `lib/validation.ts`.
- **Environment variables**: Server-side env access via `getServerEnv()` from `lib/env.ts` — Zod-validated, typed, lazy (no module-scope parse). Never use raw `process.env` or `!` assertions in API routes.
- **Error responses**: API routes return generic error messages to clients. Never leak `error.message`, stack traces, or internal config state.
- **HTML escaping**: User input interpolated into email templates is escaped via `escapeHtml()` to prevent XSS.
- **Security headers**: Configured in `next.config.ts` — X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy.
- **Service worker**: Registered via `next/script` (not `dangerouslySetInnerHTML`).

### Code Conventions

- All components are `"use client"` — the entire app runs client-side
- Always check `if (!supabase)` before Supabase operations (client is `null` when env vars are missing)
- Guard `typeof window !== "undefined"` before accessing localStorage/navigator/window (SSR safety)
- New UI strings must be in **Polish**
- Use `readonly` on new interface properties
- Light theme is default: warm white `#FAFAF9` backgrounds, coral `#FF6B4A` accent color (dark mode: `#13131F` bg, `#FF7B5C` accent)
- Colors use CSS custom properties: `var(--background)`, `var(--card-bg)`, `var(--card-border)`, `var(--foreground)`, `var(--muted)`, `var(--accent)`, `var(--surface)` — defined in `globals.css`
- Font: Space Grotesk (replaced Geist)
- Shared UI components in `app/components/ui/`: HeroCard, StatCard, SubtleCard, Badge, ProgressBar, AnimatedCounter, PageTransition, Toast
- Layout components in `app/components/layout/`: AppShell, BottomNav, Sidebar, MoreSheet
- Module accent colors: Tracker=coral, Challenges=amber, Todo=blue, Schedule=cyan, Meals=violet, Admin=indigo
- Icons come from `lucide-react`
- Each module has its own `types.ts` and exports through `index.ts` barrel files
- Optimistic updates: UI state updated immediately, reverted in `catch` if Supabase fails
- Data hooks (`useWeightTracker`, `useChallenges`, `useTasks`) have client-side rate limiting via `lib/rateLimiter.ts`

### Supabase RLS

All tables use Row Level Security with `auth.uid() = user_id` policies. The `tasks` table specifically requires SELECT/INSERT/UPDATE/DELETE policies — missing INSERT policy causes "new row violates row-level security policy" errors. See `supabase/migrations/20260209_fix_tasks_rls_policies.sql`.

### SQL Migrations

Migration files live in `supabase/migrations/`. Run them manually in Supabase Dashboard > SQL Editor or via `supabase db push`.

### Component Structure

Large components have been split into focused sub-components:
- **WeightTracker** uses: `ChartControls`, `StatsGrid`, `GoalProgressSection` (in `app/components/tracker/`)
- **EntryModal** uses: `MealsSection`, `WorkoutsSection`, `MealImportPicker` (in `app/components/tracker/`)
- **MealsMode** uses: `useMealEnrichment`, `useMealTrackerSync` hooks (in `app/components/meals/`)

### TypeScript Strictness

- `tsconfig.json` has `noUncheckedIndexedAccess: true` — indexed access returns `T | undefined`
- No `any` types — use `unknown` + type guards
- No `!` non-null assertions — use guards (`if (!x) throw`) or `??`
- Use `??` over `||` for numeric defaults (0 is falsy)

## Testing

Tests live in `__tests__/` and use Vitest with jsdom. The setup file (`vitest.setup.ts`) globally mocks Supabase and `crypto.randomUUID`. Tests cover:
- **Utilities**: `dateUtils`, `rateLimiter`, `retry`, `tdee`, `nutritionLookup`, `estimateCost`, `mealTrackerBridge`
- **Hooks**: `useChallenges`, `useWeightTracker`, `usePantryWriteOffs`, `useTasks`, `useMeals`, `usePantry`
- **API routes**: `feedback`, `nutrition` (in `__tests__/api/`)
- **Components**: `MobileExperience` (touch targets, responsive behavior)

Use `@testing-library/user-event` for user interaction simulation (installed, preferred over `fireEvent`).

## Environment Variables

Validated at runtime by Zod schema in `lib/env.ts` via `getServerEnv()`.

Required for core functionality:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` - For admin API route (server-side only)

Optional:
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `RESEND_API_KEY`, `FEEDBACK_EMAIL`
- `GEMINI_API_KEY` / `OPENAI_API_KEY` - AI meal generation and nutrition lookup
- `NEXT_PUBLIC_ADMIN_EMAILS` - Comma-separated list of admin email addresses
