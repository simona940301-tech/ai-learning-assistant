-- ============================================
-- Expert Q&A Sessions Table
-- Migration 025 - Support intelligent Q&A
-- ============================================

CREATE TABLE IF NOT EXISTS expert_qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE NOT NULL,

  -- Question & Answer
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  -- Sources & References
  sources JSONB DEFAULT '[]', -- [{type, content, page}]

  -- Performance Metrics
  response_time_ms INTEGER,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_expert_qa_user_id ON expert_qa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_expert_qa_analysis_id ON expert_qa_sessions(analysis_id);
CREATE INDEX IF NOT EXISTS idx_expert_qa_created_at ON expert_qa_sessions(created_at DESC);

-- RLS Policies
ALTER TABLE expert_qa_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own QA sessions" ON expert_qa_sessions;
CREATE POLICY "Users view own QA sessions"
  ON expert_qa_sessions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own QA sessions" ON expert_qa_sessions;
CREATE POLICY "Users create own QA sessions"
  ON expert_qa_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify:
--
-- SELECT * FROM expert_qa_sessions LIMIT 5;
