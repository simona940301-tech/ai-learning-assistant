-- ============================================
-- HOTFIX: Ensure all required columns exist
-- Run this if upload still fails
-- ============================================

-- 1. Add file_name column (if not exists)
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 2. Add page_count column (if not exists)
ALTER TABLE file_analysis
ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0;

-- 3. Make file_id nullable
ALTER TABLE file_analysis
ALTER COLUMN file_id DROP NOT NULL;

-- 4. Update status constraint to include 'pending'
ALTER TABLE file_analysis DROP CONSTRAINT IF EXISTS file_analysis_status_check;

ALTER TABLE file_analysis ADD CONSTRAINT file_analysis_status_check
  CHECK (status IN ('pending', 'processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed'));

-- 5. Set default status to 'pending'
ALTER TABLE file_analysis ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- Verification
-- ============================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'file_analysis'
ORDER BY ordinal_position;
