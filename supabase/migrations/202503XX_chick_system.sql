-- Chick system schema
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS chick_iq SMALLINT DEFAULT 5,
  ADD COLUMN IF NOT EXISTS chick_iq_last_decay_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS chick_explanations_used SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chick_explanations_reset_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS chick_fatigue SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chick_fatigue_battle_counter SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chick_soothe_used SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS chick_soothe_reset_at TIMESTAMPTZ,

  ADD COLUMN IF NOT EXISTS chick_emotion_state TEXT DEFAULT 'normal'
    CHECK (chick_emotion_state IN ('normal','cold','distant','hibernate')),
  ADD COLUMN IF NOT EXISTS chick_emotion_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.chick_iq IS '0-10 intelligence meter for pet';
COMMENT ON COLUMN profiles.chick_fatigue IS '0-3 fatigue layers';
COMMENT ON COLUMN profiles.chick_emotion_state IS 'normal|cold|distant|hibernate';

CREATE TABLE IF NOT EXISTS chick_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('S1','S2','S3','POSITIVE')),
  text TEXT NOT NULL,
  state_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_chick_messages_user_created_at
  ON chick_messages (user_id, created_at DESC);

ALTER TABLE chick_messages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chick_messages'
      AND policyname = 'Users can view own chick messages'
  ) THEN
    CREATE POLICY "Users can view own chick messages"
      ON chick_messages FOR SELECT
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chick_messages'
      AND policyname = 'Users can insert own chick messages'
  ) THEN
    CREATE POLICY "Users can insert own chick messages"
      ON chick_messages FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'chick_messages'
      AND policyname = 'Users can update own chick messages'
  ) THEN
    CREATE POLICY "Users can update own chick messages"
      ON chick_messages FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Optional: DELETE policy if needed for pruning via service role
