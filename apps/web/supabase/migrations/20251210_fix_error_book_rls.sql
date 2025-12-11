-- ============================================================================
-- Fix error_book RLS Policies
-- ============================================================================
-- Purpose: Allow users to manage their own error book entries without admin client
-- Date: 2025-12-10
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own errors" ON error_book;
DROP POLICY IF EXISTS "Users can read their own errors" ON error_book;
DROP POLICY IF EXISTS "Users can update their own errors" ON error_book;
DROP POLICY IF EXISTS "Users can delete their own errors" ON error_book;

-- Create comprehensive RLS policies
-- ============================================================================

-- Allow users to insert their own errors
CREATE POLICY "Users can insert their own errors"
ON error_book FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to read their own errors
CREATE POLICY "Users can read their own errors"
ON error_book FOR SELECT
USING (auth.uid() = user_id);

-- Allow users to update their own errors
CREATE POLICY "Users can update their own errors"
ON error_book FOR UPDATE
USING (auth.uid() = user_id);

-- Allow users to delete their own errors
CREATE POLICY "Users can delete their own errors"
ON error_book FOR DELETE
USING (auth.uid() = user_id);

-- Performance Indexes
-- ============================================================================

-- GIN index for knowledge_tags array queries
CREATE INDEX IF NOT EXISTS idx_error_book_knowledge_tags 
ON error_book USING GIN(knowledge_tags);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_error_book_user_status 
ON error_book(user_id, status) 
WHERE status = 'active';

-- Index for last_attempted_at ordering
CREATE INDEX IF NOT EXISTS idx_error_book_user_attempted 
ON error_book(user_id, last_attempted_at DESC);

-- Verify RLS is enabled
-- ============================================================================
DO $$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'error_book') THEN
    ALTER TABLE error_book ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS enabled on error_book';
  ELSE
    RAISE NOTICE 'RLS already enabled on error_book';
  END IF;
END $$;
