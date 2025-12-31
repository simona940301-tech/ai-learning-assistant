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
    t.tag,
    t.elo_score,
    t.games_played
  FROM user_tag_elo t
  WHERE t.user_id = p_user_id
    AND t.games_played >= 3
  ORDER BY t.elo_score ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
