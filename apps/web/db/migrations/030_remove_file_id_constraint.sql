-- ============================================
-- Remove file_id foreign key constraint
-- This allows ChatGPT-style in-memory processing
-- ============================================

-- 1. Drop the foreign key constraint
ALTER TABLE file_analysis
DROP CONSTRAINT IF EXISTS file_analysis_file_id_fkey;

-- 2. Confirm file_id is nullable
ALTER TABLE file_analysis
ALTER COLUMN file_id DROP NOT NULL;

-- 3. Drop the unique constraint (one analysis per file)
ALTER TABLE file_analysis
DROP CONSTRAINT IF EXISTS file_analysis_file_id_key;

-- ============================================
-- Verification
-- ============================================
-- Check constraints:
-- SELECT con.conname, con.contype, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- WHERE con.conrelid = 'file_analysis'::regclass;
