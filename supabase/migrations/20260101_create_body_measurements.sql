-- Body measurements table for tracking body circumferences
CREATE TABLE IF NOT EXISTS body_measurements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,

  -- Measurements in cm
  waist DECIMAL(5,1),          -- talia
  hips DECIMAL(5,1),           -- biodra
  chest DECIMAL(5,1),          -- klatka piersiowa
  thigh_left DECIMAL(5,1),     -- udo lewe
  thigh_right DECIMAL(5,1),    -- udo prawe
  arm_left DECIMAL(5,1),       -- ramię lewe
  arm_right DECIMAL(5,1),      -- ramię prawe
  calf_left DECIMAL(5,1),      -- łydka lewa
  calf_right DECIMAL(5,1),     -- łydka prawa

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(user_id, date)
);

-- Index for faster queries by user
CREATE INDEX IF NOT EXISTS idx_body_measurements_user_id ON body_measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_body_measurements_date ON body_measurements(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own measurements
DROP POLICY IF EXISTS "Users can view own measurements" ON body_measurements;
CREATE POLICY "Users can view own measurements" ON body_measurements
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own measurements
DROP POLICY IF EXISTS "Users can insert own measurements" ON body_measurements;
CREATE POLICY "Users can insert own measurements" ON body_measurements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own measurements
DROP POLICY IF EXISTS "Users can update own measurements" ON body_measurements;
CREATE POLICY "Users can update own measurements" ON body_measurements
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own measurements
DROP POLICY IF EXISTS "Users can delete own measurements" ON body_measurements;
CREATE POLICY "Users can delete own measurements" ON body_measurements
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_body_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS body_measurements_updated_at ON body_measurements;
CREATE TRIGGER body_measurements_updated_at
  BEFORE UPDATE ON body_measurements
  FOR EACH ROW
  EXECUTE FUNCTION update_body_measurements_updated_at();
