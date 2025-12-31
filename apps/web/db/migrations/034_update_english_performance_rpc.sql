-- ============================================
-- Update get_weighted_english_performance RPC
-- ============================================
-- Purpose: Fix Ready Score calculation with proper error handling
-- Changes: Add SECURITY DEFINER, handle null values, remove strict regex
-- Architecture: Top-tier SQL function design
-- Date: 2025-12-10

CREATE OR REPLACE FUNCTION get_weighted_english_performance(user_id_input UUID)
RETURNS TABLE (
    weighted_correct_sum NUMERIC,
    total_difficulty_sum NUMERIC,
    total_questions_count BIGINT,
    avg_response_time_ms NUMERIC
)
LANGUAGE sql
SECURITY DEFINER -- 🎯 Bypass RLS for aggregation queries
SET search_path = public -- Security best practice
AS $$
SELECT
    -- Weighted sum of correct answers (difficulty-weighted)
    COALESCE(SUM(
        CASE WHEN ua.is_correct = TRUE 
        THEN COALESCE((ua.metadata->>'difficulty')::NUMERIC, 3) 
        ELSE 0 
        END
    ), 0) AS weighted_correct_sum,
    
    -- Total difficulty sum (for calculating weighted accuracy)
    COALESCE(SUM(COALESCE((ua.metadata->>'difficulty')::NUMERIC, 3)), 0) AS total_difficulty_sum,
    
    -- Total question count
    COUNT(ua.id) AS total_questions_count,
    
    -- Average response time (default 30s if missing)
    COALESCE(AVG(COALESCE((ua.metadata->>'response_time_ms')::NUMERIC, 30000)), 0) AS avg_response_time_ms
FROM user_answers ua
WHERE ua.user_id = user_id_input
  AND ua.metadata->>'subject' = 'english'
  AND COALESCE((ua.metadata->>'difficulty')::NUMERIC, 3) BETWEEN 1 AND 5;
$$;

-- Add function comment
COMMENT ON FUNCTION get_weighted_english_performance(UUID) IS 
'Calculates weighted English performance metrics for Ready Score. Uses SECURITY DEFINER to bypass RLS for aggregation. Handles null values gracefully with COALESCE defaults.';
