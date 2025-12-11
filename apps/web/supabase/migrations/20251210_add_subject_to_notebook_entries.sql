-- ============================================================================
-- Add subject column to notebook_entries
-- ============================================================================
-- Purpose: Add subject column to support proper subject classification
-- Date: 2025-12-10
-- Priority: Must run BEFORE vocabulary migration
-- ============================================================================

-- Add subject column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notebook_entries' AND column_name = 'subject'
  ) THEN
    ALTER TABLE notebook_entries 
    ADD COLUMN subject TEXT CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social'));
    
    RAISE NOTICE 'Added subject column to notebook_entries';
  ELSE
    RAISE NOTICE 'Subject column already exists in notebook_entries';
  END IF;
END $$;

-- Add source tracking columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notebook_entries' AND column_name = 'source_session_id'
  ) THEN
    ALTER TABLE notebook_entries 
    ADD COLUMN source_session_id TEXT,
    ADD COLUMN source_deck_type TEXT,
    ADD COLUMN source_timestamp TIMESTAMPTZ;
    
    RAISE NOTICE 'Added source tracking columns to notebook_entries';
  ELSE
    RAISE NOTICE 'Source tracking columns already exist in notebook_entries';
  END IF;
END $$;

-- Update source_type constraint to include 'vocabulary'
DO $$
BEGIN
  -- Drop old constraint if exists
  ALTER TABLE notebook_entries DROP CONSTRAINT IF EXISTS notebook_entries_source_type_check;
  
  -- Add new constraint with 'vocabulary'
  ALTER TABLE notebook_entries 
  ADD CONSTRAINT notebook_entries_source_type_check 
  CHECK (source_type IN ('summary', 'qa', 'manual', 'explain', 'vocabulary'));
  
  RAISE NOTICE 'Updated source_type constraint to include vocabulary';
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'Constraint already updated';
END $$;

-- Add unique constraint for vocabulary deduplication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notebook_entries_user_title_unique'
  ) THEN
    ALTER TABLE notebook_entries 
    ADD CONSTRAINT notebook_entries_user_title_unique 
    UNIQUE (user_id, title);
    
    RAISE NOTICE 'Added unique constraint on (user_id, title)';
  ELSE
    RAISE NOTICE 'Unique constraint already exists';
  END IF;
EXCEPTION
  WHEN duplicate_table THEN
    RAISE NOTICE 'Unique constraint already exists (caught exception)';
END $$;

-- Create index for subject queries
CREATE INDEX IF NOT EXISTS idx_notebook_entries_subject 
ON notebook_entries(user_id, subject) 
WHERE subject IS NOT NULL;

-- Create index for source_type queries
CREATE INDEX IF NOT EXISTS idx_notebook_entries_source_type 
ON notebook_entries(user_id, source_type);

-- Verify changes
DO $$
DECLARE
  has_subject BOOLEAN;
  has_source_tracking BOOLEAN;
  has_unique_constraint BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notebook_entries' AND column_name = 'subject'
  ) INTO has_subject;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notebook_entries' AND column_name = 'source_session_id'
  ) INTO has_source_tracking;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notebook_entries_user_title_unique'
  ) INTO has_unique_constraint;
  
  RAISE NOTICE 'Schema Update Summary:';
  RAISE NOTICE '  - Subject column: %', CASE WHEN has_subject THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  - Source tracking: %', CASE WHEN has_source_tracking THEN '✓' ELSE '✗' END;
  RAISE NOTICE '  - Unique constraint: %', CASE WHEN has_unique_constraint THEN '✓' ELSE '✗' END;
END $$;
