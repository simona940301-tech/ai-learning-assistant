-- Migration: Add game_mode and editor_data fields to seed_questions
-- Date: 2024-12-05
-- Purpose: Support Editor Mode and Detective Mode questions

-- Add game_mode column to distinguish between different game types
ALTER TABLE seed_questions 
ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'practice';

-- Add comment to explain the column
COMMENT ON COLUMN seed_questions.game_mode IS 'Game mode type: practice (standard 4-choice), editor (cloze test), detective (evidence-based reasoning)';

-- Add editor_data column for Editor Mode specific data
ALTER TABLE seed_questions 
ADD COLUMN IF NOT EXISTS editor_data JSONB;

-- Add comment to explain the structure
COMMENT ON COLUMN seed_questions.editor_data IS 'Editor Mode data: {topic, article_text, blanks[], option_pool[], distractor_options[]}';

-- Add detective_data column for Detective Mode specific data
ALTER TABLE seed_questions 
ADD COLUMN IF NOT EXISTS detective_data JSONB;

-- Add comment to explain the structure
COMMENT ON COLUMN seed_questions.detective_data IS 'Detective Mode data: {case_name, topic, full_article, key_sentences[], scoring_rubric}';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_seed_questions_game_mode ON seed_questions(game_mode);
CREATE INDEX IF NOT EXISTS idx_seed_questions_editor_data ON seed_questions USING GIN(editor_data) WHERE editor_data IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seed_questions_detective_data ON seed_questions USING GIN(detective_data) WHERE detective_data IS NOT NULL;

-- Update existing questions to have 'practice' as default game_mode
UPDATE seed_questions 
SET game_mode = 'practice' 
WHERE game_mode IS NULL;
