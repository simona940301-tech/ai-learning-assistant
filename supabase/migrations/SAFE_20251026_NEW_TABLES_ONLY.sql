/**
 * SAFE MIGRATION: 僅創建新表（不影響現有表）
 *
 * 這個腳本只創建新表，不會修改或刪除現有表
 * 適用於已經有數據的數據庫
 *
 * 創建的表：
 * - analytics_events
 * - packs, pack_chapters, pack_questions
 * - missions, user_missions, mission_logs
 * - user_question_history
 * - error_book, user_answers
 *
 * 執行方式：
 * 1. 在 Supabase Dashboard → SQL Editor
 * 2. 複製貼上整個文件內容
 * 3. 點擊 "Run"
 */

-- ============================================
-- CHECK 1: 檢查必要的 extension
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- MIGRATION 00: ANALYTICS EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  device VARCHAR(50),
  client_timestamp TIMESTAMPTZ NOT NULL,
  server_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context JSONB DEFAULT '{}',
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_event_id ON analytics_events(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(server_timestamp DESC);

-- Note: Partial index with NOW() removed (not IMMUTABLE)
-- For 24h queries, use WHERE clause in your query instead

-- ============================================
-- MIGRATION 01: PACKS SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL,
  item_count INTEGER NOT NULL DEFAULT 0,
  has_explanation BOOLEAN NOT NULL DEFAULT FALSE,
  explanation_rate DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (explanation_rate >= 0 AND explanation_rate <= 1),
  avg_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (avg_confidence >= 0 AND avg_confidence <= 1),
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'expired')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  install_count INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (completion_rate >= 0 AND completion_rate <= 1),
  qr_alias VARCHAR(50) UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pack_chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  item_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pack_id, "order")
);

CREATE TABLE IF NOT EXISTS pack_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES pack_chapters(id) ON DELETE CASCADE,
  stem TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  answer VARCHAR(10) NOT NULL,
  explanation TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  has_explanation BOOLEAN NOT NULL DEFAULT FALSE,
  confidence DECIMAL(3,2) DEFAULT 0.0,
  "order" INTEGER NOT NULL DEFAULT 0,
  question_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_pack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'shop' CHECK (source IN ('shop', 'qr', 'rs_suggest', 'direct')),
  list_position INTEGER,
  completed_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, pack_id)
);

-- Indexes for packs
CREATE INDEX IF NOT EXISTS idx_packs_status ON packs(status);
CREATE INDEX IF NOT EXISTS idx_packs_subject_topic ON packs(subject, topic);
CREATE INDEX IF NOT EXISTS idx_packs_skill ON packs(skill);
CREATE INDEX IF NOT EXISTS idx_packs_grade ON packs(grade);

-- Indexes for pack_questions
CREATE INDEX IF NOT EXISTS idx_pack_questions_pack_id ON pack_questions(pack_id);
CREATE INDEX IF NOT EXISTS idx_pack_questions_chapter_id ON pack_questions(chapter_id);

-- Indexes for user_pack_installations
CREATE INDEX IF NOT EXISTS idx_user_pack_installations_user_id ON user_pack_installations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pack_installations_pack_id ON user_pack_installations(pack_id);

-- ============================================
-- MIGRATION 02: MISSIONS SCHEMA
-- ============================================

CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(100) NOT NULL,
  description TEXT,
  target_skill VARCHAR(100),
  target_topic VARCHAR(100),
  target_grade VARCHAR(20),
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  num_questions INTEGER NOT NULL DEFAULT 5 CHECK (num_questions BETWEEN 3 AND 10),
  pack_ratio DECIMAL(3,2) DEFAULT 0.7 CHECK (pack_ratio BETWEEN 0 AND 1),
  error_book_ratio DECIMAL(3,2) DEFAULT 0.3 CHECK (error_book_ratio BETWEEN 0 AND 1),
  mission_type VARCHAR(20) DEFAULT 'daily' CHECK (mission_type IN ('daily', 'skill_focus', 'review', 'challenge')),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID REFERENCES missions(id) ON DELETE SET NULL,
  mission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  question_ids UUID[] NOT NULL,
  question_count INTEGER NOT NULL,
  pack_count INTEGER DEFAULT 0,
  error_book_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'abandoned')),
  correct_count INTEGER DEFAULT 0,
  total_answered INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, mission_date)
);

CREATE TABLE IF NOT EXISTS mission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_mission_id UUID NOT NULL REFERENCES user_missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  payload JSONB,
  question_id UUID,
  is_correct BOOLEAN,
  time_spent_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_question_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL,
  shown_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  context VARCHAR(50),
  was_correct BOOLEAN,
  UNIQUE(user_id, question_id, context, shown_at)
);

-- Indexes for missions
CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_missions_skill ON missions(target_skill);
CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(mission_type);

-- Indexes for user_missions
CREATE INDEX IF NOT EXISTS idx_user_missions_user_id ON user_missions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_missions_date ON user_missions(mission_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_missions_status ON user_missions(status);
CREATE INDEX IF NOT EXISTS idx_user_missions_user_date ON user_missions(user_id, mission_date);

-- Indexes for mission_logs
CREATE INDEX IF NOT EXISTS idx_mission_logs_user_mission ON mission_logs(user_mission_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_user_id ON mission_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mission_logs_event_type ON mission_logs(event_type);

-- Indexes for user_question_history
CREATE INDEX IF NOT EXISTS idx_user_question_history_user ON user_question_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_history_shown_at ON user_question_history(shown_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_question_history_question ON user_question_history(question_id);

-- ============================================
-- MIGRATION 03: ERROR BOOK & USER ANSWERS
-- ============================================

CREATE TABLE IF NOT EXISTS error_book (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active',
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES pack_questions(id) ON DELETE CASCADE,
  is_correct BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_error_book_user_id ON error_book(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_recent ON user_answers(user_id, created_at, question_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pack_installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_question_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_book ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- BASIC RLS POLICIES
-- ============================================

-- Packs: Public can view published packs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'packs' AND policyname = 'Public can view published packs') THEN
    CREATE POLICY "Public can view published packs"
      ON packs FOR SELECT
      USING (status = 'published' OR auth.uid() = created_by);
  END IF;
END $$;

-- User missions: Users can only see their own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_missions' AND policyname = 'Users can view own missions') THEN
    CREATE POLICY "Users can view own missions"
      ON user_missions FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_missions' AND policyname = 'Users can insert own missions') THEN
    CREATE POLICY "Users can insert own missions"
      ON user_missions FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'analytics_events',
      'packs',
      'pack_questions',
      'missions',
      'user_missions',
      'error_book',
      'user_answers'
    );

  RAISE NOTICE '✅ 成功創建 % 個表', table_count;

  IF table_count >= 7 THEN
    RAISE NOTICE '✅ 所有核心表已創建！';
  ELSE
    RAISE WARNING '⚠️  只創建了 % 個表，請檢查錯誤', table_count;
  END IF;
END $$;

-- 顯示創建的表
SELECT
  table_name,
  '✅' as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'analytics_events',
    'packs',
    'pack_chapters',
    'pack_questions',
    'user_pack_installations',
    'missions',
    'user_missions',
    'mission_logs',
    'user_question_history',
    'error_book',
    'user_answers'
  )
ORDER BY table_name;
