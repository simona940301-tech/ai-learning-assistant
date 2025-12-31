-- ============================================
-- Add 'pending' status to file_analysis
-- Migration 024 - Support async PDF extraction
-- ============================================

-- Drop the old CHECK constraint
ALTER TABLE file_analysis DROP CONSTRAINT IF EXISTS file_analysis_status_check;

-- Add new CHECK constraint with 'pending' status
ALTER TABLE file_analysis ADD CONSTRAINT file_analysis_status_check
  CHECK (status IN ('pending', 'processing', 'preview_ready', 'analysis_ready', 'prediction_ready', 'failed'));

-- Update the default status to 'pending' (optional, for new records)
ALTER TABLE file_analysis ALTER COLUMN status SET DEFAULT 'pending';

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the update:
--
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'file_analysis'::regclass AND conname = 'file_analysis_status_check';
