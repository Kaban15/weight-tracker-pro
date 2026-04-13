-- Add ingredient_costs JSONB column to meal_plans
-- Stores per-ingredient cost breakdown: {"ingredient_name": cost_or_null}
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS ingredient_costs JSONB;

-- Track whether pantry was actually deducted for this meal
-- false = costs are estimates only, pantry not touched
-- true = deductIngredients() ran successfully
ALTER TABLE meal_plans ADD COLUMN IF NOT EXISTS pantry_deducted BOOLEAN NOT NULL DEFAULT FALSE;
