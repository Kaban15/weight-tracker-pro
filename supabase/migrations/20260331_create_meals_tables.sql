-- supabase/migrations/20260331_create_meals_tables.sql

-- 1. meal_preferences
CREATE TABLE IF NOT EXISTS meal_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  diet_type TEXT NOT NULL DEFAULT 'standard',
  goal_type TEXT NOT NULL DEFAULT 'maintain',
  calorie_adjustment INTEGER NOT NULL DEFAULT 0,
  tdee REAL NOT NULL DEFAULT 2000,
  target_calories REAL NOT NULL DEFAULT 2000,
  meals_per_day INTEGER NOT NULL DEFAULT 4,
  meal_names JSONB NOT NULL DEFAULT '["Śniadanie","Obiad","Przekąska","Kolacja"]',
  preferences_text TEXT NOT NULL DEFAULT '',
  allergies JSONB NOT NULL DEFAULT '[]',
  disliked_foods JSONB NOT NULL DEFAULT '[]',
  liked_foods JSONB NOT NULL DEFAULT '[]',
  cuisines JSONB NOT NULL DEFAULT '[]',
  custom_tdee REAL,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE meal_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own meal_preferences" ON meal_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal_preferences" ON meal_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal_preferences" ON meal_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal_preferences" ON meal_preferences FOR DELETE USING (auth.uid() = user_id);

-- 2. meal_plans
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_slot TEXT NOT NULL,
  name TEXT NOT NULL,
  ingredients JSONB NOT NULL DEFAULT '[]',
  calories REAL NOT NULL DEFAULT 0,
  protein REAL NOT NULL DEFAULT 0,
  carbs REAL NOT NULL DEFAULT 0,
  fat REAL NOT NULL DEFAULT 0,
  recipe_steps JSONB NOT NULL DEFAULT '[]',
  estimated_cost REAL,
  status TEXT NOT NULL DEFAULT 'planned',
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  rating_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_user_date ON meal_plans(user_id, date);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own meal_plans" ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal_plans" ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal_plans" ON meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal_plans" ON meal_plans FOR DELETE USING (auth.uid() = user_id);

-- 3. pantry_items
CREATE TABLE IF NOT EXISTS pantry_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity_total REAL NOT NULL,
  quantity_remaining REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  price REAL NOT NULL DEFAULT 0,
  purchased_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own pantry_items" ON pantry_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pantry_items" ON pantry_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pantry_items" ON pantry_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pantry_items" ON pantry_items FOR DELETE USING (auth.uid() = user_id);

-- 4. shopping_lists
CREATE TABLE IF NOT EXISTS shopping_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount REAL NOT NULL,
  unit TEXT NOT NULL DEFAULT 'g',
  bought BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own shopping_lists" ON shopping_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopping_lists" ON shopping_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shopping_lists" ON shopping_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shopping_lists" ON shopping_lists FOR DELETE USING (auth.uid() = user_id);

-- 5. ai_conversations
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_date)
);

ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own ai_conversations" ON ai_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own ai_conversations" ON ai_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ai_conversations" ON ai_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ai_conversations" ON ai_conversations FOR DELETE USING (auth.uid() = user_id);
