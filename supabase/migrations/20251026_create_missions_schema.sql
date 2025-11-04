-- =============================================
-- Module 3: Micro-Mission Cards - Database Schema
-- =============================================

-- =============================================
-- 0. Optimization: Add composite index for Shop V2
-- =============================================

-- As suggested: Index combo (subject, grade, source) for faster multi-filter queries
CREATE INDEX IF NOT EXISTS idx_packs_subject_grade_source
  ON packs(subject, grade, source);

-- Add default for source_name when null
DO $$
BEGIN
  -- Update existing packs with null source_name
  UPDATE packs
  SET source_name = 'PLMS 內部內容'
  WHERE source_name IS NULL AND source = 'internal';
END $$;

-- Add trigger to auto-populate source_name
CREATE OR REPLACE FUNCTION set_default_source_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_name IS NULL AND NEW.source = 'internal' THEN
    NEW.source_name := 'PLMS 內部內容';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_source_name ON packs;
CREATE TRIGGER trigger_set_default_source_name
  BEFORE INSERT OR UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION set_default_source_name();

-- =============================================
-- 1. Mission Templates Table
-- =============================================

DROP TABLE IF EXISTS mission_logs CASCADE;
DROP TABLE IF EXISTS user_missions CASCADE;
DROP TABLE IF EXISTS missions CASCADE;

CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Mission metadata
  title VARCHAR(100) NOT NULL,
  description TEXT,

  -- Target
  target_skill VARCHAR(100), -- e.g., "一元一次方程式"
  target_topic VARCHAR(100), -- e.g., "代數"
  target_grade VARCHAR(20),  -- e.g., "國中"

  -- Difficulty & configuration
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  num_questions INTEGER NOT NULL DEFAULT 5 CHECK (num_questions BETWEEN 3 AND 10),

  -- Source mix (percentages)
  pack_ratio DECIMAL(3,2) DEFAULT 0.7 CHECK (pack_ratio BETWEEN 0 AND 1),
  error_book_ratio DECIMAL(3,2) DEFAULT 0.3 CHECK (error_book_ratio BETWEEN 0 AND 1),

  -- Mission type
  mission_type VARCHAR(20) DEFAULT 'daily' CHECK (mission_type IN ('daily', 'skill_focus', 'review', 'challenge')),

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_skill ON missions(target_skill);
CREATE INDEX idx_missions_type ON missions(mission_type);

-- =============================================
-- 2. User Missions Table (Instance per user)
-- =============================================

CREATE TABLE user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Mission reference (can be null for auto-generated daily missions)
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,

  -- Mission date (for daily missions)
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Questions selected for this mission
  question_ids UUID[] NOT NULL, -- Array of pack_question IDs
  question_count INTEGER NOT NULL,

  -- Metadata about question sources
  pack_count INTEGER DEFAULT 0,
  error_book_count INTEGER DEFAULT 0,

  -- Progress
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),

  -- Results
  correct_count INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,

  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraint: One mission per user per day
  UNIQUE(user_id, mission_date)
);

-- Indexes
CREATE INDEX idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX idx_user_missions_date ON user_missions(mission_date DESC);
CREATE INDEX idx_user_missions_status ON user_missions(status);
CREATE INDEX idx_user_missions_user_date ON user_missions(user_id, mission_date);

-- =============================================
-- 3. Mission Logs Table (Analytics & History)
-- =============================================

CREATE TABLE mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_mission_id UUID NOT NULL REFERENCES user_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Event type
  event_type VARCHAR(50) NOT NULL, -- 'start', 'answer', 'complete', 'abandon'

  -- Event payload (flexible JSON)
  payload JSONB,

  -- Specific fields for common events
  question_id UUID, -- For 'answer' events
  is_correct BOOLEAN, -- For 'answer' events
  time_spent_ms INTEGER, -- For 'answer' events

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mission_logs_user_mission ON mission_logs(user_mission_id);
CREATE INDEX idx_mission_logs_user_id ON mission_logs(user_id);
CREATE INDEX idx_mission_logs_event_type ON mission_logs(event_type);
CREATE INDEX idx_mission_logs_created_at ON mission_logs(created_at DESC);

-- =============================================
-- 4. Question Selection History (Deduplication)
-- =============================================

CREATE TABLE user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,

  -- When was this question shown?
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Context
  context VARCHAR(50), -- 'mission', 'challenge', 'practice'

  -- Result
  was_correct BOOLEAN,

  -- Constraint: Track each question once per context
  UNIQUE(user_id, question_id, context, shown_at)
);

-- Indexes
CREATE INDEX idx_user_question_history_user ON user_question_history(user_id);
CREATE INDEX idx_user_question_history_shown_at ON user_question_history(shown_at DESC);
CREATE INDEX idx_user_question_history_question ON user_question_history(question_id);

-- =============================================
-- 5. Row Level Security (RLS)
-- =============================================

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;

-- Missions: Public can view active missions
CREATE POLICY "Users can view active missions"
  ON missions FOR SELECT
  USING (status = 'active');

CREATE POLICY "Admins can manage missions"
  ON missions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- User Missions: Users can only see/modify their own
CREATE POLICY "Users can view own missions"
  ON user_missions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own missions"
  ON user_missions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own missions"
  ON user_missions FOR UPDATE
  USING (auth.uid() = user_id);

-- Mission Logs: Users can only see/insert their own
CREATE POLICY "Users can view own mission logs"
  ON mission_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mission logs"
  ON mission_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Question History: Users can only see/modify their own
CREATE POLICY "Users can view own question history"
  ON user_question_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own question history"
  ON user_question_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- =============================================
-- 6. Helper Functions
-- =============================================

-- Function: Get user's recently seen questions (for deduplication)
CREATE OR REPLACE FUNCTION get_recent_questions(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE(question_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT uqh.question_id
  FROM user_question_history uqh
  WHERE uqh.user_id = p_user_id
    AND uqh.shown_at > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Sample questions from installed packs
CREATE OR REPLACE FUNCTION sample_pack_questions(
  p_user_id UUID,
  p_count INTEGER,
  p_difficulty VARCHAR DEFAULT NULL,
  p_skill VARCHAR DEFAULT NULL,
  p_exclude_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS TABLE(
  question_id UUID,
  pack_id UUID,
  stem TEXT,
  choices TEXT[],
  answer VARCHAR,
  explanation TEXT,
  difficulty VARCHAR,
  has_explanation BOOLEAN,
  skill VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pq.id,
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
    AND (p_difficulty IS NULL OR pq.difficulty = p_difficulty)
    AND (p_skill IS NULL OR p.skill = p_skill)
    AND NOT (pq.id = ANY(p_exclude_ids))
  ORDER BY RANDOM()
  LIMIT p_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update mission progress
CREATE OR REPLACE FUNCTION update_mission_progress(
  p_user_mission_id UUID,
  p_is_correct BOOLEAN
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_missions
  SET
    total_answered = total_answered + 1,
    correct_count = correct_count + CASE WHEN p_is_correct THEN 1 ELSE 0 END,
    updated_at = NOW()
  WHERE id = p_user_mission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Complete mission
CREATE OR REPLACE FUNCTION complete_mission(
  p_user_mission_id UUID,
  p_time_spent_seconds INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE user_missions
  SET
    status = 'completed',
    completed_at = NOW(),
    time_spent_seconds = p_time_spent_seconds,
    updated_at = NOW()
  WHERE id = p_user_mission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 7. Sample Data
-- =============================================

-- Create a default daily mission template
INSERT INTO missions (
  id,
  title,
  description,
  target_skill,
  target_topic,
  num_questions,
  pack_ratio,
  error_book_ratio,
  mission_type,
  status
) VALUES (
  'mission-daily-001',
  '每日練習',
  '每天 3-5 題精選練習，保持學習節奏',
  NULL, -- Auto-match user's weak skills
  NULL,
  5,
  0.7,
  0.3,
  'daily',
  'active'
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE missions IS 'Module 3: Mission templates (daily, skill-focus, review, challenge)';
COMMENT ON TABLE user_missions IS 'Module 3: User mission instances (one per user per day)';
COMMENT ON TABLE mission_logs IS 'Module 3: Mission event logs for analytics';
COMMENT ON TABLE user_question_history IS 'Module 3: Question deduplication history (7-day window)';

COMMENT ON COLUMN user_missions.question_ids IS 'Array of pack_question IDs selected for this mission';
COMMENT ON COLUMN user_missions.pack_count IS 'Number of questions from installed packs (70%)';
COMMENT ON COLUMN user_missions.error_book_count IS 'Number of questions from error book (30%)';

COMMENT ON FUNCTION sample_pack_questions IS 'Module 3: Sample questions from user installed packs with deduplication';
COMMENT ON FUNCTION get_recent_questions IS 'Module 3: Get questions shown in last N days (default 7)';
