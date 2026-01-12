-- Create tasks table for todo items (if not exists)
-- If table exists with different structure, this will add missing columns

-- First, try to create the table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  notes TEXT,
  deadline DATE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low', 'optional')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('done', 'in_progress', 'not_started', 'cancelled')),
  category TEXT NOT NULL DEFAULT 'duties' CHECK (category IN ('health', 'work', 'money', 'family', 'personal_growth', 'duties', 'ideas', 'free_time', 'spirituality')),
  completed BOOLEAN NOT NULL DEFAULT false,
  duration INTEGER,
  time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  -- Add deadline column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deadline') THEN
    ALTER TABLE tasks ADD COLUMN deadline DATE;
  END IF;

  -- Add priority column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'priority') THEN
    ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium';
  END IF;

  -- Add status column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'status') THEN
    ALTER TABLE tasks ADD COLUMN status TEXT NOT NULL DEFAULT 'not_started';
  END IF;

  -- Add category column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'category') THEN
    ALTER TABLE tasks ADD COLUMN category TEXT NOT NULL DEFAULT 'duties';
  END IF;

  -- Add completed column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'completed') THEN
    ALTER TABLE tasks ADD COLUMN completed BOOLEAN NOT NULL DEFAULT false;
  END IF;

  -- Add duration column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'duration') THEN
    ALTER TABLE tasks ADD COLUMN duration INTEGER;
  END IF;

  -- Add time column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'time') THEN
    ALTER TABLE tasks ADD COLUMN time TEXT;
  END IF;

  -- Add notes column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'notes') THEN
    ALTER TABLE tasks ADD COLUMN notes TEXT;
  END IF;

  -- Add title column if missing
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'title') THEN
    ALTER TABLE tasks ADD COLUMN title TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

-- Create indexes (ignore if exist)
CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks(user_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON tasks(status);

-- Create deadline index only if column exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deadline') THEN
    CREATE INDEX IF NOT EXISTS tasks_deadline_idx ON tasks(deadline);
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create policies
CREATE POLICY "Users can view own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Create or replace function for updated_at
CREATE OR REPLACE FUNCTION update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (drop first if exists)
DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON tasks;
CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_tasks_updated_at();
