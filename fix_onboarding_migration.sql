-- =============================================
-- Onboarding Migration 增量修復腳本
-- 處理已經存在的物件，創建缺失的部分
-- =============================================

-- 安全創建表格（如果不存在）
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),
  challenge_started_at TIMESTAMPTZ,
  challenge_completed_at TIMESTAMPTZ,
  challenge_score INTEGER,
  challenge_question_ids UUID[] DEFAULT '{}',
  challenge_results JSONB DEFAULT '[]'::jsonb,
  target_university TEXT,
  target_department TEXT,
  is_exploring BOOLEAN DEFAULT false,
  current_grade TEXT,
  mock_exam_level INTEGER CHECK (mock_exam_level BETWEEN 1 AND 15),
  scorecard_started_at TIMESTAMPTZ,
  scorecard_submitted_at TIMESTAMPTZ,
  scorecard_responses JSONB DEFAULT '{}'::jsonb,
  scorecard_report_generated_at TIMESTAMPTZ,
  scorecard_report JSONB,
  initial_xp_granted INTEGER DEFAULT 0,
  initial_badge_granted TEXT,
  surprise_reward JSONB,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 3),
  subject TEXT DEFAULT 'english',
  explanation TEXT,
  is_active BOOLEAN DEFAULT true,
  times_used INTEGER DEFAULT 0,
  success_rate DECIMAL(3,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scorecard_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section TEXT NOT NULL,
  section_order INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section, section_order)
);

CREATE TABLE IF NOT EXISTS onboarding_task_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  task_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 安全創建索引（如果不存在）
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_user ON onboarding_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_status ON onboarding_sessions(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_sessions_step ON onboarding_sessions(current_step);
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_difficulty ON onboarding_questions(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_active ON onboarding_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_onboarding_questions_subject ON onboarding_questions(subject);
CREATE INDEX IF NOT EXISTS idx_scorecard_questions_section ON scorecard_questions(section, section_order);
CREATE INDEX IF NOT EXISTS idx_scorecard_questions_active ON scorecard_questions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_onboarding_task_configs_user ON onboarding_task_configs(user_id);

-- 安全啟用 RLS（如果尚未啟用）
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_task_configs ENABLE ROW LEVEL SECURITY;

-- 安全創建 RLS 政策（如果不存在）
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can view their own onboarding sessions" ON onboarding_sessions
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view active onboarding questions" ON onboarding_questions;
CREATE POLICY "Users can view active onboarding questions" ON onboarding_questions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view active scorecard questions" ON scorecard_questions;
CREATE POLICY "Users can view active scorecard questions" ON scorecard_questions
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view their own task configs" ON onboarding_task_configs;
CREATE POLICY "Users can view their own task configs" ON onboarding_task_configs
  FOR ALL USING (auth.uid() = user_id);

-- 安全創建 Trigger（如果不存在）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_onboarding_sessions_updated_at ON onboarding_sessions;
CREATE TRIGGER update_onboarding_sessions_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_questions_updated_at ON onboarding_questions;
CREATE TRIGGER update_onboarding_questions_updated_at
  BEFORE UPDATE ON onboarding_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_scorecard_questions_updated_at ON scorecard_questions;
CREATE TRIGGER update_scorecard_questions_updated_at
  BEFORE UPDATE ON scorecard_questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_task_configs_updated_at ON onboarding_task_configs;
CREATE TRIGGER update_onboarding_task_configs_updated_at
  BEFORE UPDATE ON onboarding_task_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 安全創建 Helper Functions
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

-- 添加註釋
COMMENT ON TABLE onboarding_sessions IS 'Tracks user onboarding progress through 6 steps with challenge, goal setting, and optional scorecard';
COMMENT ON TABLE onboarding_questions IS 'Question pool for 30-second onboarding challenge (2-3 questions with DDA)';
COMMENT ON TABLE scorecard_questions IS '20-question learning scorecard for personalized study plan generation';
COMMENT ON TABLE onboarding_task_configs IS 'Personalized daily task configuration generated from onboarding results';

COMMENT ON COLUMN onboarding_sessions.challenge_results IS 'Array of {question_id, is_correct, time_ms} for challenge performance tracking';
COMMENT ON COLUMN onboarding_sessions.scorecard_responses IS 'Object mapping question_number to response value (1-10)';
COMMENT ON COLUMN onboarding_sessions.scorecard_report IS 'Generated analysis report with scores by category and recommendations';
