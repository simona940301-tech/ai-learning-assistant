-- Migration: Shadow A/B Testing Logs
-- Date: 2025-01-30
-- Description: Stores predictions from algorithms vs actual outcomes for validation.

CREATE TABLE IF NOT EXISTS algo_shadow_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  algorithm_id TEXT NOT NULL, -- e.g., 'elo_v1', 'recommender_b'
  prediction JSONB NOT NULL, -- e.g., { "expected_score": 0.7 }
  outcome JSONB NOT NULL, -- e.g., { "actual_score": 1.0 }
  context JSONB DEFAULT '{}'::jsonb, -- e.g., { "question_id": "...", "tags": [] }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analysis
CREATE INDEX IF NOT EXISTS idx_algo_shadow_logs_algo ON algo_shadow_logs(algorithm_id);
CREATE INDEX IF NOT EXISTS idx_algo_shadow_logs_created_at ON algo_shadow_logs(created_at DESC);

-- RLS
ALTER TABLE algo_shadow_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System can insert shadow logs"
  ON algo_shadow_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view shadow logs"
  ON algo_shadow_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
