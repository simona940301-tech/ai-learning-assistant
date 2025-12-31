-- ============================================================================
-- Add knowledge_tags column to error_book
-- ============================================================================
-- Purpose: Add knowledge_tags column that was missing from error_book table
-- Date: 2025-12-10
-- Priority: Must run BEFORE vocabulary migration
-- ============================================================================

-- Add knowledge_tags column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_book' AND column_name = 'knowledge_tags'
  ) THEN
    ALTER TABLE error_book 
    ADD COLUMN knowledge_tags TEXT[] DEFAULT '{}';
    
    RAISE NOTICE 'Added knowledge_tags column to error_book';
  ELSE
    RAISE NOTICE 'knowledge_tags column already exists in error_book';
  END IF;
END $$;

-- Create GIN index for knowledge_tags (if not already created by RLS migration)
CREATE INDEX IF NOT EXISTS idx_error_book_knowledge_tags 
ON error_book USING GIN(knowledge_tags);

-- Verify
DO $$
DECLARE
  has_column BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'error_book' AND column_name = 'knowledge_tags'
  ) INTO has_column;
  
  RAISE NOTICE 'knowledge_tags column exists: %', CASE WHEN has_column THEN '✓' ELSE '✗' END;
END $$;
