-- ============================================================
-- Migration: 021_onboarding_flow_safe.sql
-- Description: Safe migration with IF NOT EXISTS checks
-- Created: 2025-11-22
-- ============================================================

-- =============================================
-- 1. Onboarding Sessions
-- =============================================
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  current_step INTEGER DEFAULT 1 CHECK (current_step BETWEEN 1 AND 6),

  -- Phase A: Quick Win
  challenge_started_at TIMESTAMPTZ,
  challenge_completed_at TIMESTAMPTZ,
  challenge_score INTEGER,
  challenge_question_ids TEXT[] DEFAULT '{}',
  challenge_results JSONB DEFAULT '[]'::jsonb,

  -- Phase B: Goal & Data (NEW FIELDS)
  exam_year TEXT,
  priority_subjects TEXT[] DEFAULT '{}',
  target_university TEXT,
  target_department TEXT,
  is_exploring BOOLEAN DEFAULT false,
  current_grade TEXT,
  mock_exam_level INTEGER CHECK (mock_exam_level BETWEEN 1 AND 15),

  -- Phase C: Scorecard (optional)
  scorecard_started_at TIMESTAMPTZ,
  scorecard_submitted_at TIMESTAMPTZ,
  scorecard_responses JSONB DEFAULT '{}'::jsonb,
  scorecard_report_generated_at TIMESTAMPTZ,
  scorecard_report JSONB,

  -- Rewards tracking
  initial_xp_granted INTEGER DEFAULT 0,
  initial_badge_granted TEXT,
  surprise_reward JSONB,

  -- Status
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  completed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_sessions' AND column_name = 'exam_year'
  ) THEN
    ALTER TABLE onboarding_sessions ADD COLUMN exam_year TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'onboarding_sessions' AND column_name = 'priority_subjects'
  ) THEN
    ALTER TABLE onboarding_sessions ADD COLUMN priority_subjects TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Indexes (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_sessions_user') THEN
    CREATE INDEX idx_onboarding_sessions_user ON onboarding_sessions(user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_sessions_status') THEN
    CREATE INDEX idx_onboarding_sessions_status ON onboarding_sessions(status);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_sessions_step') THEN
    CREATE INDEX idx_onboarding_sessions_step ON onboarding_sessions(current_step);
  END IF;
END $$;

-- =============================================
-- 2. Onboarding Questions
-- =============================================
CREATE TABLE IF NOT EXISTS onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  difficulty_level INTEGER NOT NULL CHECK (difficulty_level BETWEEN 1 AND 3),
  total_shown INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  correct_rate DECIMAL(5, 4),
  subject TEXT DEFAULT 'english' CHECK (subject IN ('english', 'math', 'chinese')),
  knowledge_tags TEXT[] DEFAULT '{}',
  explanation TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_questions_difficulty') THEN
    CREATE INDEX idx_onboarding_questions_difficulty ON onboarding_questions(difficulty_level);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_questions_active') THEN
    CREATE INDEX idx_onboarding_questions_active ON onboarding_questions(is_active) WHERE is_active = true;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_questions_subject') THEN
    CREATE INDEX idx_onboarding_questions_subject ON onboarding_questions(subject);
  END IF;
END $$;

-- =============================================
-- 3. Scorecard Questions
-- =============================================
CREATE TABLE IF NOT EXISTS scorecard_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL UNIQUE CHECK (question_number BETWEEN 1 AND 20),
  section TEXT NOT NULL,
  section_order INTEGER,
  question_text TEXT NOT NULL,
  question_subtitle TEXT,
  response_type TEXT DEFAULT 'slider' CHECK (response_type IN ('slider', 'multiple_choice')),
  min_value INTEGER DEFAULT 1,
  max_value INTEGER DEFAULT 10,
  options JSONB,
  analysis_weight NUMERIC DEFAULT 1.0,
  analysis_category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scorecard_questions_section') THEN
    CREATE INDEX idx_scorecard_questions_section ON scorecard_questions(section, section_order);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_scorecard_questions_active') THEN
    CREATE INDEX idx_scorecard_questions_active ON scorecard_questions(is_active) WHERE is_active = true;
  END IF;
END $$;

-- =============================================
-- 4. Onboarding Task Configs
-- =============================================
CREATE TABLE IF NOT EXISTS onboarding_task_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  weak_areas TEXT[] DEFAULT '{}',
  recommended_difficulty INTEGER CHECK (recommended_difficulty BETWEEN 1 AND 5),
  vocabulary_ratio DECIMAL(3,2) DEFAULT 0.4,
  cloze_ratio DECIMAL(3,2) DEFAULT 0.3,
  reading_ratio DECIMAL(3,2) DEFAULT 0.3,
  daily_task_size INTEGER DEFAULT 4 CHECK (daily_task_size BETWEEN 3 AND 6),
  study_time_target_minutes INTEGER,
  review_frequency_days INTEGER,
  generated_from_challenge BOOLEAN DEFAULT true,
  generated_from_scorecard BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index (safe creation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_onboarding_task_configs_user') THEN
    CREATE INDEX idx_onboarding_task_configs_user ON onboarding_task_configs(user_id);
  END IF;
END $$;

-- =============================================
-- 5. RLS Policies
-- =============================================
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scorecard_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_task_configs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own onboarding sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can insert own onboarding sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Users can update own onboarding sessions" ON onboarding_sessions;
DROP POLICY IF EXISTS "Anyone can view active onboarding questions" ON onboarding_questions;
DROP POLICY IF EXISTS "Admins can manage onboarding questions" ON onboarding_questions;
DROP POLICY IF EXISTS "Anyone can view active scorecard questions" ON scorecard_questions;
DROP POLICY IF EXISTS "Admins can manage scorecard questions" ON scorecard_questions;
DROP POLICY IF EXISTS "Users can view own task config" ON onboarding_task_configs;
DROP POLICY IF EXISTS "Users can manage own task config" ON onboarding_task_configs;

-- Recreate policies
CREATE POLICY "Users can view own onboarding sessions"
  ON onboarding_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding sessions"
  ON onboarding_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding sessions"
  ON onboarding_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view active onboarding questions"
  ON onboarding_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage onboarding questions"
  ON onboarding_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view active scorecard questions"
  ON scorecard_questions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage scorecard questions"
  ON scorecard_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can view own task config"
  ON onboarding_task_configs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own task config"
  ON onboarding_task_configs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 6. Triggers
-- =============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS onboarding_sessions_updated_at ON onboarding_sessions;
DROP TRIGGER IF EXISTS onboarding_questions_updated_at ON onboarding_questions;
DROP TRIGGER IF EXISTS scorecard_questions_updated_at ON scorecard_questions;
DROP TRIGGER IF EXISTS onboarding_task_configs_updated_at ON onboarding_task_configs;
DROP TRIGGER IF EXISTS update_question_stats_on_completion ON onboarding_sessions;

-- Recreate triggers
CREATE TRIGGER onboarding_sessions_updated_at
  BEFORE UPDATE ON onboarding_sessions
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER onboarding_questions_updated_at
  BEFORE UPDATE ON onboarding_questions
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER scorecard_questions_updated_at
  BEFORE UPDATE ON scorecard_questions
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER onboarding_task_configs_updated_at
  BEFORE UPDATE ON onboarding_task_configs
  FOR EACH ROW EXECUTE FUNCTION update_onboarding_updated_at();

-- Auto-update question stats
CREATE OR REPLACE FUNCTION update_onboarding_question_stats()
RETURNS TRIGGER AS $$
DECLARE
  result_item JSONB;
  question_id_str TEXT;
  is_correct_val BOOLEAN;
BEGIN
  IF NEW.challenge_completed_at IS NOT NULL AND OLD.challenge_completed_at IS NULL THEN
    FOR result_item IN SELECT * FROM jsonb_array_elements(NEW.challenge_results)
    LOOP
      question_id_str := result_item->>'question_id';
      is_correct_val := (result_item->>'is_correct')::BOOLEAN;

      UPDATE onboarding_questions
      SET
        total_shown = total_shown + 1,
        total_correct = total_correct + CASE WHEN is_correct_val THEN 1 ELSE 0 END,
        correct_rate = (total_correct + CASE WHEN is_correct_val THEN 1 ELSE 0 END)::DECIMAL / (total_shown + 1)
      WHERE id::text = question_id_str;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_question_stats_on_completion
  AFTER UPDATE ON onboarding_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_question_stats();

-- =============================================
-- 7. Helper Functions
-- =============================================

CREATE OR REPLACE FUNCTION get_onboarding_question(
  p_difficulty INTEGER,
  p_subject TEXT DEFAULT 'english',
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(
  id UUID,
  question_text TEXT,
  option_a TEXT,
  option_b TEXT,
  option_c TEXT,
  option_d TEXT,
  correct_answer TEXT,
  difficulty_level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oq.id,
    oq.question_text,
    oq.option_a,
    oq.option_b,
    oq.option_c,
    oq.option_d,
    oq.correct_answer,
    oq.difficulty_level
  FROM onboarding_questions oq
  WHERE oq.is_active = true
    AND oq.difficulty_level = p_difficulty
    AND oq.subject = p_subject
    AND NOT (oq.id = ANY(p_exclude_ids))
  ORDER BY RANDOM()
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
  v_weak_areas TEXT[];
  v_vocab_ratio DECIMAL;
  v_cloze_ratio DECIMAL;
  v_reading_ratio DECIMAL;
  v_config_id UUID;
BEGIN
  SELECT * INTO v_session
  FROM onboarding_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  v_weak_areas := ARRAY['vocabulary', 'cloze', 'reading'];
  v_vocab_ratio := 0.4;
  v_cloze_ratio := 0.3;
  v_reading_ratio := 0.3;

  INSERT INTO onboarding_task_configs (
    user_id,
    weak_areas,
    vocabulary_ratio,
    cloze_ratio,
    reading_ratio,
    daily_task_size,
    generated_from_challenge,
    generated_from_scorecard
  ) VALUES (
    p_user_id,
    v_weak_areas,
    v_vocab_ratio,
    v_cloze_ratio,
    v_reading_ratio,
    4,
    true,
    v_session.scorecard_submitted_at IS NOT NULL
  )
  ON CONFLICT (user_id) DO UPDATE SET
    weak_areas = EXCLUDED.weak_areas,
    vocabulary_ratio = EXCLUDED.vocabulary_ratio,
    cloze_ratio = EXCLUDED.cloze_ratio,
    reading_ratio = EXCLUDED.reading_ratio,
    daily_task_size = EXCLUDED.daily_task_size,
    generated_from_scorecard = EXCLUDED.generated_from_scorecard,
    updated_at = NOW()
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
  SELECT * INTO v_session
  FROM onboarding_sessions
  WHERE id = p_session_id AND user_id = p_user_id;

  UPDATE onboarding_sessions
  SET
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_session_id;

  UPDATE profiles
  SET
    onboarding_completed = true,
    target_university = v_session.target_university,
    target_department = v_session.target_department,
    updated_at = NOW()
  WHERE id = p_user_id;

  PERFORM generate_task_config_from_onboarding(p_user_id, p_session_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 8. Comments
-- =============================================

COMMENT ON TABLE onboarding_sessions IS 'Tracks user onboarding progress through 6 steps with challenge, goal setting, and optional scorecard';
COMMENT ON TABLE onboarding_questions IS 'Question pool for 30-second onboarding challenge (2-3 questions with DDA)';
COMMENT ON TABLE scorecard_questions IS '20-question learning scorecard for personalized study plan generation';
COMMENT ON TABLE onboarding_task_configs IS 'Personalized daily task configuration generated from onboarding results';
