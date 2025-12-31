-- ============================================
-- User Answers Table for Ready Score Calculation
-- ============================================
-- Purpose: Track user answers for Dream School Ready Score analytics
-- Architecture: A++ Design following 011_play_battle_schema.sql conventions
-- Author: AI Assistant
-- Date: 2025-12-10

-- ============================================
-- 1. Create user_answers Table
-- ============================================
CREATE TABLE IF NOT EXISTS user_answers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL, -- Flexible: supports UUID or string IDs
  is_correct BOOLEAN NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb, -- Stores subject, difficulty, response_time_ms, source
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Create Optimized Indexes
-- ============================================
-- User-scoped queries (most common)
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id 
  ON user_answers(user_id);

-- Time-based queries
CREATE INDEX IF NOT EXISTS idx_user_answers_created_at 
  ON user_answers(created_at DESC);

-- Subject filtering (for Ready Score calculation)
CREATE INDEX IF NOT EXISTS idx_user_answers_subject 
  ON user_answers((metadata->>'subject'));

-- Difficulty filtering (for weighted accuracy)
CREATE INDEX IF NOT EXISTS idx_user_answers_difficulty 
  ON user_answers(((metadata->>'difficulty')::INTEGER));

-- Composite index for Ready Score queries (optimal performance)
CREATE INDEX IF NOT EXISTS idx_user_answers_ready_score 
  ON user_answers(user_id, (metadata->>'subject'), ((metadata->>'difficulty')::INTEGER))
  WHERE (metadata->>'subject') = 'english';

-- ============================================
-- 3. Enable Row Level Security
-- ============================================
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Create RLS Policies
-- ============================================
-- Policy: Users can view their own answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_answers' 
    AND policyname = 'Users can view own answers'
  ) THEN
    CREATE POLICY "Users can view own answers"
      ON user_answers FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: Users can insert their own answers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_answers' 
    AND policyname = 'Users can insert own answers'
  ) THEN
    CREATE POLICY "Users can insert own answers"
      ON user_answers FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Policy: System can manage all answers (for admin/analytics)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'user_answers' 
    AND policyname = 'System can manage answers'
  ) THEN
    CREATE POLICY "System can manage answers"
      ON user_answers FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ============================================
-- 5. Add Table Comment (Documentation)
-- ============================================
COMMENT ON TABLE user_answers IS 'Stores user answers for Ready Score calculation and learning analytics. Each record represents one question answered by a user.';
COMMENT ON COLUMN user_answers.user_id IS 'Reference to the user who answered the question';
COMMENT ON COLUMN user_answers.question_id IS 'ID of the question (flexible format: UUID or string)';
COMMENT ON COLUMN user_answers.is_correct IS 'Whether the answer was correct';
COMMENT ON COLUMN user_answers.metadata IS 'JSONB containing: subject, difficulty (1-5), response_time_ms, source';
COMMENT ON COLUMN user_answers.created_at IS 'Timestamp when the answer was recorded';
