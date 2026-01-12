-- Goal history table to store completed goals
CREATE TABLE IF NOT EXISTS goal_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Original goal snapshot
  original_goal_id UUID,
  current_weight DECIMAL(5,2) NOT NULL,
  target_weight DECIMAL(5,2) NOT NULL,
  start_date DATE NOT NULL,
  target_date DATE NOT NULL,
  weekly_weight_loss DECIMAL(3,2),
  daily_calories_limit INTEGER,
  daily_steps_goal INTEGER,
  weekly_training_hours DECIMAL(3,1),
  monitoring_method TEXT,

  -- Completion metadata
  completion_type TEXT NOT NULL CHECK (completion_type IN ('target_reached', 'date_passed', 'manual')),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Final stats at completion
  final_weight DECIMAL(5,2) NOT NULL,
  weight_lost DECIMAL(5,2) NOT NULL,
  progress_percentage DECIMAL(5,2) NOT NULL,
  total_entries INTEGER NOT NULL DEFAULT 0,
  total_workouts INTEGER NOT NULL DEFAULT 0,
  avg_calories DECIMAL(6,1),
  avg_steps INTEGER,
  best_weight DECIMAL(5,2),
  current_streak INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_goal_history_user_id ON goal_history(user_id);
CREATE INDEX IF NOT EXISTS idx_goal_history_completed_at ON goal_history(completed_at DESC);

-- Enable RLS
ALTER TABLE goal_history ENABLE ROW LEVEL SECURITY;

-- Users can only see their own history
DROP POLICY IF EXISTS "Users can view own goal history" ON goal_history;
CREATE POLICY "Users can view own goal history" ON goal_history
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own history
DROP POLICY IF EXISTS "Users can insert own goal history" ON goal_history;
CREATE POLICY "Users can insert own goal history" ON goal_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own history
DROP POLICY IF EXISTS "Users can delete own goal history" ON goal_history;
CREATE POLICY "Users can delete own goal history" ON goal_history
  FOR DELETE USING (auth.uid() = user_id);
