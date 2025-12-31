-- Migration: Add coins field to profiles table
-- Date: 2025-11-14
-- Purpose: Add coins (wallet_balance) column for battle rewards

-- Add coins column (default 0)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL;

-- Create index on coins for leaderboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins);

-- Comment
COMMENT ON COLUMN profiles.coins IS 'User wallet balance (coins for rewards)';
