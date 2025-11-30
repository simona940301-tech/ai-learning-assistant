-- Migration: Add analysis_id column to exam_question_bank if missing
-- This fixes the "column analysis_id does not exist" error when inserting exam questions.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='exam_question_bank' AND column_name='analysis_id') THEN
    ALTER TABLE exam_question_bank
      ADD COLUMN analysis_id UUID REFERENCES file_analysis(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added analysis_id column to exam_question_bank';
  END IF;
END $$;

-- Also ensure index exists
CREATE INDEX IF NOT EXISTS idx_exam_questions_analysis_id ON exam_question_bank(analysis_id);
