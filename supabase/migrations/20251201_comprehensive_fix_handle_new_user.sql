-- ============================================================================
-- Migration: Comprehensive Fix for handle_new_user trigger (V4)
-- Date: 2025-12-01
-- Purpose: Fix "Database error saving new user" by ensuring all required columns are populated
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

-- 2. Ensure columns exist in profiles table (Idempotent)
-- ============================================================================
DO $$
BEGIN
    -- Ensure daily_energy exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_energy') THEN
        ALTER TABLE profiles ADD COLUMN daily_energy INTEGER DEFAULT 8 NOT NULL;
    END IF;

    -- Ensure daily_energy_reset_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'daily_energy_reset_at') THEN
        ALTER TABLE profiles ADD COLUMN daily_energy_reset_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Ensure elo_rank exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'elo_rank') THEN
        ALTER TABLE profiles ADD COLUMN elo_rank INTEGER DEFAULT 1000 NOT NULL;
    END IF;

    -- Ensure xp exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'xp') THEN
        ALTER TABLE profiles ADD COLUMN xp INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Ensure streak exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'streak') THEN
        ALTER TABLE profiles ADD COLUMN streak INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Ensure coins exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'coins') THEN
        ALTER TABLE profiles ADD COLUMN coins INTEGER DEFAULT 0 NOT NULL;
    END IF;

    -- Ensure email exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE profiles ADD COLUMN email TEXT;
    END IF;
    
    -- Ensure full_name exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'full_name') THEN
        ALTER TABLE profiles ADD COLUMN full_name TEXT;
    END IF;
    
    -- Ensure updated_at exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Re-define handle_new_user trigger with ALL required columns
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    full_name, -- Added
    avatar_url,
    daily_energy,
    daily_energy_reset_at,
    elo_rank,
    xp,
    streak,
    coins,
    email,
    updated_at -- Added
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    8, -- Full energy
    get_next_energy_reset_time(),
    COALESCE((NEW.raw_user_meta_data->>'elo_rank')::INTEGER, 1000),
    0, -- xp default
    0, -- streak default
    0, -- coins default
    NEW.email,
    NOW() -- updated_at
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
