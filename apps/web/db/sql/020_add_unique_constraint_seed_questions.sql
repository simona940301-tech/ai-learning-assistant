-- ============================================
-- Add Unique Constraint to Seed Questions
-- ============================================
-- Purpose: Enable "Upsert" (Insert or Update) functionality for seed questions import.
-- Logic: Uniqueness is determined by the combination of 'source' (e.g., GSAT_2024_Paper_1) and 'question_number'.

-- 1. Clean up potential duplicates first (keep the most recently updated one)
DELETE FROM seed_questions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (partition BY source, question_number ORDER BY updated_at DESC, created_at DESC) as rnum
    FROM seed_questions
  ) t
  WHERE t.rnum > 1
);

-- 2. Add the unique constraint
ALTER TABLE seed_questions
ADD CONSTRAINT seed_questions_source_number_key UNIQUE (source, question_number);

-- 3. Just to be safe, ensure question_explanations unique constraint exists (it should based on schema 018)
-- ALTER TABLE question_explanations ADD CONSTRAINT question_explanations_question_id_key UNIQUE (question_id);
