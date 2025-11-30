-- ============================================
-- Question Sets System (題本商店系統)
-- Phase 2 Implementation
-- ============================================

-- 1. question_sets 表（題本集合）
CREATE TABLE IF NOT EXISTS question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 基本資訊
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,

  -- 創建者資訊
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  creator_type TEXT NOT NULL DEFAULT 'OFFICIAL'
    CHECK (creator_type IN ('OFFICIAL', 'TEACHER', 'COMMUNITY', 'RAG')),

  -- 題本來源
  source_type TEXT NOT NULL DEFAULT 'MANUAL'
    CHECK (source_type IN ('MANUAL', 'SEED_QUESTIONS', 'UGC', 'RAG')),
  source_metadata JSONB DEFAULT '{}'::jsonb,

  -- 題目配置
  question_ids UUID[] NOT NULL,
  question_source TEXT NOT NULL DEFAULT 'seed_questions'
    CHECK (question_source IN ('seed_questions', 'pack_questions', 'ugc_questions')),
  total_questions INTEGER GENERATED ALWAYS AS (array_length(question_ids, 1)) STORED,

  -- 分類標籤
  subject TEXT CHECK (subject IN ('chinese', 'english', 'math', 'science', 'social', 'mixed')),
  difficulty_level INTEGER CHECK (difficulty_level >= 1 AND difficulty_level <= 5),
  tags TEXT[] DEFAULT '{}',

  -- 商店配置
  is_public BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  price INTEGER DEFAULT 0 CHECK (price >= 0),

  -- 統計數據
  downloads INTEGER DEFAULT 0 CHECK (downloads >= 0),
  rating DECIMAL(3, 2) DEFAULT 0.00 CHECK (rating >= 0.00 AND rating <= 5.00),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED', 'DELETED'))
);

-- 索引優化
CREATE INDEX IF NOT EXISTS idx_question_sets_creator ON question_sets(creator_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_subject ON question_sets(subject);
CREATE INDEX IF NOT EXISTS idx_question_sets_public ON question_sets(is_public) WHERE is_public = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_sets_featured ON question_sets(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_question_sets_tags ON question_sets USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_question_sets_downloads ON question_sets(downloads DESC);
CREATE INDEX IF NOT EXISTS idx_question_sets_rating ON question_sets(rating DESC);
CREATE INDEX IF NOT EXISTS idx_question_sets_status ON question_sets(status);
CREATE INDEX IF NOT EXISTS idx_question_sets_search ON question_sets
  USING GIN(to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, '')));

-- ============================================
-- 2. user_question_sets 表（用戶已下載題本）
-- ============================================

CREATE TABLE IF NOT EXISTS user_question_sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,

  -- 下載資訊
  downloaded_at TIMESTAMPTZ DEFAULT NOW(),
  last_practiced_at TIMESTAMPTZ,

  -- 學習進度
  progress_data JSONB DEFAULT '{}'::jsonb,  -- { "completed": 10, "total": 50, "correct_rate": 0.8 }
  practice_count INTEGER DEFAULT 0 CHECK (practice_count >= 0),

  -- 個人化設定
  is_favorite BOOLEAN DEFAULT false,
  custom_tags TEXT[] DEFAULT '{}',
  notes TEXT,

  -- 唯一約束：每個用戶只能下載一次同一題本
  UNIQUE(user_id, set_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_user_question_sets_user ON user_question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_question_sets_set ON user_question_sets(set_id);
CREATE INDEX IF NOT EXISTS idx_user_question_sets_favorite ON user_question_sets(user_id, is_favorite)
  WHERE is_favorite = TRUE;
CREATE INDEX IF NOT EXISTS idx_user_question_sets_last_practiced ON user_question_sets(last_practiced_at DESC);

-- ============================================
-- 3. question_set_reviews 表（評論系統）
-- ============================================

CREATE TABLE IF NOT EXISTS question_set_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  set_id UUID NOT NULL REFERENCES question_sets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(set_id, user_id)  -- 每個用戶只能評論一次
);

CREATE INDEX IF NOT EXISTS idx_reviews_set ON question_set_reviews(set_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON question_set_reviews(user_id);

-- ============================================
-- 4. Row Level Security (RLS)
-- ============================================

-- question_sets RLS
ALTER TABLE question_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_sets'
    AND policyname = 'Public question sets are viewable by everyone'
  ) THEN
    CREATE POLICY "Public question sets are viewable by everyone"
      ON question_sets FOR SELECT
      USING (is_public = TRUE AND status = 'PUBLISHED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_sets'
    AND policyname = 'Users can view own question sets'
  ) THEN
    CREATE POLICY "Users can view own question sets"
      ON question_sets FOR SELECT
      USING (auth.uid() = creator_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_sets'
    AND policyname = 'Teachers can create question sets'
  ) THEN
    CREATE POLICY "Teachers can create question sets"
      ON question_sets FOR INSERT
      WITH CHECK (
        auth.uid() = creator_id
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND (role = 'teacher' OR role = 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_sets'
    AND policyname = 'Users can update own question sets'
  ) THEN
    CREATE POLICY "Users can update own question sets"
      ON question_sets FOR UPDATE
      USING (auth.uid() = creator_id);
  END IF;
END $$;

-- user_question_sets RLS
ALTER TABLE user_question_sets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_question_sets'
    AND policyname = 'Users can view own downloads'
  ) THEN
    CREATE POLICY "Users can view own downloads"
      ON user_question_sets FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_question_sets'
    AND policyname = 'Users can download question sets'
  ) THEN
    CREATE POLICY "Users can download question sets"
      ON user_question_sets FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'user_question_sets'
    AND policyname = 'Users can update own downloads'
  ) THEN
    CREATE POLICY "Users can update own downloads"
      ON user_question_sets FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- question_set_reviews RLS
ALTER TABLE question_set_reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_set_reviews'
    AND policyname = 'Reviews are viewable by everyone'
  ) THEN
    CREATE POLICY "Reviews are viewable by everyone"
      ON question_set_reviews FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_set_reviews'
    AND policyname = 'Users can create own reviews'
  ) THEN
    CREATE POLICY "Users can create own reviews"
      ON question_set_reviews FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'question_set_reviews'
    AND policyname = 'Users can update own reviews'
  ) THEN
    CREATE POLICY "Users can update own reviews"
      ON question_set_reviews FOR UPDATE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================
-- 5. Triggers（自動更新時間戳）
-- ============================================

DROP TRIGGER IF EXISTS update_question_sets_updated_at ON question_sets;
CREATE TRIGGER update_question_sets_updated_at
  BEFORE UPDATE ON question_sets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_question_set_reviews_updated_at ON question_set_reviews;
CREATE TRIGGER update_question_set_reviews_updated_at
  BEFORE UPDATE ON question_set_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 6. Functions（輔助函數）
-- ============================================

-- 更新題本下載數
CREATE OR REPLACE FUNCTION increment_question_set_downloads(p_set_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE question_sets
  SET downloads = downloads + 1
  WHERE id = p_set_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 更新題本評分
CREATE OR REPLACE FUNCTION update_question_set_rating(p_set_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE question_sets
  SET
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM question_set_reviews
      WHERE set_id = p_set_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM question_set_reviews
      WHERE set_id = p_set_id
    )
  WHERE id = p_set_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. 種子數據（範例題本）
-- ============================================

-- 創建範例題本（僅在開發環境）
-- 注意：實際部署時需要有真實的題目數據

-- INSERT INTO question_sets (
--   title,
--   description,
--   creator_type,
--   source_type,
--   question_ids,
--   question_source,
--   subject,
--   difficulty_level,
--   tags,
--   is_public,
--   is_featured,
--   status
-- ) VALUES
-- (
--   '112 學測數學完整題本',
--   '包含 112 年學測數學所有題目，涵蓋代數、幾何、統計等主題',
--   'OFFICIAL',
--   'SEED_QUESTIONS',
--   ARRAY[]::UUID[],  -- 需要從 seed_questions 填入實際 ID
--   'seed_questions',
--   'math',
--   4,
--   ARRAY['學測', '數學', '官方', '112年度'],
--   true,
--   true,
--   'PUBLISHED'
-- );

COMMENT ON TABLE question_sets IS '題本集合表，儲存完整的題目集合';
COMMENT ON TABLE user_question_sets IS '用戶已下載的題本';
COMMENT ON TABLE question_set_reviews IS '題本評論與評分';
