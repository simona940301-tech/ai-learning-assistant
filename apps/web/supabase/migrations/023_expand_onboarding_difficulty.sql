-- ============================================================
-- Migration: 023_expand_onboarding_difficulty.sql
-- Description: Expand difficulty_level range from 1-3 to 1-5
-- Created: 2025-11-23
-- ============================================================

-- Drop the existing constraint
ALTER TABLE onboarding_questions
DROP CONSTRAINT IF EXISTS onboarding_questions_difficulty_level_check;

-- Add new constraint with expanded range (1-5)
ALTER TABLE onboarding_questions
ADD CONSTRAINT onboarding_questions_difficulty_level_check
CHECK (difficulty_level BETWEEN 1 AND 5);

-- Update the comment to reflect new difficulty levels
COMMENT ON COLUMN onboarding_questions.difficulty_level IS
'Difficulty level for DDA (Dynamic Difficulty Adjustment):
1 = 基礎詞彙 (建立信心)
2 = 中等詞彙 (稍有挑戰)
3 = 學術應用 (抽象概念)
4 = 高階詞彙辨析
5 = 最高難度 (學測頂標水準)';
