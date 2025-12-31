-- Onboarding UX Redesign - Database Migration
-- Date: 2025-11-23
-- Description: Add proficiency_level field and update exam_year type

-- 1. Add proficiency_level column
ALTER TABLE onboarding_sessions
ADD COLUMN IF NOT EXISTS proficiency_level TEXT;

-- Add comment
COMMENT ON COLUMN onboarding_sessions.proficiency_level IS 'User proficiency level: top, front, average, back, bottom, beginner';

-- 2. Update exam_year to INTEGER type (if it's currently TEXT)
-- First, add a new column
ALTER TABLE onboarding_sessions
ADD COLUMN IF NOT EXISTS exam_year_int INTEGER;

-- Copy data from old column to new column (convert TEXT to INTEGER)
UPDATE onboarding_sessions
SET exam_year_int = CAST(exam_year AS INTEGER)
WHERE exam_year IS NOT NULL AND exam_year ~ '^[0-9]+$';

-- Drop old column
ALTER TABLE onboarding_sessions
DROP COLUMN IF EXISTS exam_year;

-- Rename new column to exam_year
ALTER TABLE onboarding_sessions
RENAME COLUMN exam_year_int TO exam_year;

-- Add comment
COMMENT ON COLUMN onboarding_sessions.exam_year IS 'Target exam year (2026-2050)';

-- 3. Drop priority_subjects column (no longer needed)
ALTER TABLE onboarding_sessions
DROP COLUMN IF EXISTS priority_subjects;

-- 4. Verify changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'onboarding_sessions'
  AND column_name IN ('proficiency_level', 'exam_year', 'priority_subjects')
ORDER BY column_name;
