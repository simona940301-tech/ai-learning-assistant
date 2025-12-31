-- Migration: Add SRS (Spaced Repetition System) support to backpack_notes
-- Date: 2025-01-30
-- Description: Adds srs_data column for tracking review schedules using SuperMemo-2 algorithm

-- Add srs_data column (JSONB)
ALTER TABLE backpack_notes 
ADD COLUMN IF NOT EXISTS srs_data JSONB DEFAULT '{
  "interval": 0,
  "repetitions": 0,
  "ease_factor": 2.5,
  "next_review_date": null,
  "last_review_date": null
}'::jsonb;

-- Create index for finding due reviews efficiently
CREATE INDEX IF NOT EXISTS idx_backpack_notes_next_review 
ON backpack_notes ((srs_data->>'next_review_date'));

-- Add comment
COMMENT ON COLUMN backpack_notes.srs_data IS 'Stores SRS state: interval (days), repetitions, ease_factor, next_review_date';

-- Function to get due reviews
CREATE OR REPLACE FUNCTION get_due_reviews(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS SETOF backpack_notes AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM backpack_notes
  WHERE user_id = p_user_id
    AND (srs_data->>'next_review_date')::TIMESTAMPTZ <= NOW()
  ORDER BY (srs_data->>'next_review_date')::TIMESTAMPTZ ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
