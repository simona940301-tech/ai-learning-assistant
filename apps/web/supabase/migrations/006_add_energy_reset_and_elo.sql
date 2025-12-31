-- ============================================
-- Migration: Add daily_energy_reset_at and elo_rank to profiles
-- ============================================
-- These columns are required by the Play system but were missing

-- Add daily_energy_reset_at column for lazy energy reset
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_energy_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 day');

-- Add elo_rank column for matchmaking and ranking
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS elo_rank INTEGER DEFAULT 1000 CHECK (elo_rank >= 0 AND elo_rank <= 3000);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_energy_reset ON profiles(daily_energy_reset_at);
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rank ON profiles(elo_rank DESC);

-- Update existing profiles to have default values
UPDATE profiles
SET
  daily_energy_reset_at = COALESCE(daily_energy_reset_at, NOW() + INTERVAL '1 day'),
  elo_rank = COALESCE(elo_rank, 1000)
WHERE daily_energy_reset_at IS NULL OR elo_rank IS NULL;

-- Comment on columns
COMMENT ON COLUMN profiles.daily_energy_reset_at IS 'UTC timestamp when daily energy will reset (lazy evaluation)';
COMMENT ON COLUMN profiles.elo_rank IS 'User Elo rating for matchmaking (1000 = default, 0-3000 range)';
