-- Fix: Ensure RLS is enabled and all CRUD policies exist for the tasks table.
-- Without SELECT policy, Supabase returns empty array (no error!) — tasks "disappear" after refresh.

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts (safe to run multiple times)
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- SELECT: user can read only their own tasks
CREATE POLICY "Users can view own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

-- INSERT: user can only insert tasks where user_id matches their auth id
CREATE POLICY "Users can insert own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: user can only update their own tasks
CREATE POLICY "Users can update own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: user can only delete their own tasks
CREATE POLICY "Users can delete own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
