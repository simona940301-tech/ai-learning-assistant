-- Migration: Add battle-related fields to profiles table
-- Date: 2025-01-27
-- Purpose: Add elo_rank, daily_energy, daily_energy_reset_at for battle system

-- Add elo_rank column (default 1000, standard Elo starting point)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS elo_rank INTEGER DEFAULT 1000 NOT NULL;

-- Add daily_energy column (default 8, max daily battles)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_energy INTEGER DEFAULT 8 NOT NULL;

-- Add daily_energy_reset_at column (UTC+8 04:00 reset time)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_energy_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (
  -- Set to next UTC+8 04:00 (UTC 20:00 previous day)
  (CURRENT_DATE AT TIME ZONE 'Asia/Taipei' + INTERVAL '1 day' + INTERVAL '4 hours') AT TIME ZONE 'UTC'
) NOT NULL;

-- Create index on elo_rank for matchmaking queries
CREATE INDEX IF NOT EXISTS idx_profiles_elo_rank ON profiles(elo_rank);

-- Create index on daily_energy_reset_at for reset queries
CREATE INDEX IF NOT EXISTS idx_profiles_daily_energy_reset_at ON profiles(daily_energy_reset_at);

-- Function: Reset daily energy if reset time has passed (called by API)
-- Note: Lazy-reset is handled in API layer, not via trigger
-- This function is available for manual reset if needed
CREATE OR REPLACE FUNCTION reset_daily_energy_if_needed(p_user_id UUID)
RETURNS TABLE(daily_energy INTEGER, daily_energy_reset_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
  reset_time_utc TIMESTAMP WITH TIME ZONE;
  now_utc TIMESTAMP WITH TIME ZONE;
  next_reset TIMESTAMP WITH TIME ZONE;
BEGIN
  now_utc := NOW() AT TIME ZONE 'UTC';
  
  -- Get current reset time
  SELECT daily_energy_reset_at INTO reset_time_utc
  FROM profiles
  WHERE id = p_user_id;
  
  -- If reset time has passed, reset energy
  IF now_utc >= reset_time_utc THEN
    -- Calculate next reset time (UTC+8 04:00 tomorrow)
    next_reset := (
      (CURRENT_DATE AT TIME ZONE 'Asia/Taipei' + INTERVAL '1 day' + INTERVAL '4 hours') AT TIME ZONE 'UTC'
    );
    
    -- Update profile
    UPDATE profiles
    SET daily_energy = 8,
        daily_energy_reset_at = next_reset
    WHERE id = p_user_id;
    
    RETURN QUERY SELECT 8, next_reset;
  ELSE
    -- Return current values
    RETURN QUERY
    SELECT daily_energy, daily_energy_reset_at
    FROM profiles
    WHERE id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON COLUMN profiles.elo_rank IS 'Player Elo ranking (default 1000)';
COMMENT ON COLUMN profiles.daily_energy IS 'Daily battle energy count (resets at UTC+8 04:00)';
COMMENT ON COLUMN profiles.daily_energy_reset_at IS 'Next reset time in UTC';

