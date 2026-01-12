-- Add workouts column to entries table for storing multiple workouts per day
-- This is a JSONB array where each item has: { type: string, duration?: number }

ALTER TABLE entries
ADD COLUMN IF NOT EXISTS workouts JSONB DEFAULT NULL;

-- Add an index for better query performance on workouts
CREATE INDEX IF NOT EXISTS idx_entries_workouts ON entries USING GIN (workouts);

-- Comment for documentation
COMMENT ON COLUMN entries.workouts IS 'Array of workouts: [{type: string, duration?: number}]';
