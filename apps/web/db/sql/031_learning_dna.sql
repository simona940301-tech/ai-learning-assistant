-- Migration: Add Learning DNA profile support
-- Date: 2025-01-30
-- Description: Adds learning_dna column to profiles to store behavioral fingerprint

-- Add learning_dna column (JSONB)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS learning_dna JSONB DEFAULT '{
  "avg_answer_time_ms": 0,
  "accuracy_by_tag": {},
  "preferred_session_length": "medium",
  "peak_performance_hour": 12,
  "quit_rate": 0,
  "streak_consistency": 0,
  "learning_style": "mixed",
  "last_calculated_at": null
}'::jsonb;

-- Add comment
COMMENT ON COLUMN profiles.learning_dna IS 'Stores behavioral metrics: answer speed, tag accuracy, session preferences, etc.';

-- Function to update learning DNA (can be called by background job)
CREATE OR REPLACE FUNCTION update_learning_dna(
  p_user_id UUID,
  p_dna JSONB
) RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET learning_dna = p_dna,
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
