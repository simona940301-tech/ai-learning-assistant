-- ============================================
-- ChatGPT-Style Architecture - Complete Update
-- Apply these changes manually via Supabase Dashboard
-- ============================================

-- STEP 1: Add 'pending' status support
-- ============================================
ALTER TABLE file_analysis DROP CONSTRAINT IF EXISTS file_analysis_status_check;

ALTER TABLE file_analysis ADD CONSTRAINT file_analysis_status_check
  CHECK (status IN ('pending', 'processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed'));

ALTER TABLE file_analysis ALTER COLUMN status SET DEFAULT 'pending';

-- STEP 2: Create Expert Q&A Sessions table
-- ============================================
CREATE TABLE IF NOT EXISTS expert_qa_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE NOT NULL,

  -- Question & Answer
  question TEXT NOT NULL,
  answer TEXT NOT NULL,

  -- Sources & References
  sources JSONB DEFAULT '[]',

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

-- STEP 3: ChatGPT-Style Storage (remove file dependency)
-- ============================================

-- Add page_count to file_analysis table
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0;

-- Add file_name to file_analysis table
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- Remove file_id foreign key constraint (critical fix!)
ALTER TABLE file_analysis
DROP CONSTRAINT IF EXISTS file_analysis_file_id_fkey;

-- Make file_id nullable (no longer require files table)
ALTER TABLE file_analysis
ALTER COLUMN file_id DROP NOT NULL;

-- Drop unique constraint on file_id (allow multiple analyses)
ALTER TABLE file_analysis
DROP CONSTRAINT IF EXISTS file_analysis_file_id_key;

-- ============================================
-- ✅ VERIFICATION
-- ============================================
-- Run these queries to verify the changes:

-- 1. Check file_analysis columns
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'file_analysis'
-- ORDER BY ordinal_position;

-- 2. Check expert_qa_sessions table exists
-- SELECT * FROM expert_qa_sessions LIMIT 1;

-- 3. Check status constraint
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'file_analysis'::regclass AND conname = 'file_analysis_status_check';
