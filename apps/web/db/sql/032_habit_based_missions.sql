-- Migration: Habit-Based Mission Scheduling
-- Date: 2025-01-30
-- Description: Updates generate_daily_missions to use Learning DNA (preferred_session_length) for tailoring mission volume.

CREATE OR REPLACE FUNCTION generate_daily_missions(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_existing_missions JSONB;
  v_weak_subjects TEXT[];
  v_missions JSONB := '[]'::jsonb;
  v_weak_subject TEXT;
  v_mission_1_title TEXT;
  v_mission_1_desc TEXT;
  v_mission_1_count INTEGER := 2;
  v_mission_3_count INTEGER := 3;
  v_learning_dna JSONB;
  v_session_pref TEXT;
  v_peak_hour INTEGER;
BEGIN
  -- 1. Check if missions already exist for today
  SELECT missions INTO v_existing_missions
  FROM daily_missions
  WHERE user_id = p_user_id AND mission_date = CURRENT_DATE;

  IF v_existing_missions IS NOT NULL THEN
    RETURN v_existing_missions;
  END IF;

  -- 2. Fetch Learning DNA
  SELECT learning_dna INTO v_learning_dna
  FROM profiles
  WHERE id = p_user_id;

  v_session_pref := COALESCE(v_learning_dna->>'preferred_session_length', 'medium');
  v_peak_hour := COALESCE((v_learning_dna->>'peak_performance_hour')::INTEGER, 12);

  -- Adjust counts based on session preference
  IF v_session_pref = 'short' THEN
    v_mission_1_count := 1;
    v_mission_3_count := 2;
  ELSIF v_session_pref = 'long' THEN
    v_mission_1_count := 3;
    v_mission_3_count := 5;
  END IF;

  -- 3. Fetch user's weak subjects
  BEGIN
    SELECT weak_areas INTO v_weak_subjects
    FROM onboarding_task_configs
    WHERE user_id = p_user_id;
  EXCEPTION WHEN undefined_table THEN
    v_weak_subjects := NULL;
  END;

  IF v_weak_subjects IS NULL OR array_length(v_weak_subjects, 1) = 0 THEN
    v_weak_subjects := ARRAY['english', 'math', 'chinese'];
  END IF;

  v_weak_subject := v_weak_subjects[1 + floor(random() * array_length(v_weak_subjects, 1))::int];

  -- 4. Generate Mission 1: Subject-specific battle
  CASE v_weak_subject
    WHEN 'english' THEN
      v_mission_1_title := '英文挑戰';
      v_mission_1_desc := format('完成 %s 場英文對戰', v_mission_1_count);
    WHEN 'math' THEN
      v_mission_1_title := '數學訓練';
      v_mission_1_desc := format('完成 %s 場數學對戰', v_mission_1_count);
    WHEN 'chinese' THEN
      v_mission_1_title := '國文特訓';
      v_mission_1_desc := format('完成 %s 場國文對戰', v_mission_1_count);
    WHEN 'science' THEN
      v_mission_1_title := '自然科學';
      v_mission_1_desc := format('完成 %s 場自然科對戰', v_mission_1_count);
    WHEN 'social' THEN
      v_mission_1_title := '社會科學';
      v_mission_1_desc := format('完成 %s 場社會科對戰', v_mission_1_count);
    ELSE
      v_mission_1_title := '學科挑戰';
      v_mission_1_desc := format('完成 %s 場對戰', v_mission_1_count);
  END CASE;

  v_missions := v_missions || jsonb_build_object(
    'id', 'm1_' || floor(random() * 10000)::text,
    'type', 'play_battle',
    'subtype', v_weak_subject,
    'title', v_mission_1_title,
    'description', v_mission_1_desc,
    'target_count', v_mission_1_count,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 25 * v_mission_1_count, 'gold', 10 * v_mission_1_count),
    'suggested_hour', v_peak_hour
  );

  -- 5. Generate Mission 2: Random engagement task
  IF random() > 0.5 THEN
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', 'feed_chick',
      'subtype', 'any',
      'title', '照顧夥伴',
      'description', '餵食學習夥伴 1 次',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 30, 'gold', 10)
    );
  ELSE
    v_missions := v_missions || jsonb_build_object(
      'id', 'm2_' || floor(random() * 10000)::text,
      'type', 'win_battle',
      'subtype', 'any',
      'title', '對戰勝利',
      'description', '贏得 1 場對戰',
      'target_count', 1,
      'current_count', 0,
      'is_completed', false,
      'reward', jsonb_build_object('xp', 40, 'gold', 15)
    );
  END IF;

  -- 6. Generate Mission 3: Error review
  v_missions := v_missions || jsonb_build_object(
    'id', 'm3_' || floor(random() * 10000)::text,
    'type', 'review_error',
    'subtype', 'any',
    'title', '溫故知新',
    'description', format('複習 %s 題錯題', v_mission_3_count),
    'target_count', v_mission_3_count,
    'current_count', 0,
    'is_completed', false,
    'reward', jsonb_build_object('xp', 15 * v_mission_3_count, 'gold', 5 * v_mission_3_count)
  );

  -- 7. Insert into DB
  INSERT INTO daily_missions (user_id, mission_date, missions)
  VALUES (p_user_id, CURRENT_DATE, v_missions);

  RETURN v_missions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
