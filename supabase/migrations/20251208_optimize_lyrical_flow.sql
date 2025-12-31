-- ============================================================================
-- Migration: Optimize Lyrical Flow Data Fetching
-- ============================================================================
-- Purpose:
-- 1. Create RPC `get_random_words_with_status` for server-side sampling & joining
-- 2. Eliminate client-side shuffling and N+1 query for "is_saved" status
-- Date: 2025-12-08
-- ============================================================================

-- Function: Get Random Words with Saved Status
CREATE OR REPLACE FUNCTION get_random_words_with_status(
  p_user_id UUID,
  p_levels INTEGER[], -- Array of levels e.g., [1, 2]
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  text TEXT,
  level INTEGER,
  pos TEXT,
  definition_zh TEXT,
  example_sentence TEXT,
  lyric_match JSONB,
  is_saved BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of creator to access tables if needed
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH random_selection AS (
    SELECT 
      w.id,
      w.text,
      w.level,
      w.pos,
      w.definition_zh,
      w.example_sentence,
      w.lyric_match
    FROM words w
    WHERE 
      CASE 
        WHEN array_length(p_levels, 1) IS NULL THEN TRUE -- If no levels provided, all included (or handle differently)
        ELSE w.level = ANY(p_levels)
      END
    ORDER BY RANDOM()
    LIMIT p_limit
  )
  SELECT 
    rs.id,
    rs.text,
    rs.level,
    rs.pos,
    rs.definition_zh,
    rs.example_sentence,
    rs.lyric_match,
    (ne.id IS NOT NULL) AS is_saved
  FROM random_selection rs
  LEFT JOIN notebook_entries ne 
    ON ne.title = rs.text 
    AND ne.user_id = p_user_id 
    AND ne.source_type = 'vocabulary';
END;
$$;
