-- ============================================
-- Quick Fix: Create Essential Tables for PDF Upload
-- ============================================
-- This creates ONLY the essential tables needed for PDF upload to work
-- Run this in Supabase SQL Editor NOW to fix the issue

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. file_analysis table
-- ============================================
CREATE TABLE IF NOT EXISTS file_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Layer 1: Quick Preview (3s target)
  quick_summary TEXT,
  detected_subject TEXT CHECK (detected_subject IN ('chinese', 'english', 'math', 'science', 'social', 'other')),
  detected_topics TEXT[] DEFAULT '{}',

  -- Layer 2: Deep Analysis (15s target)
  core_concepts JSONB DEFAULT '[]',
  key_insights JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  structured_notes TEXT,

  -- Layer 3: Exam Prediction (30s target)
  exam_predictions JSONB DEFAULT '[]',
  weak_points JSONB DEFAULT '[]',
  study_roadmap JSONB DEFAULT '[]',

  -- Metadata
  analysis_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing'
    CHECK (status IN ('processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed')),
  error_message TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(file_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_file_analysis_file_id ON file_analysis(file_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_file_analysis_created_at ON file_analysis(created_at DESC);

-- RLS Policies
ALTER TABLE file_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own analysis" ON file_analysis;
CREATE POLICY "Users view own analysis"
  ON file_analysis FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own analysis" ON file_analysis;
CREATE POLICY "Users create own analysis"
  ON file_analysis FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own analysis" ON file_analysis;
CREATE POLICY "Users update own analysis"
  ON file_analysis FOR UPDATE
  USING (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_file_analysis_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_file_analysis_updated_at ON file_analysis;
CREATE TRIGGER update_file_analysis_updated_at
  BEFORE UPDATE ON file_analysis
  FOR EACH ROW
  EXECUTE FUNCTION update_file_analysis_updated_at();

-- ============================================
-- 2. exam_question_bank table
-- ============================================
CREATE TABLE IF NOT EXISTS exam_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE,

  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'calculation')),
  options JSONB,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,

  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5),
  topic_tags TEXT[] DEFAULT '{}',
  source_pages INTEGER[] DEFAULT '{}',
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  times_practiced INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_questions_file_id ON exam_question_bank(file_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_user_id ON exam_question_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_analysis_id ON exam_question_bank(analysis_id);

-- RLS Policies
ALTER TABLE exam_question_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own exam questions" ON exam_question_bank;
CREATE POLICY "Users view own exam questions"
  ON exam_question_bank FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users create own exam questions" ON exam_question_bank;
CREATE POLICY "Users create own exam questions"
  ON exam_question_bank FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Triggers
CREATE OR REPLACE FUNCTION update_exam_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_exam_questions_updated_at ON exam_question_bank;
CREATE TRIGGER update_exam_questions_updated_at
  BEFORE UPDATE ON exam_question_bank
  FOR EACH ROW
  EXECUTE FUNCTION update_exam_questions_updated_at();

-- ============================================
-- Verification
-- ============================================
-- Check if tables were created successfully
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'file_analysis') THEN
    RAISE NOTICE '✅ file_analysis table created successfully';
  ELSE
    RAISE EXCEPTION '❌ file_analysis table creation failed';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'exam_question_bank') THEN
    RAISE NOTICE '✅ exam_question_bank table created successfully';
  ELSE
    RAISE EXCEPTION '❌ exam_question_bank table creation failed';
  END IF;

  RAISE NOTICE '🎉 PDF upload fix applied successfully! You can now upload PDFs.';
END $$;
