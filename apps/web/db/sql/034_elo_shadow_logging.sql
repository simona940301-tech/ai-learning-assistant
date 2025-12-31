-- Migration: Add Shadow Logging to Elo Function
-- Date: 2025-01-30
-- Description: Updates update_user_tag_elo to log predictions to algo_shadow_logs

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
  v_prediction JSONB;
BEGIN
  -- Get current Elo or create new entry
  SELECT elo_score, games_played INTO v_current_elo, v_games_played
  FROM user_tag_elo
  WHERE user_id = p_user_id AND tag = p_tag;

  IF NOT FOUND THEN
    v_current_elo := 1200;
    v_games_played := 0;
  END IF;

  -- Determine K-factor
  IF v_games_played < 30 THEN
    v_k_factor := 32;
  ELSE
    v_k_factor := 16;
  END IF;

  -- Calculate actual score
  v_actual_score := CASE WHEN p_won THEN 1.0 ELSE 0.0 END;

  -- Calculate new Elo
  v_new_elo := v_current_elo + ROUND(v_k_factor * (v_actual_score - p_expected_score));
  v_new_elo := GREATEST(v_new_elo, 100);

  -- Upsert the rating
  INSERT INTO user_tag_elo (user_id, tag, elo_score, games_played, last_updated_at)
  VALUES (p_user_id, p_tag, v_new_elo, v_games_played + 1, NOW())
  ON CONFLICT (user_id, tag)
  DO UPDATE SET
    elo_score = v_new_elo,
    games_played = user_tag_elo.games_played + 1,
    last_updated_at = NOW();

  -- Log to Shadow Testing
  v_prediction := jsonb_build_object(
    'current_elo', v_current_elo,
    'expected_score', p_expected_score,
    'k_factor', v_k_factor
  );

  INSERT INTO algo_shadow_logs (user_id, algorithm_id, prediction, outcome, context)
  VALUES (
    p_user_id, 
    'elo_v1', 
    v_prediction, 
    jsonb_build_object('actual_score', v_actual_score, 'new_elo', v_new_elo),
    jsonb_build_object('tag', p_tag)
  );

  RETURN v_new_elo;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
