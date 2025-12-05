-- ============================================
-- Game Sessions & Telemetry System
-- Created: 2025-12-05
-- Purpose: Track game mode sessions (Editor Mode, Detective's Log) with cognitive telemetry
-- ============================================

-- ============================================
-- game_sessions: Core session tracking
-- ============================================
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Game metadata
  game_type TEXT NOT NULL CHECK (game_type IN ('editor_mode', 'detective_log')),
  difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  
  -- Session lifecycle
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,
  
  -- Performance metrics
  score INTEGER CHECK (score >= 0),
  total_possible INTEGER CHECK (total_possible > 0),
  accuracy NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE 
      WHEN total_possible > 0 THEN (score::NUMERIC / total_possible::NUMERIC * 100)
      ELSE 0
    END
  ) STORED,
  time_spent_seconds INTEGER CHECK (time_spent_seconds >= 0),
  
  -- Cognitive telemetry (game-specific JSON data)
  telemetry JSONB DEFAULT '{}'::jsonb,
  
  -- Progression integration
  xp_granted INTEGER DEFAULT 0 CHECK (xp_granted >= 0),
  coins_granted INTEGER DEFAULT 0 CHECK (coins_granted >= 0),
  progression_applied BOOLEAN DEFAULT FALSE,
  progression_applied_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ============================================
-- Indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_type ON game_sessions(user_id, game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_completed ON game_sessions(completed_at DESC) WHERE completed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_game_sessions_created ON game_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_sessions_progression_pending ON game_sessions(user_id) WHERE completed_at IS NOT NULL AND progression_applied = FALSE;

-- GIN index for JSONB telemetry queries (for analytics)
CREATE INDEX IF NOT EXISTS idx_game_sessions_telemetry ON game_sessions USING GIN (telemetry);

-- ============================================
-- game_telemetry_events: Fine-grained event tracking
-- ============================================
CREATE TABLE IF NOT EXISTS game_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL, -- e.g., 'highlight_text', 'drag_chip', 'submit_chain'
  event_data JSONB DEFAULT '{}'::jsonb,
  
  -- Timing
  timestamp_ms BIGINT NOT NULL, -- Milliseconds since session start
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_session ON game_telemetry_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_user ON game_telemetry_events(user_id);
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_type ON game_telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_created ON game_telemetry_events(created_at DESC);

-- GIN index for event_data queries
CREATE INDEX IF NOT EXISTS idx_game_telemetry_events_data ON game_telemetry_events USING GIN (event_data);

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_telemetry_events ENABLE ROW LEVEL SECURITY;

-- game_sessions policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Users can view own game sessions'
  ) THEN
    CREATE POLICY "Users can view own game sessions"
      ON game_sessions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Users can create own game sessions'
  ) THEN
    CREATE POLICY "Users can create own game sessions"
      ON game_sessions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_sessions' AND policyname = 'Users can update own game sessions'
  ) THEN
    CREATE POLICY "Users can update own game sessions"
      ON game_sessions FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- game_telemetry_events policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_telemetry_events' AND policyname = 'Users can view own telemetry events'
  ) THEN
    CREATE POLICY "Users can view own telemetry events"
      ON game_telemetry_events FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_telemetry_events' AND policyname = 'Users can create own telemetry events'
  ) THEN
    CREATE POLICY "Users can create own telemetry events"
      ON game_telemetry_events FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- Triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_game_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_game_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_game_sessions_updated_at
      BEFORE UPDATE ON game_sessions
      FOR EACH ROW
      EXECUTE FUNCTION update_game_sessions_updated_at();
  END IF;
END $$;

-- ============================================
-- Comments for documentation
-- ============================================
COMMENT ON TABLE game_sessions IS 'Tracks game mode sessions (Editor Mode, Detective Log) with performance and cognitive telemetry';
COMMENT ON COLUMN game_sessions.telemetry IS 'Game-specific cognitive tracking data (e.g., BlankAttemptData for Editor Mode)';
COMMENT ON COLUMN game_sessions.accuracy IS 'Computed column: (score / total_possible) * 100';
COMMENT ON COLUMN game_sessions.progression_applied IS 'Whether XP/rewards have been granted for this session';

COMMENT ON TABLE game_telemetry_events IS 'Fine-grained event tracking for game sessions (e.g., individual chip drags, highlights)';
COMMENT ON COLUMN game_telemetry_events.timestamp_ms IS 'Milliseconds elapsed since session start';
