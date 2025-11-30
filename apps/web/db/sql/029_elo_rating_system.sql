/* 
  Migration: Add Elo Rating System for Tag-Level Skill Tracking
  Date: 2025-01-30
  Description: Implements per-tag Elo rating system for precise ability modeling
*/

-- Create user_tag_elo table
CREATE TABLE IF NOT EXISTS user_tag_elo (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  elo_score INTEGER DEFAULT 1200,
  games_played INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, tag)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_tag_elo_user_id ON user_tag_elo(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tag_elo_tag ON user_tag_elo(tag);
CREATE INDEX IF NOT EXISTS idx_user_tag_elo_score ON user_tag_elo(elo_score DESC);

-- Add RLS policies
ALTER TABLE user_tag_elo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Elo ratings"
  ON user_tag_elo FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can update Elo ratings"
  ON user_tag_elo FOR ALL
  USING (true);

-- Function to update Elo rating
CREATE OR REPLACE FUNCTION update_user_tag_elo(
  p_user_id UUID,
  p_tag TEXT,
  p_won BOOLEAN,
  p_expected_score FLOAT DEFAULT 0.5
) RETURNS INTEGER AS $$
DECLARE
  v_current_elo INTEGER;
  v_games_played INTEGER;
  v_k_factor INTEGER;
  v_actual_score FLOAT;
  v_new_elo INTEGER;
BEGIN
  -- Get current Elo or create new entry
  SELECT elo_score, games_played INTO v_current_elo, v_games_played
  FROM user_tag_elo
  WHERE user_id = p_user_id AND tag = p_tag;

  IF NOT FOUND THEN
    v_current_elo := 1200;
    v_games_played := 0;
  END IF;

  -- Determine K-factor (higher for new players)
  IF v_games_played < 30 THEN
    v_k_factor := 32;
  ELSE
    v_k_factor := 16;
  END IF;

  -- Calculate actual score (1 for win, 0 for loss)
  v_actual_score := CASE WHEN p_won THEN 1.0 ELSE 0.0 END;

  -- Calculate new Elo: Elo_new = Elo_old + K * (Actual - Expected)
  v_new_elo := v_current_elo + ROUND(v_k_factor * (v_actual_score - p_expected_score));

  -- Ensure Elo doesn't go below 100
  v_new_elo := GREATEST(v_new_elo, 100);

  -- Upsert the rating
  INSERT INTO user_tag_elo (user_id, tag, elo_score, games_played, last_updated_at)
  VALUES (p_user_id, p_tag, v_new_elo, v_games_played + 1, NOW())
  ON CONFLICT (user_id, tag)
  DO UPDATE SET
    elo_score = v_new_elo,
    games_played = user_tag_elo.games_played + 1,
    last_updated_at = NOW();

  RETURN v_new_elo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's weakest tags
CREATE OR REPLACE FUNCTION get_weakest_tags(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 3
) RETURNS TABLE (
  tag TEXT,
  elo_score INTEGER,
  games_played INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    user_tag_elo.tag,
    user_tag_elo.elo_score,
    user_tag_elo.games_played
  FROM user_tag_elo
  WHERE user_id = p_user_id
    AND games_played >= 3  -- Only consider tags with enough data
  ORDER BY elo_score ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get expected score between two Elo ratings
CREATE OR REPLACE FUNCTION calculate_expected_score(
  p_rating_a INTEGER,
  p_rating_b INTEGER
) RETURNS FLOAT AS $$
BEGIN
  -- Expected score formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
  RETURN 1.0 / (1.0 + POWER(10.0, (p_rating_b - p_rating_a) / 400.0));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment for documentation
COMMENT ON TABLE user_tag_elo IS 'Stores per-tag Elo ratings for precise skill tracking';
COMMENT ON FUNCTION update_user_tag_elo IS 'Updates Elo rating for a specific tag after a question attempt';
COMMENT ON FUNCTION get_weakest_tags IS 'Returns user''s weakest tags for targeted practice';
COMMENT ON FUNCTION calculate_expected_score IS 'Calculates expected score between two Elo ratings';
