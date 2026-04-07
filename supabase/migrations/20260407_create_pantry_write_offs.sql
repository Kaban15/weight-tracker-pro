-- supabase/migrations/20260407_create_pantry_write_offs.sql

CREATE TABLE pantry_write_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pantry_item_id UUID REFERENCES pantry_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  cost_per_unit REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  note TEXT,
  written_off_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE pantry_write_offs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own write-offs"
  ON pantry_write_offs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own write-offs"
  ON pantry_write_offs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own write-offs"
  ON pantry_write_offs FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_pantry_write_offs_user_date
  ON pantry_write_offs(user_id, written_off_at DESC);
