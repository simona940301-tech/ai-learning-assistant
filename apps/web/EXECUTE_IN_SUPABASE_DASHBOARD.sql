-- ============================================
-- 🚀 Execute this SQL in Supabase Dashboard
-- SQL Editor → New Query → Paste & Run
-- ============================================

-- Step 1: Create file_analysis table if not exists
CREATE TABLE IF NOT EXISTS file_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  quick_summary TEXT,
  detected_subject TEXT CHECK (detected_subject IN ('chinese', 'english', 'math', 'science', 'social', 'other')),
  detected_topics TEXT[] DEFAULT '{}',
  
  core_concepts JSONB DEFAULT '[]',
  key_insights JSONB DEFAULT '[]',
  suggested_questions JSONB DEFAULT '[]',
  structured_notes TEXT,
  
  exam_predictions JSONB DEFAULT '[]',
  weak_points JSONB DEFAULT '[]',
  study_roadmap JSONB DEFAULT '[]',
  
  analysis_version TEXT DEFAULT 'v1.0',
  processing_time_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed')),
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(file_id)
);

-- Step 2: Add analysis_id to exam_question_bank if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='exam_question_bank' AND column_name='analysis_id'
  ) THEN
    ALTER TABLE exam_question_bank
      ADD COLUMN analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE;
    RAISE NOTICE '✅ Added analysis_id column to exam_question_bank';
  ELSE
    RAISE NOTICE 'ℹ️  analysis_id column already exists';
  END IF;
END $$;

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_file_analysis_file_id ON file_analysis(file_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_user_id ON file_analysis(user_id);
CREATE INDEX IF NOT EXISTS idx_file_analysis_status ON file_analysis(status);
CREATE INDEX IF NOT EXISTS idx_exam_questions_analysis_id ON exam_question_bank(analysis_id);

-- Step 4: Enable RLS
ALTER TABLE file_analysis ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies
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

-- Step 6: Create triggers
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
-- ✅ Done! You should see success messages above
-- ============================================
