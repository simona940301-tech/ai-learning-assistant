-- ============================================================================
-- Migration: Sync seed_questions to pack_questions for Error Book Support
-- ============================================================================
-- Purpose: Enable PVE battle questions to be saved to error_book
-- Date: 2025-12-08
-- Version: 2.0 (Final - Schema Verified)
-- ============================================================================

-- Step 1: Create PVE Training Pack (if not exists)
INSERT INTO packs (
  id,
  title,
  description,
  subject,
  topic,
  skill,
  grade,
  item_count,
  has_explanation,
  status,
  created_at,
  updated_at
)
VALUES (
  'a0000000-0000-0000-0000-000000000001'::uuid,
  'PVE Training Pack',
  'Auto-generated pack containing all PVE training questions',
  'mixed',
  'PVE Training',
  'mixed',
  'all',
  0,
  true,
  'published',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW(),
  description = EXCLUDED.description;

-- Step 2: Sync all seed_questions to pack_questions
INSERT INTO pack_questions (
  pack_id,
  question_id,
  stem,
  choices,
  answer,
  explanation,
  difficulty,
  has_explanation,
  "order",
  created_at,
  updated_at
)
SELECT 
  'a0000000-0000-0000-0000-000000000001'::uuid as pack_id,
  sq.id as question_id,
  sq.question_text as stem,
  ARRAY[sq.option_a, sq.option_b, sq.option_c, sq.option_d] as choices,
  sq.correct_answer as answer,
  COALESCE(sq.explanation_file_url, '') as explanation,
  CASE 
    WHEN sq.difficulty_level = 1 THEN 'easy'
    WHEN sq.difficulty_level = 2 THEN 'easy'
    WHEN sq.difficulty_level = 3 THEN 'medium'
    WHEN sq.difficulty_level = 4 THEN 'hard'
    WHEN sq.difficulty_level = 5 THEN 'expert'
    ELSE 'medium'
  END as difficulty,
  (sq.explanation_file_url IS NOT NULL AND sq.explanation_file_url != '') as has_explanation,
  ROW_NUMBER() OVER (ORDER BY sq.imported_at NULLS LAST, sq.id) as "order",
  NOW() as created_at,
  NOW() as updated_at
FROM seed_questions sq
WHERE sq.is_active = true
  AND NOT EXISTS (
    SELECT 1 
    FROM pack_questions pq 
    WHERE pq.question_id = sq.id
  );

-- Step 3: Update pack item_count
UPDATE packs
SET 
  item_count = (
    SELECT COUNT(*) 
    FROM pack_questions 
    WHERE pack_id = 'a0000000-0000-0000-0000-000000000001'::uuid
  ),
  updated_at = NOW()
WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;

-- Step 4: Create index for faster lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_pack_questions_question_id 
ON pack_questions(question_id) 
WHERE question_id IS NOT NULL;

-- ============================================================================
-- Success! Migration completed.
-- ============================================================================
-- 
-- Verification queries (run these to verify):
--
-- 1. Check PVE pack:
--    SELECT * FROM packs WHERE id = 'a0000000-0000-0000-0000-000000000001'::uuid;
--
-- 2. Check synced count:
--    SELECT COUNT(*) FROM pack_questions 
--    WHERE pack_id = 'a0000000-0000-0000-0000-000000000001'::uuid;
--
-- 3. Compare totals:
--    SELECT 
--      (SELECT COUNT(*) FROM seed_questions WHERE is_active = true) as seed_total,
--      (SELECT COUNT(*) FROM pack_questions 
--       WHERE pack_id = 'a0000000-0000-0000-0000-000000000001'::uuid) as synced_total;
-- ============================================================================
