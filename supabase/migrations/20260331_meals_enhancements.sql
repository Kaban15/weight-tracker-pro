-- supabase/migrations/20260331_meals_enhancements.sql
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE meal_preferences ADD COLUMN IF NOT EXISTS has_thermomix BOOLEAN NOT NULL DEFAULT false;
