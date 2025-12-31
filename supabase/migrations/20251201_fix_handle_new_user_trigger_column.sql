-- ============================================================================
-- Migration: Fix handle_new_user trigger column name
-- Date: 2025-12-01
-- Purpose: Fix the column name mismatch in handle_new_user function (daily_energy_count -> daily_energy)
-- ============================================================================

-- 1. Update handle_new_user() function to use correct column name 'daily_energy'
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    daily_energy, -- Fixed: Changed from daily_energy_count to daily_energy
    daily_energy_reset_at,
    elo_rank
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    8, -- Full energy for new users
    get_next_energy_reset_time(), -- Calculate next reset time (UTC+8 04:00)
    COALESCE((NEW.raw_user_meta_data->>'elo_rank')::INTEGER, 1000) -- Default ELO
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user registration. Ensures new users have full energy (8), correct reset time, and default ELO rank.';
