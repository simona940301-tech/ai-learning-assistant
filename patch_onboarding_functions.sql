-- =============================================
-- Onboarding Functions 修補腳本
-- 先刪除現有函數然後重新創建
-- =============================================

-- 先刪除現有的函數（如果存在且參數不匹配）
DROP FUNCTION IF EXISTS get_onboarding_question(integer, text, uuid[]);
DROP FUNCTION IF EXISTS generate_task_config_from_onboarding(uuid, uuid);
DROP FUNCTION IF EXISTS complete_onboarding(uuid, uuid);

-- 重新創建 Helper Functions
CREATE OR REPLACE FUNCTION get_onboarding_question(
  p_difficulty INTEGER DEFAULT NULL,
  p_subject TEXT DEFAULT 'english',
  p_exclude_ids UUID[] DEFAULT '{}'
)
RETURNS TABLE (
  id UUID,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT,
  difficulty_level INTEGER,
  subject TEXT,
  explanation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d,
    q.correct_answer, q.difficulty_level, q.subject, q.explanation
  FROM onboarding_questions q
  WHERE q.is_active = true
    AND q.subject = COALESCE(p_subject, q.subject)
    AND (p_difficulty IS NULL OR q.difficulty_level = p_difficulty)
    AND (array_length(p_exclude_ids, 1) IS NULL OR q.id != ALL(p_exclude_ids))
  ORDER BY q.times_used ASC, RANDOM()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION generate_task_config_from_onboarding(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_session RECORD;
  v_config_id UUID;
  v_task_config JSONB;
BEGIN
  -- Get session data
  SELECT * INTO v_session
  FROM onboarding_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Generate task config based on challenge score
  v_task_config := jsonb_build_object(
    'daily_tasks', CASE 
      WHEN v_session.challenge_score >= 2 THEN 
        jsonb_build_array(
          jsonb_build_object('type', 'vocabulary', 'count', 10, 'difficulty', 'medium'),
          jsonb_build_object('type', 'reading', 'count', 1, 'difficulty', 'medium'),
          jsonb_build_object('type', 'grammar', 'count', 5, 'difficulty', 'easy')
        )
      WHEN v_session.challenge_score = 1 THEN 
        jsonb_build_array(
          jsonb_build_object('type', 'vocabulary', 'count', 15, 'difficulty', 'easy'),
          jsonb_build_object('type', 'reading', 'count', 1, 'difficulty', 'easy'),
          jsonb_build_object('type', 'grammar', 'count', 10, 'difficulty', 'easy')
        )
      ELSE 
        jsonb_build_array(
          jsonb_build_object('type', 'vocabulary', 'count', 20, 'difficulty', 'easy'),
          jsonb_build_object('type', 'grammar', 'count', 15, 'difficulty', 'easy')
        )
    END,
    'weekly_goal', CASE 
      WHEN v_session.challenge_score >= 2 THEN 50
      WHEN v_session.challenge_score = 1 THEN 35
      ELSE 25
    END,
    'focus_areas', CASE 
      WHEN v_session.challenge_score >= 2 THEN jsonb_build_array('vocabulary', 'reading')
      WHEN v_session.challenge_score = 1 THEN jsonb_build_array('vocabulary', 'grammar')
      ELSE jsonb_build_array('vocabulary', 'grammar')
    END
  );

  -- Insert task config
  INSERT INTO onboarding_task_configs (user_id, session_id, task_type, task_config)
  VALUES (p_user_id, p_session_id, 'daily_mission', v_task_config)
  RETURNING id INTO v_config_id;

  RETURN v_config_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION complete_onboarding(
  p_user_id UUID,
  p_session_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_session RECORD;
BEGIN
  -- Get session
  SELECT * INTO v_session
  FROM onboarding_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  -- Update session status
  UPDATE onboarding_sessions
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  -- Update profile
  UPDATE profiles
  SET
    onboarding_completed = true,
    target_university = v_session.target_university,
    target_department = v_session.target_department,
    updated_at = NOW()
  WHERE id = p_user_id;

  -- Generate task config
  PERFORM generate_task_config_from_onboarding(p_user_id, p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 測試函數是否正常工作
SELECT 'Testing get_onboarding_question function...' as test_message;
SELECT COUNT(*) as available_questions FROM get_onboarding_question();

SELECT 'Functions created successfully!' as status;
