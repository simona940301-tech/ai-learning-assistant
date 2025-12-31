-- ============================================================================
-- Migration: Final Comprehensive Fix for handle_new_user trigger
-- Date: 2025-12-01
-- Purpose: Include ALL possible required columns to fix "Database error saving new user"
-- ============================================================================

-- 1. Ensure helper function exists (Idempotent)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_next_energy_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  now_taipei TIMESTAMPTZ;
  next_reset_taipei TIMESTAMPTZ;
BEGIN
  -- Get current time in Taipei timezone
  now_taipei := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei';
  
  -- Set to 04:00 today in Taipei timezone
  next_reset_taipei := DATE_TRUNC('day', now_taipei) + INTERVAL '4 hours';
  
  -- If already past 04:00 today, set to 04:00 tomorrow
  IF next_reset_taipei <= now_taipei THEN
    next_reset_taipei := next_reset_taipei + INTERVAL '1 day';
  END IF;
  
  -- Convert back to UTC
  RETURN next_reset_taipei AT TIME ZONE 'Asia/Taipei';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Re-define handle_new_user trigger with ALL possible columns
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name,
    avatar_url,
    email,
    -- Energy system
    daily_energy,
    daily_energy_reset_at,
    -- Battle system
    elo_rank,
    xp,
    streak,
    coins,
    level,
    -- Onboarding
    onboarding_completed,
    -- Timestamps
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NEW.email,
    -- Energy system
    8, -- Full energy
    get_next_energy_reset_time(),
    -- Battle system
    COALESCE((NEW.raw_user_meta_data->>'elo_rank')::INTEGER, 1000),
    0, -- xp
    0, -- streak
    0, -- coins
    1, -- level
    -- Onboarding
    false, -- onboarding_completed
    -- Timestamps
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user registration. Ensures all required fields are populated with sensible defaults.';
