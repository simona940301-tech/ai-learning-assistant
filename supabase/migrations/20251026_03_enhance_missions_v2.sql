/**
 * Module 3 Enhancement v2: Database Schema Updates
 *
 * Changes:
 * 1. Add window_date to user_missions (Asia/Taipei 05:00 boundary)
 * 2. Add blacklist columns to pack_questions
 * 3. Add answerable_until to user_missions
 * 4. Add suspicious flag to mission_logs
 * 5. Update RLS policies
 */

-- ============================================================================
-- Enhancement 2: Window Date (Asia/Taipei timezone with 05:00 boundary)
-- ============================================================================

-- Add window_date column
ALTER TABLE user_missions
ADD COLUMN IF NOT EXISTS window_date DATE;

-- Create function to calculate window_date
-- Mission window: 05:00 today → 04:59:59 tomorrow
CREATE OR REPLACE FUNCTION calculate_window_date(ts TIMESTAMPTZ DEFAULT NOW())
RETURNS DATE
LANGUAGE plpgsql
AS $$
DECLARE
  taipei_time TIMESTAMPTZ;
  window_date DATE;
BEGIN
  -- Convert to Asia/Taipei timezone
  taipei_time := ts AT TIME ZONE 'Asia/Taipei';

  -- If before 05:00, use previous day; otherwise use current day
  IF EXTRACT(HOUR FROM taipei_time) < 5 THEN
    window_date := (taipei_time - INTERVAL '1 day')::DATE;
  ELSE
    window_date := taipei_time::DATE;
  END IF;

  RETURN window_date;
END;
$$;

-- Populate existing rows with window_date
UPDATE user_missions
SET window_date = calculate_window_date(created_at)
WHERE window_date IS NULL;

-- Make window_date NOT NULL after populating
ALTER TABLE user_missions
ALTER COLUMN window_date SET NOT NULL;

-- Create index for window_date lookups
CREATE INDEX IF NOT EXISTS idx_user_missions_window_date
  ON user_missions(user_id, window_date);

-- Drop old unique constraint on (user_id, mission_date)
ALTER TABLE user_missions
DROP CONSTRAINT IF EXISTS user_missions_user_id_mission_date_key;

-- Add new unique constraint on (user_id, window_date)
ALTER TABLE user_missions
ADD CONSTRAINT user_missions_user_id_window_date_key
  UNIQUE(user_id, window_date);

-- Trigger to auto-populate window_date on insert
CREATE OR REPLACE FUNCTION set_window_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.window_date IS NULL THEN
    NEW.window_date := calculate_window_date(NEW.created_at);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_window_date ON user_missions;
CREATE TRIGGER trigger_set_window_date
  BEFORE INSERT ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION set_window_date();

-- ============================================================================
-- Enhancement 4: Answerable Timeout (2 hours)
-- ============================================================================

-- Add answerable_until column
ALTER TABLE user_missions
ADD COLUMN IF NOT EXISTS answerable_until TIMESTAMPTZ;

-- Populate existing rows (2 hours from started_at)
UPDATE user_missions
SET answerable_until = started_at + INTERVAL '2 hours'
WHERE answerable_until IS NULL
  AND started_at IS NOT NULL;

-- Trigger to set answerable_until on mission start
CREATE OR REPLACE FUNCTION set_answerable_until()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.started_at IS NOT NULL AND OLD.started_at IS NULL THEN
    NEW.answerable_until := NEW.started_at + INTERVAL '2 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_answerable_until ON user_missions;
CREATE TRIGGER trigger_set_answerable_until
  BEFORE UPDATE ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION set_answerable_until();

-- ============================================================================
-- Enhancement 5: Question Blacklist
-- ============================================================================

-- Add blacklist columns to pack_questions
ALTER TABLE pack_questions
ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS blacklist_reason TEXT,
ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ;

-- Create index for blacklist filtering
CREATE INDEX IF NOT EXISTS idx_pack_questions_blacklist
  ON pack_questions(is_blacklisted)
  WHERE is_blacklisted = false;

-- Function to blacklist a question
CREATE OR REPLACE FUNCTION blacklist_question(
  p_question_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pack_questions
  SET
    is_blacklisted = TRUE,
    blacklist_reason = p_reason,
    blacklisted_at = NOW()
  WHERE id = p_question_id;
END;
$$;

-- Function to un-blacklist a question
CREATE OR REPLACE FUNCTION unblacklist_question(p_question_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE pack_questions
  SET
    is_blacklisted = FALSE,
    blacklist_reason = NULL,
    blacklisted_at = NULL
  WHERE id = p_question_id;
END;
$$;

-- ============================================================================
-- Enhancement 4: Suspicious Activity Detection
-- ============================================================================

-- Add suspicious flag to mission_logs
ALTER TABLE mission_logs
ADD COLUMN IF NOT EXISTS suspicious BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS suspicious_reason TEXT;

-- ============================================================================
-- Enhancement 5: Question Reencounter Tracking
-- ============================================================================

-- Update user_question_history to enforce 7-day reencounter limit
-- Add index for efficient reencounter checks
CREATE INDEX IF NOT EXISTS idx_user_question_history_reencounter
  ON user_question_history(user_id, question_id, shown_at DESC);

-- Function to check if question was shown recently
CREATE OR REPLACE FUNCTION was_question_shown_recently(
  p_user_id UUID,
  p_question_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  recent_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO recent_count
  FROM user_question_history
  WHERE user_id = p_user_id
    AND question_id = p_question_id
    AND shown_at > NOW() - (p_days || ' days')::INTERVAL;

  -- Allow max 1 reencounter within 7 days
  RETURN recent_count >= 1;
END;
$$;

-- Enhanced get_recent_questions to include reencounter count
CREATE OR REPLACE FUNCTION get_recent_questions_with_count(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  question_id UUID,
  shown_count BIGINT,
  last_shown_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uqh.question_id,
    COUNT(*) as shown_count,
    MAX(uqh.shown_at) as last_shown_at
  FROM user_question_history uqh
  WHERE uqh.user_id = p_user_id
    AND uqh.shown_at > NOW() - (p_days || ' days')::INTERVAL
  GROUP BY uqh.question_id;
END;
$$;

-- ============================================================================
-- Update sample_pack_questions to exclude blacklisted questions
-- ============================================================================

CREATE OR REPLACE FUNCTION sample_pack_questions(
  p_user_id UUID,
  p_count INTEGER,
  p_difficulty VARCHAR DEFAULT NULL,
  p_skill VARCHAR DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE (
  question_id UUID,
  pack_id UUID,
  stem TEXT,
  choices TEXT[],
  answer TEXT,
  explanation TEXT,
  difficulty VARCHAR,
  has_explanation BOOLEAN,
  skill VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pq.id as question_id,
    pq.pack_id,
    pq.stem,
    pq.choices,
    pq.answer,
    pq.explanation,
    pq.difficulty,
    pq.has_explanation,
    p.skill
  FROM pack_questions pq
  JOIN packs p ON p.id = pq.pack_id
  JOIN user_pack_installations upi ON upi.pack_id = pq.pack_id
  WHERE upi.user_id = p_user_id
    AND pq.has_explanation = TRUE
    AND pq.is_blacklisted = FALSE  -- NEW: Exclude blacklisted questions
    AND (p_difficulty IS NULL OR pq.difficulty = p_difficulty)
    AND (p_skill IS NULL OR p.skill = p_skill)
    AND NOT (pq.id = ANY(p_exclude_ids))
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN user_missions.window_date IS 'Mission window date (Asia/Taipei timezone, 05:00 boundary)';
COMMENT ON COLUMN user_missions.answerable_until IS 'Questions are answerable until this timestamp (2 hours from start)';
COMMENT ON COLUMN pack_questions.is_blacklisted IS 'Whether this question is blacklisted (e.g., error in content, inappropriate)';
COMMENT ON COLUMN pack_questions.blacklist_reason IS 'Reason for blacklisting';
COMMENT ON COLUMN mission_logs.suspicious IS 'Whether this event was flagged as suspicious (anti-cheat)';
COMMENT ON COLUMN mission_logs.suspicious_reason IS 'Reason for suspicious flag';

COMMENT ON FUNCTION calculate_window_date(TIMESTAMPTZ) IS 'Calculate mission window date (05:00 boundary in Asia/Taipei)';
COMMENT ON FUNCTION was_question_shown_recently(UUID, UUID, INTEGER) IS 'Check if question was shown to user recently (max 1 reencounter in 7 days)';
COMMENT ON FUNCTION blacklist_question(UUID, TEXT) IS 'Blacklist a question with reason';
COMMENT ON FUNCTION unblacklist_question(UUID) IS 'Remove question from blacklist';

-- ============================================================================
-- Grant permissions
-- ============================================================================

-- Allow authenticated users to check recent questions
GRANT EXECUTE ON FUNCTION was_question_shown_recently(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_questions_with_count(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_window_date(TIMESTAMPTZ) TO authenticated;

-- Only service role can blacklist/unblacklist
GRANT EXECUTE ON FUNCTION blacklist_question(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION unblacklist_question(UUID) TO service_role;
