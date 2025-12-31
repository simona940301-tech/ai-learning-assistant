-- ============================================================================
-- Vocabulary Data Migration: error_book → notebook_entries
-- ============================================================================
-- Purpose: Migrate vocabulary words from error_book back to notebook_entries
-- Date: 2025-12-10
-- Author: System Migration
-- ============================================================================

-- Step 1: Migrate vocabulary from error_book to notebook_entries
-- ============================================================================
-- Handle knowledge_tags as JSONB (actual database type)
INSERT INTO notebook_entries (
  user_id,
  title,
  content_md,
  source_type,
  subject,
  tags,
  created_at,
  updated_at
)
SELECT 
  eb.user_id,
  pq.stem AS title,
  jsonb_build_object(
    'text', pq.stem,
    'definition_zh', pq.answer,
    'example_en', COALESCE(
      (regexp_match(pq.explanation, 'Example: ([^\n]+)'))[1], 
      ''
    ),
    'pos', '',
    'level', COALESCE(
      -- Extract level from JSONB array
      (
        SELECT value::text
        FROM jsonb_array_elements_text(
          CASE 
            WHEN jsonb_typeof(eb.knowledge_tags) = 'array' THEN eb.knowledge_tags
            ELSE '[]'::jsonb
          END
        ) AS value
        WHERE value::text LIKE 'level_%'
        LIMIT 1
      ),
      'level_1'
    ),
    'lyric_snippet', CASE
      WHEN pq.explanation LIKE '%Lyrics:%' THEN
        jsonb_build_object(
          'line', COALESCE((regexp_match(pq.explanation, 'Lyrics: "([^"]+)"'))[1], ''),
          'artist', COALESCE((regexp_match(pq.explanation, '" - ([^\n]+)'))[1], ''),
          'song', ''
        )
      ELSE NULL
    END
  )::text AS content_md,
  'vocabulary' AS source_type,
  'english' AS subject,
  -- Convert JSONB array to TEXT array for tags
  CASE 
    WHEN eb.knowledge_tags IS NOT NULL AND jsonb_typeof(eb.knowledge_tags) = 'array' THEN
      ARRAY(SELECT jsonb_array_elements_text(eb.knowledge_tags))
    ELSE 
      ARRAY[]::TEXT[]
  END AS tags,
  eb.created_at,
  eb.updated_at
FROM error_book eb
JOIN pack_questions pq ON eb.question_id = pq.id
WHERE eb.knowledge_tags IS NOT NULL 
  AND jsonb_typeof(eb.knowledge_tags) = 'array'
  AND eb.knowledge_tags @> '"vocabulary"'::jsonb
ON CONFLICT (user_id, title) DO UPDATE SET
  updated_at = EXCLUDED.updated_at,
  content_md = EXCLUDED.content_md;

-- Step 2: Verify migration
-- ============================================================================
DO $$
DECLARE
  migrated_count INTEGER;
  original_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count 
  FROM notebook_entries 
  WHERE source_type = 'vocabulary';
  
  SELECT COUNT(*) INTO original_count 
  FROM error_book 
  WHERE knowledge_tags IS NOT NULL 
    AND jsonb_typeof(knowledge_tags) = 'array'
    AND knowledge_tags @> '"vocabulary"'::jsonb;
  
  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  - Vocabulary in notebook_entries: %', migrated_count;
  RAISE NOTICE '  - Vocabulary in error_book: %', original_count;
  
  IF migrated_count < original_count THEN
    RAISE WARNING 'Some vocabulary may not have been migrated. Please review.';
  END IF;
END $$;

-- Step 3: Clean up error_book (only after verification)
-- ============================================================================
-- IMPORTANT: Only run this after verifying the migration was successful!
-- DELETE FROM error_book WHERE knowledge_tags @> '"vocabulary"'::jsonb;

-- Step 4: Optional cleanup of Vocabulary Pack
-- ============================================================================
-- IMPORTANT: Only run this after confirming vocabulary system works correctly!
-- DELETE FROM pack_questions 
-- WHERE pack_id IN (
--   SELECT id FROM packs WHERE name LIKE 'Vocabulary Bank%'
-- );
-- DELETE FROM packs WHERE name LIKE 'Vocabulary Bank%';
