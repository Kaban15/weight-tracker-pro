-- Tabela do przechowywania feedbacku od użytkowników
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  category TEXT NOT NULL CHECK (category IN ('bug', 'feature', 'improvement', 'other')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeks dla szybszego wyszukiwania po dacie
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- RLS (Row Level Security)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Polityka: każdy zalogowany użytkownik może dodawać feedback
CREATE POLICY "Users can insert own feedback" ON feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Polityka: tylko admin może czytać wszystkie feedbacki (opcjonalnie)
-- CREATE POLICY "Admins can read all feedback" ON feedback
--   FOR SELECT
--   USING (auth.email() = 'twoj-email@example.com');
