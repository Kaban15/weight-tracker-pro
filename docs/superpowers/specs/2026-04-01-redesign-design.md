# Weight Tracker Pro — Full Redesign Spec

## Goal

Redesign the app from a generic "AI dark dashboard" look to an energetic, motivational fitness app feel (Strava/Nike Run Club vibe). The change should make the app feel like a native mobile app rather than a template website.

## Design Decisions (from grill-me session)

| Decision | Choice |
|---|---|
| Vibe | Energetic/motivational (Strava/Nike) |
| Primary color | Coral/orange (`#FF6B4A`) replacing emerald |
| Default theme | Light-first, dark mode preserved |
| Font | Space Grotesk (replacing Geist) |
| Cards | Mixed hierarchy — bold hero cards for key stats, subtle cards for context |
| Navigation | Bottom nav (mobile) + sidebar (desktop), persistent |
| Animations | Subtle — smooth transitions, fade-in, animated progress bars |
| Scope | Full rebuild with shared design system |

## 1. Color Palette

### Light Mode (default)

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#FAFAF9` | Page background (warm white) |
| `--card` | `#FFFFFF` | Card backgrounds |
| `--card-border` | `#E5E5E0` | Card borders |
| `--text-primary` | `#1A1A2E` | Headings, primary text |
| `--text-muted` | `#6B6B80` | Secondary text, labels |
| `--surface` | `#F5F5F2` | Subtle card backgrounds, inputs |
| `--primary` | `#FF6B4A` | Primary accent (coral) |
| `--primary-light` | `#FF8566` | Gradient end, hover states |
| `--primary-dark` | `#E5502E` | Active/pressed states |

### Dark Mode

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#13131F` | Page background (warm dark with purple tint) |
| `--card` | `#1E1E30` | Card backgrounds |
| `--card-border` | `#2A2A3D` | Card borders |
| `--text-primary` | `#E8E8F0` | Headings, primary text |
| `--text-muted` | `#8888A0` | Secondary text, labels |
| `--surface` | `#1A1A2A` | Subtle card backgrounds |
| `--primary` | `#FF7B5C` | Primary accent (brighter coral for dark bg) |
| `--primary-light` | `#FF9580` | Gradient end |
| `--primary-dark` | `#E5603E` | Active/pressed |

### Module Colors

| Module | Color | Usage |
|---|---|---|
| Tracker | `#FF6B4A` (coral) | Weight, body measurements |
| Challenges | `#F59E0B` (amber) | Habits, streaks (unchanged) |
| Todo | `#3B82F6` (blue) | Tasks (changed from rose — calmer, better contrast with coral) |
| Schedule | `#06B6D4` (cyan) | Daily schedule (unchanged) |
| Meals | `#A855F7` (violet) | Meal tracking (unchanged) |
| Admin | `#6366F1` (indigo) | Admin dashboard (unchanged) |

## 2. Typography

**Font family:** Space Grotesk (Google Fonts) replacing Geist.

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | `text-3xl` (30px) | 700 | Hero card main number |
| H1 | `text-2xl` (24px) | 700 | Page titles |
| H2 | `text-xl` (20px) | 600 | Section headings |
| H3 | `text-lg` (18px) | 600 | Card titles |
| Body | `text-base` (16px) | 400 | Default text |
| Small | `text-sm` (14px) | 400 | Labels, secondary info |
| Caption | `text-xs` (12px) | 400 | Timestamps, metadata |
| Uppercase label | `text-xs` | 500 | `uppercase tracking-wider`, hero card labels |

Geist Mono stays for any monospaced content.

## 3. Navigation

### Current State

ModeSelector hub (grid of cards) → click to enter module → back button to return.

### New State

Persistent navigation visible on all screens. No hub — replaced by Dashboard.

### Mobile (< 768px): Bottom Navigation Bar

- Fixed at bottom, 5 items: Home (dashboard), Waga, Wyzwania, Zadania, Więcej
- "Więcej" opens an overlay/sheet with: Harmonogram, Posiłki, Admin, Ustawienia
- Active item: coral color + bold label
- Inactive: muted text color
- Height: ~64px + safe area padding
- White/dark background with top border
- Icons: Lucide (Home, Scale, Target, CheckSquare, MoreHorizontal)

### Desktop (>= 768px): Sidebar

- Fixed left sidebar, 220px wide
- App logo/name at top
- Full list of modules (no "Więcej" overflow)
- Active item: coral tinted background (`#FFF0ED` light / `#2a1a1a` dark) + coral text
- Inactive: muted text
- Settings at bottom
- Collapsible to icon-only (56px) for more content space

### Dashboard (replaces ModeSelector)

- Default "Home" view when app loads
- Hero card: today's weight (or prompt to log if missing)
- Stat cards grid: challenges progress, task count, calorie summary
- "Nadchodzące" list: aggregated upcoming tasks + pending challenges (like a mini Schedule view)
- Quick-action buttons to log weight, add task, etc.

## 4. Card Hierarchy

Three visual levels replace the current uniform `border-2 border-slate-700 rounded-xl`:

### Hero Card

- Gradient background using module color (e.g., `linear-gradient(135deg, #FF6B4A, #FF8566)`)
- White text, large numbers
- Embedded progress bar (white/translucent)
- Max 1 per view — the most important stat
- `rounded-2xl` (16px), generous padding (20-24px)
- Used for: today's weight, challenge daily progress, weekly summary

### Standard Card

- White background (light) / `--card` (dark) with `--card-border` border (1px)
- Hover: `translateY(-2px)` + `box-shadow: 0 8px 24px rgba(0,0,0,0.08)`
- `rounded-xl` (14px), padding 16px
- Badges/tags use pastel backgrounds with saturated text (e.g., `bg-blue-50 text-blue-600`)
- Used for: task items, challenge entries, weight log entries, meal entries

### Subtle Card

- No border, `--surface` background fill
- No hover effects
- `rounded-xl` (12px), padding 14px
- Used for: tips, metadata summaries, weekly stats, empty states

## 5. Animations

All animations use `cubic-bezier(0.16, 1, 0.3, 1)` (fast start, gentle landing).

### Timing Tiers

| Tier | Duration | Usage |
|---|---|---|
| Micro | 150-200ms | Hover lift, button press, toggle |
| Standard | 300-400ms | Card fade-in, page slide, expand/collapse |
| Emphasis | 600-800ms | Counter count-up, progress bar fill |

### Specific Animations

1. **Fade In Up:** Cards enter with `opacity: 0 → 1` and `translateY(12px → 0)`, 400ms. List items stagger with 50ms delay between each.
2. **Progress Bar Fill:** `width: 0% → target%`, 800ms. Triggered on mount/data load.
3. **Animated Counter:** `requestAnimationFrame` count from 0 to target value, 800ms ease-out. For hero card stats.
4. **Hover Lift:** Standard cards: `translateY(-2px)` + shadow increase, 200ms.
5. **Page Transition:** Slide left/right + opacity crossfade when switching between modules via nav, 300ms.

### Implementation

- CSS transitions for hover/micro interactions
- A `useAnimatedCounter` hook for count-up numbers
- A `PageTransition` wrapper component for module switches
- `IntersectionObserver`-based fade-in for cards entering viewport (staggered)
- `prefers-reduced-motion` media query disables all motion animations

## 6. Shared Component Library

New directory: `app/components/ui/`

| Component | Props | Description |
|---|---|---|
| `HeroCard` | `color`, `label`, `value`, `subtitle`, `progress?` | Gradient card with main stat |
| `StatCard` | `label`, `value`, `description`, `color` | Small stat card |
| `SubtleCard` | `icon?`, `title?`, `children` | Borderless context card |
| `Badge` | `color`, `label` | Pastel tag |
| `ProgressBar` | `value`, `max`, `color`, `animated?` | Gradient progress bar |
| `AnimatedCounter` | `value`, `suffix?`, `decimals?` | Count-up number display |
| `BottomNav` | `activeItem`, `onNavigate` | Mobile bottom navigation |
| `Sidebar` | `activeItem`, `onNavigate`, `collapsed?` | Desktop sidebar |
| `AppShell` | `children` | Layout wrapper — renders Sidebar (desktop) or BottomNav (mobile) |
| `PageTransition` | `children`, `direction?` | Slide/fade transition wrapper |

## 7. Theme System Changes

### Current

- CSS variables in `globals.css` with `@theme inline`
- ThemeContext in `lib/ThemeContext.tsx`
- Default: dark mode
- Colors: slate-based neutrals

### New

- Same CSS variable approach, but with new warm color tokens (see Section 1)
- Default changes to light mode
- ThemeContext: default `"light"` instead of `"dark"`
- Background gradient removed — solid `--bg` color for cleaner look
- Meta theme color updates: `#FAFAF9` (light) / `#13131F` (dark)

## 8. Migration Strategy

### What Changes

- `app/globals.css` — new color tokens, font import, animation keyframes
- `app/layout.tsx` — Space Grotesk font import, default theme
- `lib/ThemeContext.tsx` — default to light
- `app/components/ModeSelector.tsx` — replaced by Dashboard component
- `app/components/NavigationContext.tsx` — refactored for persistent nav (no "back to hub")
- All module components — updated colors (emerald → coral, rose → blue), card classes
- New `app/components/ui/` directory with shared components
- New `app/components/Dashboard.tsx` — replaces ModeSelector
- New `app/components/layout/AppShell.tsx`, `BottomNav.tsx`, `Sidebar.tsx`

### What Stays

- All data hooks (`useWeightTracker`, `useChallenges`, `useTasks`, `useSchedule`) — unchanged
- Supabase integration — unchanged
- API routes — unchanged
- Business logic within modules — unchanged
- Offline support — unchanged
- Auth flow — unchanged (visual refresh only)

### Existing User Impact

- Users with saved dark theme preference keep dark mode (localStorage preserved)
- New users / cleared storage get light mode
- Navigation muscle memory changes (hub → persistent nav) — biggest UX shift

## 9. Files Affected

### New Files

- `app/components/ui/HeroCard.tsx`
- `app/components/ui/StatCard.tsx`
- `app/components/ui/SubtleCard.tsx`
- `app/components/ui/Badge.tsx`
- `app/components/ui/ProgressBar.tsx`
- `app/components/ui/AnimatedCounter.tsx`
- `app/components/ui/PageTransition.tsx`
- `app/components/ui/index.ts` (barrel export)
- `app/components/layout/AppShell.tsx`
- `app/components/layout/BottomNav.tsx`
- `app/components/layout/Sidebar.tsx`
- `app/components/layout/index.ts`
- `app/components/Dashboard.tsx`
- `app/hooks/useAnimatedCounter.ts`
- `app/hooks/useMediaQuery.ts` (for responsive nav switching)

### Modified Files

- `app/globals.css` — color tokens, font, animations
- `app/layout.tsx` — font import, AppShell wrapper
- `lib/ThemeContext.tsx` — default theme change
- `app/page.tsx` — render Dashboard instead of ModeSelector
- `app/components/NavigationContext.tsx` — persistent nav logic
- `app/components/tracker/**` — color updates, use shared components
- `app/components/challenge/**` — color updates, use shared components
- `app/components/todo/**` — color updates (rose → blue), use shared components
- `app/components/schedule/**` — use shared components
- `app/components/meals/**` — use shared components
- `app/components/admin/**` — use shared components
- `app/components/shared/Modal.tsx` — updated colors/styling

### Potentially Removed

- `app/components/ModeSelector.tsx` — replaced by Dashboard
