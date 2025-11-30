-- ============================================================
-- Migration: 028_daily_missions_english_only.sql
-- Description: Update to generate English-only missions (current question bank)
-- Created: 2025-11-25
-- ============================================================

-- =============================================
-- 1. Drop old function
-- =============================================
DROP FUNCTION IF EXISTS generate_daily_missions(UUID);

-- =============================================
-- 2. Create English-focused mission generation
-- =============================================
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_missions JSONB := '[]'::jsonb;
  v_mission_2_type TEXT;
BEGIN
  -- 1. Check if missions already exist for today
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- 2. Generate Mission 1: English practice (main focus)
  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', 'english',
    'title', '英文練習',
    'description', '完成 2 場英文對戰',
    'target_count', 2,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 50, 'gold', 20)
  );

  -- 3. Generate Mission 2: Random engagement (50/50)
  IF random() > 0.5 THEN
    v_mission_2_type := 'feed_chick';
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', v_mission_2_type,
      'subtype', 'any',
      'title', '照顧夥伴',
      'description', '餵食學習夥伴 1 次',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 30, 'gold', 10)
    );
  ELSE
    v_mission_2_type := 'win_battle';
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', v_mission_2_type,
      'subtype', 'any',
      'title', '對戰勝利',
      'description', '贏得 1 場對戰',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 40, 'gold', 15)
    );
  END IF;

  -- 4. Generate Mission 3: Error review
  v_missions := v_missions || jsonb_build_object(
    'id', 'm3_' || floor(random() * 10000)::text,
    'type', 'review_error',
    'subtype', 'any',
    'title', '複習錯題',
    'description', '複習 3 題錯題',
    'target_count', 3,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 40, 'gold', 15)
  );

  -- 5. Insert into DB
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Comments
-- =============================================
COMMENT ON FUNCTION generate_daily_missions IS 'Generates 3 daily missions focused on English practice (current question bank availability)';

-- =============================================
-- 4. Clean up today missions for re-generation
-- =============================================
-- This will force regeneration with new logic on next API call
DELETE FROM daily_missions WHERE mission_date = CURRENT_DATE;

-- =============================================
-- 5. Verification
-- =============================================
SELECT 'Daily missions updated to English-only mode' as status;
