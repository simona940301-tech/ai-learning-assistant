-- Migration: Create table to track learning actions for emotion recovery
-- Date: 2025-01-30
-- Purpose: Track learning actions (battle, explanation, wrongbook) for P1-D emotion recovery

CREATE TABLE IF NOT EXISTS chick_learning_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('BATTLE', 'EXPLANATION', 'WRONGBOOK', 'NOTE')),
  action_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chick_learning_actions_user_created
  ON chick_learning_actions(user_id, created_at DESC);

-- Note: Partial index with NOW() removed (not IMMUTABLE)
-- Query will use WHERE clause: WHERE created_at > NOW() - INTERVAL '3 days'
-- The idx_chick_learning_actions_user_created index will help with these queries

COMMENT ON TABLE chick_learning_actions IS 'Tracks learning actions for emotion recovery (3 days, 5 actions)';

