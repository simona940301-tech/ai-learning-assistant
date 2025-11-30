-- ============================================
-- Avatar System V2 Migration
-- ============================================
-- Date: 2025-01-21
-- Purpose: Add support for preset avatars and tier system
-- ============================================

BEGIN;

-- Add avatar system columns to profiles table
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar_preset VARCHAR(50),
  ADD COLUMN IF NOT EXISTS avatar_tier INTEGER DEFAULT 1 CHECK (avatar_tier BETWEEN 1 AND 3),
  ADD COLUMN IF NOT EXISTS avatar_generated_at TIMESTAMPTZ;

-- Create index for faster avatar queries
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_preset ON profiles(avatar_preset);
CREATE INDEX IF NOT EXISTS idx_profiles_avatar_tier ON profiles(avatar_tier);

-- Add comment for documentation
COMMENT ON COLUMN profiles.avatar_preset IS 'Avatar preset ID (e.g., student-01, hero-02)';
COMMENT ON COLUMN profiles.avatar_tier IS 'Avatar tier: 1=Preset, 2=Photo Upload, 3=AI Enhanced';
COMMENT ON COLUMN profiles.avatar_generated_at IS 'Timestamp when AI avatar was generated';

-- Update onboarding_sessions table to track avatar selection
ALTER TABLE onboarding_sessions
  ADD COLUMN IF NOT EXISTS avatar_selected BOOLEAN DEFAULT FALSE;

-- Create avatar history table for tracking changes
CREATE TABLE IF NOT EXISTS avatar_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  avatar_preset VARCHAR(50),
  avatar_url TEXT,
  avatar_tier INTEGER NOT NULL CHECK (avatar_tier BETWEEN 1 AND 3),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for avatar history
CREATE INDEX IF NOT EXISTS idx_avatar_history_user ON avatar_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_avatar_history_tier ON avatar_history(avatar_tier);

-- Add RLS policies for avatar_history
ALTER TABLE avatar_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own avatar history
CREATE POLICY "Users can view own avatar history"
  ON avatar_history FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own avatar history
CREATE POLICY "Users can insert own avatar history"
  ON avatar_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to automatically log avatar changes
CREATE OR REPLACE FUNCTION log_avatar_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if avatar actually changed
  IF (NEW.avatar_preset IS DISTINCT FROM OLD.avatar_preset)
     OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
     OR (NEW.avatar_tier IS DISTINCT FROM OLD.avatar_tier) THEN

    INSERT INTO avatar_history (user_id, avatar_preset, avatar_url, avatar_tier)
    VALUES (NEW.id, NEW.avatar_preset, NEW.avatar_url, NEW.avatar_tier);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for avatar changes
DROP TRIGGER IF EXISTS on_avatar_updated ON profiles;
CREATE TRIGGER on_avatar_updated
  AFTER UPDATE ON profiles
  FOR EACH ROW
  WHEN (
    (NEW.avatar_preset IS DISTINCT FROM OLD.avatar_preset)
    OR (NEW.avatar_url IS DISTINCT FROM OLD.avatar_url)
    OR (NEW.avatar_tier IS DISTINCT FROM OLD.avatar_tier)
  )
  EXECUTE FUNCTION log_avatar_change();

-- Set default preset for existing users without avatars
UPDATE profiles
SET avatar_preset = 'student-01',
    avatar_tier = 1
WHERE avatar_preset IS NULL
  AND avatar_url IS NULL;

COMMIT;

-- ============================================
-- Verification Queries (Run these to verify)
-- ============================================

-- Check that columns were added
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'profiles'
--   AND column_name IN ('avatar_preset', 'avatar_tier', 'avatar_generated_at');

-- Check avatar_history table
-- SELECT * FROM avatar_history LIMIT 5;

-- Check profiles with avatar presets
-- SELECT id, email, avatar_preset, avatar_tier, avatar_url
-- FROM profiles
-- WHERE avatar_preset IS NOT NULL
-- LIMIT 10;
