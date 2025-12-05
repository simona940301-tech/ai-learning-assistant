-- ============================================
-- Phase A-1: Event System Database Optimizations
-- Created: 2025-12-05
-- Purpose: Add constraints and indexes for event-based analytics
-- ============================================

-- Add event_type enum constraint for data integrity
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'game_event_type') THEN
    CREATE TYPE game_event_type AS ENUM (
      -- Session events
      'session_started',
      'session_completed',
      'session_abandoned',
      
      -- Editor Mode events
      'editor_blank_viewed',
      'editor_blank_focused',
      'editor_chip_dragged',
      'editor_chip_dropped',
      'editor_chip_swiped',
      'editor_answer_changed',
      'editor_answer_removed',
      'editor_validation_triggered',
      'editor_answer_correct',
      'editor_answer_incorrect',
      
      -- Detective's Log events
      'detective_text_highlighted',
      'detective_highlight_removed',
      'detective_evidence_dragged',
      'detective_evidence_placed',
      'detective_evidence_removed',
      'detective_chain_submitted',
      'detective_ai_feedback_received',
      'detective_quota_warning',
      'detective_budget_depleted',
      
      -- Common game events
      'game_hint_requested',
      'game_hint_viewed',
      'game_pause',
      'game_resume',
      'game_error'
    );
  END IF;
END $$;

-- Update game_telemetry_events to use enum (if not already)
-- Note: This is optional - keeping TEXT allows for future event types without migration
-- Uncomment if you want strict type safety:
-- ALTER TABLE game_telemetry_events 
--   ALTER COLUMN event_type TYPE game_event_type USING event_type::game_event_type;

-- ============================================
-- Optimized Indexes for Analytics Queries
-- ============================================

-- Composite index for session + event type queries
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_session_type 
  ON game_telemetry_events(session_id, event_type);

-- Composite index for user + event type + time range queries
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_user_type_time 
  ON game_telemetry_events(user_id, event_type, created_at DESC);

-- Index for timestamp-based queries (session duration analysis)
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_session_timestamp 
  ON game_telemetry_events(session_id, timestamp_ms);

-- Partial index for critical events only (faster analytics)
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_critical 
  ON game_telemetry_events(session_id, event_type, timestamp_ms)
  WHERE event_type IN (
    'session_started', 
    'session_completed', 
    'editor_validation_triggered',
    'detective_chain_submitted'
  );

-- ============================================
-- Helper Functions for Analytics
-- ============================================

/**
 * Get event summary for a session
 * Returns aggregated event counts by type
 */
CREATE OR REPLACE FUNCTION get_session_event_summary(p_session_id UUID)
RETURNS TABLE (
  event_type TEXT,
  event_count BIGINT,
  first_occurrence TIMESTAMPTZ,
  last_occurrence TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gte.event_type::TEXT,
    COUNT(*)::BIGINT as event_count,
    MIN(gte.created_at) as first_occurrence,
    MAX(gte.created_at) as last_occurrence
  FROM game_telemetry_events gte
  WHERE gte.session_id = p_session_id
  GROUP BY gte.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get user behavior metrics across all sessions
 * Useful for cognitive profiling
 */
CREATE OR REPLACE FUNCTION get_user_behavior_metrics(
  p_user_id UUID,
  p_game_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_sessions BIGINT,
  total_events BIGINT,
  avg_events_per_session NUMERIC,
  avg_session_duration_seconds NUMERIC,
  answer_change_rate NUMERIC,
  swipe_away_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH session_stats AS (
    SELECT 
      gs.id as session_id,
      COUNT(gte.id) as event_count,
      COUNT(CASE WHEN gte.event_type = 'editor_answer_changed' THEN 1 END) as changes,
      COUNT(CASE WHEN gte.event_type = 'editor_chip_swiped' THEN 1 END) as swipes,
      COUNT(CASE WHEN gte.event_type IN ('editor_chip_dropped', 'editor_chip_swiped') THEN 1 END) as total_interactions,
      EXTRACT(EPOCH FROM (MAX(gte.created_at) - MIN(gte.created_at))) as duration_seconds
    FROM game_sessions gs
    LEFT JOIN game_telemetry_events gte ON gte.session_id = gs.id
    WHERE gs.user_id = p_user_id
      AND (p_game_type IS NULL OR gs.game_type = p_game_type)
      AND gs.completed_at IS NOT NULL
    GROUP BY gs.id
  )
  SELECT 
    COUNT(*)::BIGINT as total_sessions,
    SUM(event_count)::BIGINT as total_events,
    AVG(event_count)::NUMERIC(10,2) as avg_events_per_session,
    AVG(duration_seconds)::NUMERIC(10,2) as avg_session_duration_seconds,
    (SUM(changes)::NUMERIC / NULLIF(SUM(total_interactions), 0))::NUMERIC(5,4) as answer_change_rate,
    (SUM(swipes)::NUMERIC / NULLIF(SUM(total_interactions), 0))::NUMERIC(5,4) as swipe_away_rate
  FROM session_stats;
END;
$$ LANGUAGE plpgsql STABLE;

/**
 * Get event timeline for a session (for debugging/visualization)
 */
CREATE OR REPLACE FUNCTION get_session_event_timeline(p_session_id UUID)
RETURNS TABLE (
  event_type TEXT,
  timestamp_ms BIGINT,
  event_data JSONB,
  time_since_start_ms BIGINT
) AS $$
DECLARE
  session_start_time BIGINT;
BEGIN
  -- Get first event timestamp
  SELECT MIN(gte.timestamp_ms) INTO session_start_time
  FROM game_telemetry_events gte
  WHERE gte.session_id = p_session_id;

  RETURN QUERY
  SELECT 
    gte.event_type::TEXT,
    gte.timestamp_ms,
    gte.event_data,
    (gte.timestamp_ms - session_start_time) as time_since_start_ms
  FROM game_telemetry_events gte
  WHERE gte.session_id = p_session_id
  ORDER BY gte.timestamp_ms ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- Comments
-- ============================================

COMMENT ON FUNCTION get_session_event_summary IS 'Aggregate event counts by type for a session';
COMMENT ON FUNCTION get_user_behavior_metrics IS 'Calculate user cognitive behavior metrics across sessions';
COMMENT ON FUNCTION get_session_event_timeline IS 'Get chronological event timeline for session visualization';

-- ============================================
-- Performance Notes
-- ============================================

-- For high-volume analytics, consider:
-- 1. Materialized views for common aggregations
-- 2. Time-based partitioning on game_telemetry_events
-- 3. Separate analytics database (read replica)
-- 4. Event streaming to ClickHouse/BigQuery for OLAP queries
