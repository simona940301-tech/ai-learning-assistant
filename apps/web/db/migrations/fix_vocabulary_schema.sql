-- Migration: Fix Vocabulary Schema
-- Purpose: 
-- 1. Allow 'vocabulary' in source_type check constraint
-- 2. Add unique index on (user_id, title) to support upsert functionality

-- 1. Update source_type constraint
DO $$
BEGIN
    -- Drop the existing constraint if it exists (name might vary, so we try standard names or rely on replacing it)
    -- Usually constraints are named like "notebook_entries_source_type_check"
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'notebook_entries' 
        AND constraint_name = 'notebook_entries_source_type_check'
    ) THEN
        ALTER TABLE notebook_entries DROP CONSTRAINT notebook_entries_source_type_check;
    END IF;

    -- Add the new constraint
    ALTER TABLE notebook_entries 
    ADD CONSTRAINT notebook_entries_source_type_check 
    CHECK (source_type IN ('summary', 'qa', 'manual', 'explain', 'vocabulary'));
    
    RAISE NOTICE '✅ Updated notebook_entries_source_type_check';
END $$;

-- 2. Add Unique Index for Upsert
DO $$
BEGIN
    -- Fix Duplicates First: Delete older duplicates, keeping the most recent one
    WITH duplicates AS (
      SELECT id,
             ROW_NUMBER() OVER (
               PARTITION BY user_id, title 
               ORDER BY updated_at DESC
             ) as row_num
      FROM notebook_entries
    )
    DELETE FROM notebook_entries
    WHERE id IN (
      SELECT id FROM duplicates WHERE row_num > 1
    );
    
    RAISE NOTICE '✅ Cleaned up duplicate entries';

    -- We need (user_id, title) to be unique to use ON CONFLICT(user_id, title)
    -- Note: We use dynamic SQL here just to be safe inside the block, though direct DDL works too
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'notebook_entries' 
        AND indexname = 'idx_notebook_entries_user_title'
    ) THEN
        CREATE UNIQUE INDEX idx_notebook_entries_user_title 
        ON notebook_entries(user_id, title);
        RAISE NOTICE '✅ Created idx_notebook_entries_user_title';
    ELSE
        RAISE NOTICE 'ℹ️ Index idx_notebook_entries_user_title already exists';
    END IF;
END $$;
