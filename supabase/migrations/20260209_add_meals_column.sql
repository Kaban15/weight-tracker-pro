-- Add meals column to entries table for storing meals per day
-- This is a JSONB array where each item has: { type: string, description: string, calories?: number }

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS meals JSONB DEFAULT NULL;

-- Add an index for better query performance on meals
CREATE INDEX IF NOT EXISTS idx_entries_meals ON entries USING GIN (meals);

-- Comment for documentation
COMMENT ON COLUMN entries.meals IS 'Array of meals: [{type: string, description: string, calories?: number}]';
