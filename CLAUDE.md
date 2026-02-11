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
- **Zod v4** for validation (`lib/validation.ts`)
- **Vitest** with jsdom + React Testing Library for tests
- **Sentry** for error tracking (conditional, only when `NEXT_PUBLIC_SENTRY_DSN` is set)
- **PostHog** for analytics (conditional, only when `NEXT_PUBLIC_POSTHOG_KEY` is set)
- **Resend** for transactional emails (feedback route)
- **Recharts** for data visualization
- **PWA** with service worker registration in layout

## Architecture

### Single-Page App with Client-Side Navigation

This is effectively a single-page app despite using Next.js App Router. The entire app is a single route (`app/page.tsx`) that renders different "modes" based on client-side navigation state managed by `NavigationContext`. There is no file-based routing for app views (except `app/reset-password/page.tsx`).

The navigation flow is: **Auth** -> **WelcomeModal** (first visit) -> **ModeSelector** (hub) -> one of the modes:
- `tracker` - Weight/body tracking with goals, entries, charts, body measurements
- `challenge` - Daily habit tracking (e.g., push-ups, exercises)
- `todo` - Task management with priorities, categories, deadlines
- `schedule` - Combined daily view aggregating tasks + habits
- `admin` - Admin dashboard (email-gated)

### Context Provider Stack (in `app/layout.tsx`)

PostHogProvider > ThemeProvider > ErrorBoundary > AuthProvider > OnboardingProvider > NavigationProvider

### Data Layer

- **Weight tracker** (`app/components/tracker/useWeightTracker.ts`): All data in Supabase tables (`entries`, `goals`, `profiles`, `goal_history`). Implements paginated loading (365 days initially, load-more for older).
- **Challenges/Habits** (`app/components/challenge/useChallenges.ts`): Supabase `challenges` table with offline sync support.
- **Tasks** (`app/components/todo/useTasks.ts`): Supabase `tasks` table with localStorage fallback/migration.
- **Schedule** (`app/components/schedule/useSchedule.ts`): Aggregates data from tasks + challenges modules. Has its own `schedule_items` Supabase table for custom items.
- **Onboarding state**: localStorage only (per-user key).
- **Theme preference**: localStorage only.

### Offline Support

IndexedDB-based offline storage (`lib/offlineStorage.ts`) with a sync queue (`lib/syncManager.ts`). Operations are queued when offline and processed when connectivity returns. Failed syncs are tracked separately and can be retried or discarded.

### API Routes

Only two server-side API routes exist:
- `app/api/feedback/route.ts` - Saves feedback to Supabase + sends email via Resend
- `app/api/admin/stats/route.ts` - Admin statistics endpoint (uses Supabase service role key to bypass RLS)

Both use server-side rate limiting from `lib/serverRateLimiter.ts`.

### Path Alias

`@/*` maps to the project root (configured in `tsconfig.json`).

### UI Language

The app UI is in **Polish**. Validation messages, labels, and user-facing strings are in Polish.

## Important Patterns and Gotchas

### Date Formatting (Critical)

**Never** use `new Date().toISOString().split('T')[0]` — it returns UTC date, which shifts to the wrong day in Poland after 23:00. Always use `formatLocalDate(date)` from `app/components/todo/types.ts` or `formatDate(date)` from `app/components/tracker/types.ts` — both use `getFullYear()/getMonth()/getDate()` for local time.

### Column Name Mapping (Tasks)

The `Task` TypeScript type uses `deadline`, but the Supabase `tasks` table column is `date`. Mapping happens in `useTasks.ts` (`rowToTask` for reads, insert payload for writes). Don't rename the TypeScript field — only adjust the Supabase payload.

### Code Conventions

- All components are `"use client"` — the entire app runs client-side
- Always check `if (!supabase)` before Supabase operations (client is `null` when env vars are missing)
- Guard `typeof window !== "undefined"` before accessing localStorage/navigator/window (SSR safety)
- New UI strings must be in **Polish**
- Dark theme is default: `slate-950/900` backgrounds, `emerald-500` accent color
- Icons come from `lucide-react`
- Each module has its own `types.ts` and exports through `index.ts` barrel files
- Optimistic updates: UI state updated immediately, reverted in `catch` if Supabase fails
- Data hooks (`useWeightTracker`, `useChallenges`, `useTasks`) have client-side rate limiting via `lib/rateLimiter.ts`

### Supabase RLS

All tables use Row Level Security with `auth.uid() = user_id` policies. The `tasks` table specifically requires SELECT/INSERT/UPDATE/DELETE policies — missing INSERT policy causes "new row violates row-level security policy" errors. See `supabase/migrations/20260209_fix_tasks_rls_policies.sql`.

### SQL Migrations

Migration files live in `supabase/migrations/`. Run them manually in Supabase Dashboard > SQL Editor or via `supabase db push`.

## Testing

Tests live in `__tests__/` and use Vitest with jsdom. The setup file (`vitest.setup.ts`) globally mocks Supabase and `crypto.randomUUID`. Tests cover utilities (`dateUtils`, `rateLimiter`, `retry`) and hooks (`useChallenges`, `useWeightTracker`).

## Environment Variables

Required for core functionality:
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase client
- `SUPABASE_SERVICE_ROLE_KEY` - For admin API route (server-side only)

Optional:
- `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
- `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`
- `RESEND_API_KEY`, `FEEDBACK_EMAIL`
- `NEXT_PUBLIC_ADMIN_EMAILS` - Comma-separated list of admin email addresses
