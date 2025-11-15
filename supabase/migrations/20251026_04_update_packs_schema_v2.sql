-- =============================================
-- Module 2: Shop (題包系統) - Schema Update V2
-- Adds: source, visibility, class_challenges
-- =============================================

-- =============================================
-- 1. Extend packs table with source and visibility
-- =============================================

-- Add source column (publisher, school, internal)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packs' AND column_name = 'source'
  ) THEN
    ALTER TABLE packs ADD COLUMN source VARCHAR(20) DEFAULT 'internal'
      CHECK (source IN ('publisher', 'school', 'internal'));
  END IF;
END $$;

-- Add visibility column (public, limited, hidden)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packs' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE packs ADD COLUMN visibility VARCHAR(20) DEFAULT 'public'
      CHECK (visibility IN ('public', 'limited', 'hidden'));
  END IF;
END $$;

-- Add source metadata (for publisher/school attribution)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packs' AND column_name = 'source_name'
  ) THEN
    ALTER TABLE packs ADD COLUMN source_name VARCHAR(100);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packs' AND column_name = 'source_id'
  ) THEN
    ALTER TABLE packs ADD COLUMN source_id VARCHAR(50);
  END IF;
END $$;

-- Create indexes for new filters
CREATE INDEX IF NOT EXISTS idx_packs_source ON packs(source);
CREATE INDEX IF NOT EXISTS idx_packs_visibility ON packs(visibility);
CREATE INDEX IF NOT EXISTS idx_packs_source_name ON packs(source_name);

-- Update sample data with source and visibility
UPDATE packs
SET source = 'internal',
    visibility = 'public',
    source_name = 'PLMS 內部團隊'
WHERE id = 'pack-math-001';

UPDATE packs
SET source = 'publisher',
    visibility = 'public',
    source_name = '康軒出版社',
    source_id = 'publisher-knsh'
WHERE id = 'pack-eng-001';

UPDATE packs
SET source = 'school',
    visibility = 'public',
    source_name = '建國中學',
    source_id = 'school-cksh'
WHERE id = 'pack-phy-001';

-- =============================================
-- 2. Add validation rules enforcement
-- =============================================

-- Ensure all packs have has_explanation = true by default
ALTER TABLE packs
  ALTER COLUMN has_explanation SET DEFAULT TRUE;

-- Add constraint to ensure published packs meet requirements
CREATE OR REPLACE FUNCTION validate_pack_before_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'published' THEN
    -- Must have explanation
    IF NEW.has_explanation = FALSE THEN
      RAISE EXCEPTION 'Cannot publish pack without explanations (has_explanation must be true)';
    END IF;

    -- Must have at least 20 items
    IF NEW.item_count < 20 THEN
      RAISE EXCEPTION 'Cannot publish pack with less than 20 items (current: %)', NEW.item_count;
    END IF;

    -- Must have required tags
    IF NEW.topic IS NULL OR NEW.skill IS NULL OR NEW.grade IS NULL THEN
      RAISE EXCEPTION 'Cannot publish pack without required tags (topic, skill, grade)';
    END IF;

    -- Must have confidence score
    IF NEW.avg_confidence IS NULL OR NEW.avg_confidence < 0 THEN
      RAISE EXCEPTION 'Cannot publish pack without valid AI confidence score';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_pack_before_publish ON packs;
CREATE TRIGGER trigger_validate_pack_before_publish
  BEFORE INSERT OR UPDATE ON packs
  FOR EACH ROW
  EXECUTE FUNCTION validate_pack_before_publish();

-- =============================================
-- 3. Update RLS policies for visibility
-- =============================================

-- Drop old policy
DROP POLICY IF EXISTS "Public can view published packs" ON packs;

-- Create new policy with visibility check
CREATE POLICY "Public can view visible published packs"
  ON packs FOR SELECT
  USING (
    (status = 'published' AND visibility = 'public')
    OR auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

-- =============================================
-- 4. Create class_challenges schema
-- =============================================

-- Drop if exists (for development)
DROP TABLE IF EXISTS class_challenge_participants CASCADE;
DROP TABLE IF EXISTS class_challenges CASCADE;

-- Main challenges table
CREATE TABLE class_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title VARCHAR(100) NOT NULL,
  description TEXT,

  -- Pack reference
  pack_id UUID REFERENCES packs(id) ON DELETE CASCADE,

  -- Challenge settings
  num_questions INTEGER NOT NULL CHECK (num_questions > 0),
  question_types TEXT[], -- Array of question types (varies by subject)

  -- Timing
  deadline TIMESTAMPTZ,
  duration_minutes INTEGER, -- Optional time limit per attempt

  -- Display settings
  leaderboard_visible BOOLEAN DEFAULT TRUE,
  show_correct_answers BOOLEAN DEFAULT FALSE, -- After submission
  allow_retry BOOLEAN DEFAULT FALSE,

  -- Visibility
  visibility VARCHAR(20) DEFAULT 'class' CHECK (visibility IN ('class', 'school', 'public')),
  target_class_id VARCHAR(50), -- Reference to class/group
  target_grade VARCHAR(20),

  -- Creator
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'archived'))
);

-- Participants tracking
CREATE TABLE class_challenge_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES class_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Participation status
  status VARCHAR(20) DEFAULT 'invited' CHECK (status IN ('invited', 'started', 'submitted', 'late_submitted')),

  -- Results
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  total_count INTEGER DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,

  -- Ranking
  rank INTEGER, -- Position in leaderboard

  -- Timestamps
  started_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(challenge_id, user_id)
);

-- Indexes
CREATE INDEX idx_class_challenges_pack_id ON class_challenges(pack_id);
CREATE INDEX idx_class_challenges_status ON class_challenges(status);
CREATE INDEX idx_class_challenges_deadline ON class_challenges(deadline);
CREATE INDEX idx_class_challenges_created_by ON class_challenges(created_by);
CREATE INDEX idx_class_challenges_target_class ON class_challenges(target_class_id);

CREATE INDEX idx_challenge_participants_challenge_id ON class_challenge_participants(challenge_id);
CREATE INDEX idx_challenge_participants_user_id ON class_challenge_participants(user_id);
CREATE INDEX idx_challenge_participants_rank ON class_challenge_participants(challenge_id, rank);
CREATE INDEX idx_challenge_participants_score ON class_challenge_participants(challenge_id, score DESC);

-- RLS for class_challenges
ALTER TABLE class_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenges they can access"
  ON class_challenges FOR SELECT
  USING (
    status = 'active'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Teachers can create challenges"
  ON class_challenges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'teacher')
    )
  );

CREATE POLICY "Creators can update own challenges"
  ON class_challenges FOR UPDATE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS for participants
ALTER TABLE class_challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own participation"
  ON class_challenge_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_challenges
      WHERE class_challenges.id = class_challenge_participants.challenge_id
        AND class_challenges.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update own participation"
  ON class_challenge_participants FOR UPDATE
  USING (user_id = auth.uid());

-- =============================================
-- 5. Helper Functions for Challenges
-- =============================================

-- Calculate and update leaderboard ranks
CREATE OR REPLACE FUNCTION update_challenge_leaderboard(p_challenge_id UUID)
RETURNS VOID AS $$
BEGIN
  WITH ranked_participants AS (
    SELECT
      id,
      ROW_NUMBER() OVER (
        ORDER BY
          score DESC,
          time_spent_seconds ASC,
          submitted_at ASC
      ) as new_rank
    FROM class_challenge_participants
    WHERE challenge_id = p_challenge_id
      AND status IN ('submitted', 'late_submitted')
  )
  UPDATE class_challenge_participants p
  SET rank = rp.new_rank,
      updated_at = NOW()
  FROM ranked_participants rp
  WHERE p.id = rp.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-update leaderboard on submission
CREATE OR REPLACE FUNCTION trigger_update_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('submitted', 'late_submitted') AND OLD.status != NEW.status THEN
    PERFORM update_challenge_leaderboard(NEW.challenge_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_participant_submission
  AFTER UPDATE ON class_challenge_participants
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_leaderboard();

-- =============================================
-- 6. Sample Challenge Data
-- =============================================

-- Insert sample challenge
INSERT INTO class_challenges (
  id,
  title,
  description,
  pack_id,
  num_questions,
  question_types,
  deadline,
  duration_minutes,
  leaderboard_visible,
  show_correct_answers,
  created_by,
  status,
  visibility,
  target_grade
) VALUES (
  'challenge-001',
  '國中數學週挑戰：一元一次方程式',
  '本週挑戰題組，完成前 5 名可獲得獎勵！',
  'pack-math-001',
  15,
  ARRAY['選擇題', '計算題'],
  NOW() + INTERVAL '7 days',
  30,
  TRUE,
  TRUE,
  (SELECT id FROM users WHERE role = 'teacher' LIMIT 1),
  'active',
  'class',
  '國中'
) ON CONFLICT (id) DO NOTHING;

-- =============================================
-- Comments
-- =============================================

COMMENT ON COLUMN packs.source IS 'Pack source type: publisher (出版商), school (學校), internal (內部)';
COMMENT ON COLUMN packs.visibility IS 'Pack visibility: public (公開), limited (受限), hidden (隱藏)';
COMMENT ON COLUMN packs.source_name IS 'Human-readable source name (e.g., 康軒出版社, 建國中學)';
COMMENT ON COLUMN packs.source_id IS 'Machine-readable source identifier';

COMMENT ON TABLE class_challenges IS 'Module 2 Extension: Class challenges for student engagement';
COMMENT ON TABLE class_challenge_participants IS 'Tracks student participation in class challenges';
