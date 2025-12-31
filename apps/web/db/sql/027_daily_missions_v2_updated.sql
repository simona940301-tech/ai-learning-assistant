-- ============================================================
-- Migration: 027_daily_missions_v2_updated.sql
-- Description: Update daily mission generation to use actual subjects
-- Created: 2025-11-25
-- ============================================================

-- =============================================
-- 1. Drop old function
-- =============================================
DROP FUNCTION IF EXISTS generate_daily_missions(UUID);

-- =============================================
-- 2. Create updated mission generation function
-- =============================================
CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_weak_subjects TEXT[];
  v_missions JSONB := '[]'::jsonb;
  v_weak_subject TEXT;
  v_mission_1_title TEXT;
  v_mission_1_desc TEXT;
  v_mission_2_type TEXT;
  v_mission_2_title TEXT;
  v_mission_2_desc TEXT;
BEGIN
  -- 1. Check if missions already exist for today
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- 2. Fetch user's weak subjects from profile or onboarding
  -- Try to get from onboarding_task_configs first
  BEGIN
    SELECT weak_areas INTO v_weak_subjects
    FROM onboarding_task_configs
    WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, use defaults
    v_weak_subjects := NULL;
  END;

  -- Default subjects if no config exists
  IF v_weak_subjects IS NULL OR array_length(v_weak_subjects, 1) = 0 THEN
    v_weak_subjects := ARRAY['english', 'math', 'chinese'];
  END IF;

  -- Pick a random weak subject for Mission 1
  v_weak_subject := v_weak_subjects[1 + floor(random() * array_length(v_weak_subjects, 1))::int];

  -- 3. Generate Mission 1: Subject-specific battle
  -- Map subjects to user-friendly names
  CASE v_weak_subject
    WHEN 'english' THEN
      v_mission_1_title := '英文挑戰';
      v_mission_1_desc := '完成 2 場英文對戰';
    WHEN 'math' THEN
      v_mission_1_title := '數學訓練';
      v_mission_1_desc := '完成 2 場數學對戰';
    WHEN 'chinese' THEN
      v_mission_1_title := '國文特訓';
      v_mission_1_desc := '完成 2 場國文對戰';
    WHEN 'science' THEN
      v_mission_1_title := '自然科學';
      v_mission_1_desc := '完成 2 場自然科對戰';
    WHEN 'social' THEN
      v_mission_1_title := '社會科學';
      v_mission_1_desc := '完成 2 場社會科對戰';
    ELSE
      v_mission_1_title := '學科挑戰';
      v_mission_1_desc := '完成 2 場對戰';
  END CASE;

  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', v_weak_subject,
    'title', v_mission_1_title,
    'description', v_mission_1_desc,
    'target_count', 2,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 50, 'gold', 20)
  );

  -- 4. Generate Mission 2: Random engagement task
  IF random() > 0.5 THEN
    -- Feed chick mission
    v_mission_2_type := 'feed_chick';
    v_mission_2_title := '照顧夥伴';
    v_mission_2_desc := '餵食學習夥伴 1 次';
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', v_mission_2_type,
      'subtype', 'any',
      'title', v_mission_2_title,
      'description', v_mission_2_desc,
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 30, 'gold', 10)
    );
  ELSE
    -- Win battle mission
    v_mission_2_type := 'win_battle';
    v_mission_2_title := '對戰勝利';
    v_mission_2_desc := '贏得 1 場對戰';
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', v_mission_2_type,
      'subtype', 'any',
      'title', v_mission_2_title,
      'description', v_mission_2_desc,
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 40, 'gold', 15)
    );
  END IF;

  -- 5. Generate Mission 3: Error review
  v_missions := v_missions || jsonb_build_object(
    'id', 'm3_' || floor(random() * 10000)::text,
    'type', 'review_error',
    'subtype', 'any',
    'title', '溫故知新',
    'description', '複習 3 題錯題',
    'target_count', 3,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 40, 'gold', 15)
  );

  -- 6. Insert into DB
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 3. Comments
-- =============================================
COMMENT ON FUNCTION generate_daily_missions IS 'Generates 3 personalized daily missions based on user weak subjects (english, math, chinese, science, social)';

-- =============================================
-- 4. Verification
-- =============================================
SELECT 'generate_daily_missions function updated' as status;
