-- ============================================
-- Vocabulary Source Tracking Enhancement
-- Created: 2025-12-08
-- Purpose: Add source tracking fields to notebook_entries for vocabulary traceability
-- ============================================

-- Add source tracking columns to notebook_entries
ALTER TABLE notebook_entries
ADD COLUMN IF NOT EXISTS source_session_id TEXT,
ADD COLUMN IF NOT EXISTS source_deck_type TEXT,
ADD COLUMN IF NOT EXISTS source_timestamp TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN notebook_entries.source_session_id IS 'Source session ID for traceability (e.g., lyrical-flow-20251208-abc123)';
COMMENT ON COLUMN notebook_entries.source_deck_type IS 'Source deck type (e.g., lyrical_flow, battle, practice)';
COMMENT ON COLUMN notebook_entries.source_timestamp IS 'Timestamp when the content was captured/created';

-- Create index for efficient source-based queries
CREATE INDEX IF NOT EXISTS idx_notebook_source_session 
ON notebook_entries(user_id, source_session_id) 
WHERE source_type = 'vocabulary';

-- Create index for source deck type queries
CREATE INDEX IF NOT EXISTS idx_notebook_source_deck 
ON notebook_entries(user_id, source_deck_type, created_at DESC) 
WHERE source_type = 'vocabulary';

-- ============================================
-- Migration Notes
-- ============================================
-- This migration extends the existing notebook_entries table to support
-- vocabulary source tracking without creating a new table.
-- 
-- Benefits:
-- - Reuses existing RLS policies
-- - Maintains semantic unity across backpack content types
-- - Enables source traceability for all vocabulary entries
-- 
-- The source_type field (already exists) will be set to 'vocabulary' for
-- vocabulary entries, allowing easy filtering and querying.
