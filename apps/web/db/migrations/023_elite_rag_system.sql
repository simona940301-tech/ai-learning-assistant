-- ============================================
-- Elite RAG System: File Analysis & Exam Prediction
-- Migration 023
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- 1. file_analysis table
-- Stores progressive analysis results (3s → 15s → 30s)
-- ============================================
CREATE TABLE IF NOT EXISTS file_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Layer 1: Quick Preview (3s target)
  quick_summary TEXT,
  detected_subject TEXT CHECK (detected_subject IN ('chinese', 'english', 'math', 'science', 'social', 'other')),
  detected_topics TEXT[] DEFAULT '{}',
  
  -- Layer 2: Deep Analysis (15s target) - NotebookLM style
  core_concepts JSONB DEFAULT '[]', -- [{name, explanation, importance, page_refs}]
  key_insights JSONB DEFAULT '[]', -- [{insight, evidence, page_refs}]
  suggested_questions JSONB DEFAULT '[]', -- [{question, difficulty, topic}]
  structured_notes TEXT, -- Full Markdown notes
  
  -- Layer 3: Exam Prediction (30s target)
  exam_predictions JSONB DEFAULT '[]', -- [{question, answer, explanation, difficulty, source_pages}]
  weak_points JSONB DEFAULT '[]', -- [{concept, reason, practice_suggestion}]
  study_roadmap JSONB DEFAULT '[]', -- [{phase, topics, estimated_hours}]
  
  -- Metadata
  analysis_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(file_id) -- One analysis per file
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_file_analysis_file_id ON file_analysis(file_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_file_analysis_subject ON file_analysis(detected_subject);
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

DROP POLICY IF EXISTS "Users delete own analysis" ON file_analysis;
CREATE POLICY "Users delete own analysis"
  ON file_analysis FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 2. exam_question_bank table
-- AI-generated exam questions from uploaded materials
-- ============================================
CREATE TABLE IF NOT EXISTS exam_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE,
  
  -- Question content
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('multiple_choice', 'short_answer', 'essay', 'calculation')),
  options JSONB, -- [{label: "A", text: "...", is_correct: true}]
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  
  -- Classification
  difficulty INTEGER CHECK (difficulty BETWEEN 1 AND 5), -- 1=easy, 5=hard
  topic_tags TEXT[] DEFAULT '{}',
  source_pages INTEGER[] DEFAULT '{}',
  source_chunks UUID[] DEFAULT '{}', -- References to doc_chunks
  
  -- Quality metrics
  confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
  user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
  times_practiced INTEGER DEFAULT 0,
  times_correct INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_exam_questions_file_id ON exam_question_bank(file_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_user_id ON exam_question_bank(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_analysis_id ON exam_question_bank(analysis_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_difficulty ON exam_question_bank(difficulty);
CREATE INDEX IF NOT EXISTS idx_exam_questions_topics ON exam_question_bank USING GIN (topic_tags);
CREATE INDEX IF NOT EXISTS idx_exam_questions_created_at ON exam_question_bank(created_at DESC);

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

DROP POLICY IF EXISTS "Users update own exam questions" ON exam_question_bank;
CREATE POLICY "Users update own exam questions"
  ON exam_question_bank FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users delete own exam questions" ON exam_question_bank;
CREATE POLICY "Users delete own exam questions"
  ON exam_question_bank FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 3. Helper Functions
-- ============================================

-- Update timestamp trigger for file_analysis
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

-- Update timestamp trigger for exam_question_bank
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
-- 4. Analytics Views (Optional)
-- ============================================

-- View: User's analysis summary
CREATE OR REPLACE VIEW user_analysis_summary AS
SELECT 
  user_id,
  COUNT(*) as total_analyses,
  COUNT(*) FILTER (WHERE status = 'prediction_ready') as completed_analyses,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_analyses,
  AVG(processing_time_ms) as avg_processing_time_ms,
  array_agg(DISTINCT detected_subject) FILTER (WHERE detected_subject IS NOT NULL) as subjects_analyzed
FROM file_analysis
GROUP BY user_id;

-- View: Question bank statistics
CREATE OR REPLACE VIEW question_bank_stats AS
SELECT
  user_id,
  COUNT(*) as total_questions,
  COUNT(*) FILTER (WHERE difficulty = 1) as easy_questions,
  COUNT(*) FILTER (WHERE difficulty = 2) as medium_easy_questions,
  COUNT(*) FILTER (WHERE difficulty = 3) as medium_questions,
  COUNT(*) FILTER (WHERE difficulty = 4) as medium_hard_questions,
  COUNT(*) FILTER (WHERE difficulty = 5) as hard_questions,
  AVG(confidence_score) as avg_confidence,
  COALESCE(SUM(times_practiced), 0) as total_practice_count,
  CASE
    WHEN SUM(times_practiced) > 0
    THEN ROUND((SUM(times_correct)::NUMERIC / SUM(times_practiced)::NUMERIC) * 100, 2)
    ELSE 0
  END as accuracy_percentage
FROM exam_question_bank
GROUP BY user_id;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE file_analysis IS 'Progressive analysis results for uploaded files (3s preview → 15s analysis → 30s prediction)';
COMMENT ON TABLE exam_question_bank IS 'AI-generated exam questions based on uploaded study materials';
COMMENT ON COLUMN file_analysis.status IS 'processing | preview_ready | analysis_ready | prediction_ready | failed';
COMMENT ON COLUMN exam_question_bank.confidence_score IS 'AI confidence in question quality (0.0-1.0)';
