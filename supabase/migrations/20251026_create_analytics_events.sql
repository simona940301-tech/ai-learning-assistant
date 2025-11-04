/**
 * Analytics Events Table (Batch 1.5)
 *
 * Purpose: Store raw analytics events from batch upload
 * Features:
 * - Event deduplication by event_id
 * - Append-only (no updates/deletes)
 * - Fast insertion (< 150ms for batch)
 * - Queryable for 24h event volume
 */

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL, -- Client-generated UUID for deduplication
  event_name VARCHAR(100) NOT NULL, -- Event type (e.g., 'cta_practice_again_click')
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- NULL for anonymous events
  session_id VARCHAR(255), -- Client session ID
  device VARCHAR(50), -- Device type
  client_timestamp TIMESTAMPTZ NOT NULL, -- When event occurred on client
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- When received by server
  context JSONB DEFAULT '{}', -- Contextual data (page, referrer, etc.)
  payload JSONB DEFAULT '{}', -- Event-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id
  ON analytics_events(event_id); -- Fast deduplication check

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name
  ON analytics_events(event_name); -- Query by event type

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id
  ON analytics_events(user_id) WHERE user_id IS NOT NULL; -- Query by user

CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp
  ON analytics_events(server_timestamp DESC); -- Recent events query

CREATE INDEX IF NOT EXISTS idx_analytics_events_24h
  ON analytics_events(server_timestamp)
  WHERE server_timestamp > NOW() - INTERVAL '24 hours'; -- 24h volume query

-- RLS Policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can only see their own events
CREATE POLICY "Users can view own events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only service role can insert (batch API uses service role)
CREATE POLICY "Service role can insert events"
  ON analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- No updates or deletes (append-only)
-- No policy needed as RLS will block by default

-- Comments
COMMENT ON TABLE analytics_events IS 'Raw analytics events from batch upload (append-only)';
COMMENT ON COLUMN analytics_events.event_id IS 'Client-generated UUID for deduplication';
COMMENT ON COLUMN analytics_events.event_name IS 'Event type (e.g., cta_practice_again_click)';
COMMENT ON COLUMN analytics_events.client_timestamp IS 'When event occurred on client';
COMMENT ON COLUMN analytics_events.server_timestamp IS 'When received by server (for ordering)';
COMMENT ON COLUMN analytics_events.context IS 'Contextual data (page, referrer, user_agent, etc.)';
COMMENT ON COLUMN analytics_events.payload IS 'Event-specific data (varies by event_name)';

-- Helper function: Get event count in last 24 hours
CREATE OR REPLACE FUNCTION get_analytics_event_count_24h()
RETURNS TABLE (
  event_name VARCHAR,
  event_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.event_name,
    COUNT(*) as event_count
  FROM analytics_events ae
  WHERE ae.server_timestamp > NOW() - INTERVAL '24 hours'
  GROUP BY ae.event_name
  ORDER BY event_count DESC;
END;
$$;

COMMENT ON FUNCTION get_analytics_event_count_24h() IS 'Get event counts in last 24 hours (for monitoring)';

-- Helper function: Check for event gaps (data quality)
CREATE OR REPLACE FUNCTION check_analytics_event_gaps(
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE (
  hour_start TIMESTAMPTZ,
  event_count BIGINT,
  has_gap BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH hourly_counts AS (
    SELECT
      DATE_TRUNC('hour', server_timestamp) as hour_start,
      COUNT(*) as event_count
    FROM analytics_events
    WHERE server_timestamp > NOW() - INTERVAL '24 hours'
    GROUP BY DATE_TRUNC('hour', server_timestamp)
    ORDER BY hour_start DESC
  )
  SELECT
    hc.hour_start,
    hc.event_count,
    (hc.event_count < 10) as has_gap -- Flag if < 10 events per hour (adjust threshold)
  FROM hourly_counts hc;
END;
$$;

COMMENT ON FUNCTION check_analytics_event_gaps(INTEGER) IS 'Check for event gaps in last 24h (data quality monitoring)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_analytics_event_count_24h() TO service_role;
GRANT EXECUTE ON FUNCTION check_analytics_event_gaps(INTEGER) TO service_role;

-- Cleanup policy (optional): Archive events older than 90 days
-- This can be run as a scheduled job
CREATE OR REPLACE FUNCTION archive_old_analytics_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Move to archive table (if exists) or just delete
  DELETE FROM analytics_events
  WHERE server_timestamp < NOW() - INTERVAL '90 days';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION archive_old_analytics_events() IS 'Archive/delete events older than 90 days (run as scheduled job)';
