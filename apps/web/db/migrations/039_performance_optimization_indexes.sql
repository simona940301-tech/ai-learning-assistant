-- Migration 039: Performance Optimization - Composite Indexes
-- Purpose: Add composite indexes for backpack and notebook queries to improve performance
-- Expected improvement: 5-10x faster queries on user_id + updated_at

-- ============================================================================
-- 1. NOTEBOOK ENTRIES INDEXES
-- ============================================================================

-- Primary composite index: user_id + updated_at (for pagination)
CREATE INDEX IF NOT EXISTS idx_notebook_user_updated 
  ON notebook_entries(user_id, updated_at DESC);

-- Composite index: user_id + subject + updated_at (for filtered queries)
-- Only create if subject column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notebook_entries' 
    AND column_name = 'subject'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_notebook_user_subject_updated 
      ON notebook_entries(user_id, subject, updated_at DESC) 
      WHERE subject IS NOT NULL;
    RAISE NOTICE '✅ Created idx_notebook_user_subject_updated';
  ELSE
    RAISE NOTICE '⚠️ Skipped idx_notebook_user_subject_updated (subject column does not exist)';
  END IF;
END $$;

-- Partial index: recent entries only (last 30 days)
-- NOTE: Removed due to PostgreSQL IMMUTABLE constraint
-- Partial indexes with NOW() are not allowed because NOW() is not IMMUTABLE
-- The composite indexes above are sufficient for performance
-- If needed, use a materialized view or scheduled job to maintain recent data
-- CREATE INDEX IF NOT EXISTS idx_notebook_recent 
--   ON notebook_entries(user_id, updated_at DESC) 
--   WHERE updated_at > NOW() - INTERVAL '30 days';

-- ============================================================================
-- 2. BACKPACK ITEMS INDEXES
-- ============================================================================

-- Primary composite index: user_id + updated_at (for pagination)
CREATE INDEX IF NOT EXISTS idx_backpack_user_updated 
  ON backpack_items(user_id, updated_at DESC);

-- Composite index: user_id + subject + updated_at (for filtered queries)
CREATE INDEX IF NOT EXISTS idx_backpack_user_subject_updated 
  ON backpack_items(user_id, subject, updated_at DESC);

-- ============================================================================
-- 3. VERIFICATION QUERIES
-- ============================================================================

-- Verify indexes were created
DO $$
BEGIN
  RAISE NOTICE 'Verifying indexes...';
  
  -- Check notebook_entries indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'notebook_entries' 
    AND indexname = 'idx_notebook_user_updated'
  ) THEN
    RAISE NOTICE '✅ idx_notebook_user_updated created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'notebook_entries' 
    AND indexname = 'idx_notebook_user_subject_updated'
  ) THEN
    RAISE NOTICE '✅ idx_notebook_user_subject_updated created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'notebook_entries' 
    AND indexname = 'idx_notebook_recent'
  ) THEN
    RAISE NOTICE '✅ idx_notebook_recent created';
  END IF;
  
  -- Check backpack_items indexes
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'backpack_items' 
    AND indexname = 'idx_backpack_user_updated'
  ) THEN
    RAISE NOTICE '✅ idx_backpack_user_updated created';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'backpack_items' 
    AND indexname = 'idx_backpack_user_subject_updated'
  ) THEN
    RAISE NOTICE '✅ idx_backpack_user_subject_updated created';
  END IF;
  
  RAISE NOTICE 'Migration 039 completed successfully!';
END $$;

-- ============================================================================
-- 4. PERFORMANCE TESTING QUERIES (for verification)
-- ============================================================================

-- Test query 1: Fetch recent entries (should use idx_notebook_user_updated)
-- EXPLAIN ANALYZE
-- SELECT * FROM notebook_entries
-- WHERE user_id = 'test-user-id'
-- ORDER BY updated_at DESC
-- LIMIT 20;

-- Test query 2: Fetch entries by subject (should use idx_notebook_user_subject_updated)
-- EXPLAIN ANALYZE
-- SELECT * FROM notebook_entries
-- WHERE user_id = 'test-user-id' AND subject = 'math'
-- ORDER BY updated_at DESC
-- LIMIT 20;

-- Expected output: "Index Scan using idx_notebook_user_updated" or similar
-- Execution time should be < 10ms
