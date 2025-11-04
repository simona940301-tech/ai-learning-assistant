-- =============================================
-- Module 2: Shop (題包系統) - Database Schema
-- =============================================

-- Drop existing tables if they exist (for development)
DROP TABLE IF EXISTS user_pack_installations CASCADE;
DROP TABLE IF EXISTS pack_questions CASCADE;
DROP TABLE IF EXISTS pack_chapters CASCADE;
DROP TABLE IF EXISTS packs CASCADE;

-- =============================================
-- Table: packs
-- Stores question pack metadata
-- =============================================
CREATE TABLE packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title VARCHAR(100) NOT NULL,
  description TEXT,

  -- Classification
  subject VARCHAR(50) NOT NULL,
  topic VARCHAR(100) NOT NULL,
  skill VARCHAR(100) NOT NULL,
  grade VARCHAR(20) NOT NULL, -- 國小/國中/高中

  -- Content metadata
  item_count INTEGER NOT NULL DEFAULT 0,
  has_explanation BOOLEAN NOT NULL DEFAULT FALSE,
  explanation_rate DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (explanation_rate >= 0 AND explanation_rate <= 1),

  -- AI metadata
  avg_confidence DECIMAL(3,2) NOT NULL DEFAULT 0.0 CHECK (avg_confidence >= 0 AND avg_confidence <= 1),

  -- Status & visibility
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'expired')),
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  -- Stats
  install_count INTEGER NOT NULL DEFAULT 0,
  completion_rate DECIMAL(3,2) DEFAULT 0.0 CHECK (completion_rate >= 0 AND completion_rate <= 1),

  -- QR & aliases
  qr_alias VARCHAR(50) UNIQUE,

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_packs_status ON packs(status);
CREATE INDEX idx_packs_subject_topic ON packs(subject, topic);
CREATE INDEX idx_packs_skill ON packs(skill);
CREATE INDEX idx_packs_grade ON packs(grade);
CREATE INDEX idx_packs_published_at ON packs(published_at DESC);
CREATE INDEX idx_packs_install_count ON packs(install_count DESC);
CREATE INDEX idx_packs_avg_confidence ON packs(avg_confidence DESC);
CREATE INDEX idx_packs_qr_alias ON packs(qr_alias);

-- Full-text search on title and description
CREATE INDEX idx_packs_title_search ON packs USING gin(to_tsvector('simple', title));
CREATE INDEX idx_packs_description_search ON packs USING gin(to_tsvector('simple', COALESCE(description, '')));

-- =============================================
-- Table: pack_chapters
-- Optional hierarchical structure for packs
-- =============================================
CREATE TABLE pack_chapters (
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

CREATE INDEX idx_pack_chapters_pack_id ON pack_chapters(pack_id);
CREATE INDEX idx_pack_chapters_order ON pack_chapters(pack_id, "order");

-- =============================================
-- Table: pack_questions
-- Maps questions to packs (and optionally chapters)
-- =============================================
CREATE TABLE pack_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES pack_chapters(id) ON DELETE CASCADE,

  -- Question content (denormalized for preview performance)
  stem TEXT NOT NULL,
  choices TEXT[] NOT NULL,
  answer VARCHAR(10) NOT NULL,
  explanation TEXT,
  difficulty VARCHAR(20) CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),

  has_explanation BOOLEAN NOT NULL DEFAULT FALSE,
  confidence DECIMAL(3,2) DEFAULT 0.0,

  -- Order within chapter/pack
  "order" INTEGER NOT NULL DEFAULT 0,

  -- Reference to main questions table (if exists)
  question_id UUID, -- Reference to questions table

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pack_questions_pack_id ON pack_questions(pack_id);
CREATE INDEX idx_pack_questions_chapter_id ON pack_questions(chapter_id);
CREATE INDEX idx_pack_questions_order ON pack_questions(pack_id, "order");

-- =============================================
-- Table: user_pack_installations
-- Tracks which users have installed which packs
-- =============================================
CREATE TABLE user_pack_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES packs(id) ON DELETE CASCADE,

  -- Installation metadata
  installed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'shop' CHECK (source IN ('shop', 'qr', 'rs_suggest', 'direct')),
  list_position INTEGER, -- Position in search results when installed

  -- Progress tracking (for future use)
  completed_count INTEGER DEFAULT 0,
  last_practiced_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id, pack_id)
);

CREATE INDEX idx_user_pack_installations_user_id ON user_pack_installations(user_id);
CREATE INDEX idx_user_pack_installations_pack_id ON user_pack_installations(pack_id);
CREATE INDEX idx_user_pack_installations_installed_at ON user_pack_installations(installed_at DESC);

-- =============================================
-- Row Level Security (RLS)
-- =============================================

ALTER TABLE packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pack_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_pack_installations ENABLE ROW LEVEL SECURITY;

-- Packs: Public can view published packs, only admins can modify
CREATE POLICY "Public can view published packs"
  ON packs FOR SELECT
  USING (status = 'published' OR auth.uid() = created_by);

CREATE POLICY "Admins can insert packs"
  ON packs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can update packs"
  ON packs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Admins can delete packs"
  ON packs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- Pack chapters: Follow pack visibility
CREATE POLICY "Public can view chapters of published packs"
  ON pack_chapters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_chapters.pack_id AND packs.status = 'published'
    )
  );

-- Pack questions: Follow pack visibility
CREATE POLICY "Public can view questions of published packs"
  ON pack_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM packs
      WHERE packs.id = pack_questions.pack_id AND packs.status = 'published'
    )
  );

-- User installations: Users can only see/modify their own
CREATE POLICY "Users can view own installations"
  ON user_pack_installations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own installations"
  ON user_pack_installations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own installations"
  ON user_pack_installations FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================
-- Helper Functions
-- =============================================

-- Increment pack install count
CREATE OR REPLACE FUNCTION increment_pack_install_count(pack_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE packs
  SET install_count = install_count + 1,
      updated_at = NOW()
  WHERE id = pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement pack install count
CREATE OR REPLACE FUNCTION decrement_pack_install_count(pack_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE packs
  SET install_count = GREATEST(install_count - 1, 0),
      updated_at = NOW()
  WHERE id = pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update pack metadata (item count, explanation rate, avg confidence)
CREATE OR REPLACE FUNCTION update_pack_metadata(pack_id UUID)
RETURNS VOID AS $$
DECLARE
  v_item_count INTEGER;
  v_explanation_count INTEGER;
  v_avg_confidence DECIMAL(3,2);
BEGIN
  -- Count total items
  SELECT COUNT(*) INTO v_item_count
  FROM pack_questions
  WHERE pack_questions.pack_id = update_pack_metadata.pack_id;

  -- Count items with explanations
  SELECT COUNT(*) INTO v_explanation_count
  FROM pack_questions
  WHERE pack_questions.pack_id = update_pack_metadata.pack_id
    AND has_explanation = TRUE;

  -- Calculate average confidence
  SELECT COALESCE(AVG(confidence), 0) INTO v_avg_confidence
  FROM pack_questions
  WHERE pack_questions.pack_id = update_pack_metadata.pack_id;

  -- Update pack
  UPDATE packs
  SET item_count = v_item_count,
      has_explanation = (v_item_count > 0 AND v_explanation_count = v_item_count),
      explanation_rate = CASE WHEN v_item_count > 0 THEN v_explanation_count::DECIMAL / v_item_count ELSE 0 END,
      avg_confidence = v_avg_confidence,
      updated_at = NOW()
  WHERE id = update_pack_metadata.pack_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update chapter item counts
CREATE OR REPLACE FUNCTION update_chapter_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE pack_chapters
    SET item_count = (
      SELECT COUNT(*) FROM pack_questions
      WHERE chapter_id = NEW.chapter_id
    ),
    updated_at = NOW()
    WHERE id = NEW.chapter_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE pack_chapters
    SET item_count = (
      SELECT COUNT(*) FROM pack_questions
      WHERE chapter_id = OLD.chapter_id
    ),
    updated_at = NOW()
    WHERE id = OLD.chapter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chapter_item_count
AFTER INSERT OR UPDATE OR DELETE ON pack_questions
FOR EACH ROW
EXECUTE FUNCTION update_chapter_item_count();

-- =============================================
-- Sample Data (for testing)
-- =============================================

-- Insert sample packs
INSERT INTO packs (
  id,
  title,
  description,
  subject,
  topic,
  skill,
  grade,
  item_count,
  has_explanation,
  explanation_rate,
  avg_confidence,
  status,
  published_at,
  install_count,
  qr_alias
) VALUES
(
  'pack-math-001',
  '國中數學：一元一次方程式精選',
  '涵蓋一元一次方程式的基礎題型，適合國中七年級學生',
  '數學',
  '代數',
  '一元一次方程式',
  '國中',
  25,
  true,
  1.0,
  0.92,
  'published',
  NOW(),
  0,
  'math-linear-eq-001'
),
(
  'pack-eng-001',
  '高中英文：不定詞與動名詞',
  '精選高中英文文法題目，專注於不定詞和動名詞的用法',
  '英文',
  '文法',
  '不定詞與動名詞',
  '高中',
  30,
  true,
  0.95,
  0.88,
  'published',
  NOW(),
  0,
  'eng-infinitive-001'
),
(
  'pack-phy-001',
  '國中理化：力學基礎',
  '包含力、功、能量等基本概念',
  '理化',
  '力學',
  '力與運動',
  '國中',
  22,
  false,
  0.65,
  0.75,
  'published',
  NOW(),
  0,
  'phy-mechanics-001'
);

COMMENT ON TABLE packs IS 'Module 2: Question packs (題包) for shop system';
COMMENT ON TABLE pack_chapters IS 'Optional hierarchical structure for packs';
COMMENT ON TABLE pack_questions IS 'Questions within packs (denormalized for performance)';
COMMENT ON TABLE user_pack_installations IS 'Tracks user pack installations with analytics metadata';
