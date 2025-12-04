-- Migration: 033_get_weighted_english_performance.sql
-- Description: Adds a function to calculate weighted English performance for Dream School Ready %

CREATE OR REPLACE FUNCTION get_weighted_english_performance(user_id_input UUID)
RETURNS TABLE (
    weighted_correct_sum NUMERIC,
    total_difficulty_sum NUMERIC,
    total_questions_count BIGINT,
    avg_response_time_ms NUMERIC
)
LANGUAGE sql
AS $$
SELECT
    COALESCE(SUM(CASE WHEN ua.is_correct = TRUE THEN (ua.metadata->>'difficulty')::NUMERIC ELSE 0 END), 0) AS weighted_correct_sum,
    COALESCE(SUM((ua.metadata->>'difficulty')::NUMERIC), 0) AS total_difficulty_sum,
    COUNT(ua.id) AS total_questions_count,
    COALESCE(AVG((ua.metadata->>'response_time_ms')::NUMERIC), 0) AS avg_response_time_ms
FROM user_answers ua
WHERE ua.user_id = user_id_input
  AND ua.metadata->>'subject' = 'english'
  AND (ua.metadata->>'difficulty')::TEXT ~ '^[1-5]$';
$$;
