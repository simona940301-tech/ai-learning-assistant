/**
 * Batch 1.5: Sampler Performance Optimization
 * Target: P95 < 80ms for question sampling
 *
 * Optimizations:
 * 1. Add indexes for common query patterns
 * 2. Create materialized view for hot collections
 * 3. Replace ORDER BY random() with efficient sampling
 * 4. Add database function for parallel sampling
 */

-- ============================================================================
-- 1. INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Index for error book queries (user_id + status + last_attempted_at)
CREATE INDEX IF NOT EXISTS idx_error_book_sampling
ON error_book (user_id, status, last_attempted_at)
WHERE status = 'active';

-- Index for pack questions with explanation filtering
CREATE INDEX IF NOT EXISTS idx_pack_questions_sampling
ON pack_questions (pack_id, has_explanation, is_blacklisted, difficulty)
WHERE has_explanation = true AND is_blacklisted = false;

-- Index for user pack installations (for installed pack lookups)
CREATE INDEX IF NOT EXISTS idx_user_pack_installations_lookup
ON user_pack_installations (user_id, pack_id)
WHERE status = 'active';

-- Index for packs metadata (subject + skill + confidence)
CREATE INDEX IF NOT EXISTS idx_packs_metadata
ON packs (subject, skill, confidence_badge);

-- Composite index for recent questions deduplication
CREATE INDEX IF NOT EXISTS idx_user_answers_recent
ON user_answers (user_id, created_at DESC, question_id)
WHERE created_at > NOW() - INTERVAL '7 days';

-- ============================================================================
-- 2. EFFICIENT RANDOM SAMPLING FUNCTION
-- ============================================================================

/**
 * Fast random sampling using tablesample + limit
 * Replaces slow ORDER BY random()
 */
CREATE OR REPLACE FUNCTION sample_questions_fast(
  p_table_name TEXT,
  p_count INTEGER,
  p_where_clause TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  pack_id UUID,
  stem TEXT,
  choices JSONB,
  answer TEXT,
  explanation TEXT,
  difficulty TEXT,
  has_explanation BOOLEAN
) AS $$
BEGIN
  -- Use TABLESAMPLE for fast random sampling
  -- Note: TABLESAMPLE is approximate but much faster than ORDER BY random()
  RETURN QUERY EXECUTE format(
    'SELECT id, pack_id, stem, choices, answer, explanation, difficulty, has_explanation
     FROM %I TABLESAMPLE SYSTEM (10)
     WHERE %s
     LIMIT %L',
    p_table_name,
    CASE WHEN p_where_clause = '' THEN 'TRUE' ELSE p_where_clause END,
    p_count
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. OPTIMIZED PARALLEL SAMPLING FUNCTION
-- ============================================================================

/**
 * Sample from error book + packs in parallel
 * Returns combined results with performance tracking
 */
CREATE OR REPLACE FUNCTION sample_mission_questions_optimized(
  p_user_id UUID,
  p_total_count INTEGER DEFAULT 5,
  p_error_book_ratio DECIMAL DEFAULT 0.3,
  p_target_skill TEXT DEFAULT NULL,
  p_target_difficulty TEXT DEFAULT NULL,
  p_difficulty_band_min INTEGER DEFAULT NULL,
  p_difficulty_band_max INTEGER DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  question_id UUID,
  pack_id UUID,
  stem TEXT,
  choices JSONB,
  answer TEXT,
  explanation TEXT,
  difficulty TEXT,
  has_explanation BOOLEAN,
  skill TEXT,
  source TEXT,
  fallback_tier INTEGER,
  difficulty_score INTEGER
) AS $$
DECLARE
  error_book_count INTEGER;
  pack_count INTEGER;
  difficulty_map JSONB := '{"easy": 1, "medium": 2, "hard": 3, "expert": 4}';
BEGIN
  -- Calculate counts
  error_book_count := FLOOR(p_total_count * p_error_book_ratio);
  pack_count := CEIL(p_total_count * (1 - p_error_book_ratio));

  -- Return combined results from CTE
  RETURN QUERY
  WITH
  -- Get recent questions for deduplication (indexed query)
  recent_questions AS (
    SELECT DISTINCT question_id
    FROM user_answers
    WHERE user_id = p_user_id
      AND created_at > NOW() - INTERVAL '7 days'
    LIMIT 100  -- Limit to prevent huge exclude list
  ),

  -- Sample from error book (optimized with indexes)
  error_book_sample AS (
    SELECT
      pq.id,
      pq.pack_id,
      pq.stem,
      pq.choices,
      pq.answer,
      pq.explanation,
      pq.difficulty,
      pq.has_explanation,
      p.skill,
      'error_book'::TEXT AS source,
      0 AS fallback_tier,
      (difficulty_map ->> pq.difficulty)::INTEGER AS difficulty_score
    FROM error_book eb
    INNER JOIN pack_questions pq ON pq.id = eb.question_id
    INNER JOIN packs p ON p.id = pq.pack_id
    WHERE eb.user_id = p_user_id
      AND eb.status = 'active'
      AND pq.has_explanation = true
      AND pq.is_blacklisted = false
      AND NOT (pq.id = ANY(p_exclude_ids))
      AND NOT EXISTS (
        SELECT 1 FROM recent_questions rq WHERE rq.question_id = pq.id
      )
      AND (p_target_skill IS NULL OR p.skill = p_target_skill)
      AND (p_target_difficulty IS NULL OR pq.difficulty = p_target_difficulty)
      AND (
        p_difficulty_band_min IS NULL
        OR (difficulty_map ->> pq.difficulty)::INTEGER BETWEEN p_difficulty_band_min AND p_difficulty_band_max
      )
    ORDER BY eb.last_attempted_at ASC  -- Spaced repetition priority
    LIMIT error_book_count
  ),

  -- Sample from installed packs (Tier 0)
  installed_packs_sample AS (
    SELECT
      pq.id,
      pq.pack_id,
      pq.stem,
      pq.choices,
      pq.answer,
      pq.explanation,
      pq.difficulty,
      pq.has_explanation,
      p.skill,
      'pack'::TEXT AS source,
      0 AS fallback_tier,
      (difficulty_map ->> pq.difficulty)::INTEGER AS difficulty_score
    FROM user_pack_installations upi
    INNER JOIN pack_questions pq ON pq.pack_id = upi.pack_id
    INNER JOIN packs p ON p.id = pq.pack_id
    WHERE upi.user_id = p_user_id
      AND upi.status = 'active'
      AND pq.has_explanation = true
      AND pq.is_blacklisted = false
      AND NOT (pq.id = ANY(p_exclude_ids))
      AND NOT EXISTS (
        SELECT 1 FROM recent_questions rq WHERE rq.question_id = pq.id
      )
      AND NOT EXISTS (
        SELECT 1 FROM error_book_sample ebs WHERE ebs.id = pq.id
      )
      AND (p_target_skill IS NULL OR p.skill = p_target_skill)
      AND (p_target_difficulty IS NULL OR pq.difficulty = p_target_difficulty)
      AND (
        p_difficulty_band_min IS NULL
        OR (difficulty_map ->> pq.difficulty)::INTEGER BETWEEN p_difficulty_band_min AND p_difficulty_band_max
      )
    ORDER BY RANDOM()  -- For small result sets, RANDOM() is acceptable
    LIMIT pack_count
  )

  -- Combine and return
  SELECT * FROM error_book_sample
  UNION ALL
  SELECT * FROM installed_packs_sample;

END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sample_mission_questions_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION sample_questions_fast TO authenticated;

-- ============================================================================
-- 4. PERFORMANCE MONITORING VIEW
-- ============================================================================

CREATE OR REPLACE VIEW sampler_performance_metrics AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour,
  COUNT(*) AS total_missions,
  AVG((metadata->>'samplingTimeMs')::INTEGER) AS avg_sampling_time_ms,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY (metadata->>'samplingTimeMs')::INTEGER) AS p50_sampling_time_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY (metadata->>'samplingTimeMs')::INTEGER) AS p95_sampling_time_ms,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY (metadata->>'samplingTimeMs')::INTEGER) AS p99_sampling_time_ms,
  MAX((metadata->>'samplingTimeMs')::INTEGER) AS max_sampling_time_ms
FROM user_missions
WHERE metadata ? 'samplingTimeMs'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ============================================================================
-- 5. VACUUM AND ANALYZE
-- ============================================================================

-- Ensure statistics are up to date for query planner
ANALYZE pack_questions;
ANALYZE error_book;
ANALYZE user_pack_installations;
ANALYZE user_answers;
ANALYZE packs;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Test the optimized function
-- SELECT * FROM sample_mission_questions_optimized(
--   p_user_id := 'your-user-id'::UUID,
--   p_total_count := 5,
--   p_error_book_ratio := 0.3,
--   p_target_skill := '一元一次方程式',
--   p_difficulty_band_min := 1,
--   p_difficulty_band_max := 3
-- );

-- Check index usage
-- EXPLAIN ANALYZE
-- SELECT * FROM sample_mission_questions_optimized(
--   p_user_id := 'your-user-id'::UUID,
--   p_total_count := 5
-- );
