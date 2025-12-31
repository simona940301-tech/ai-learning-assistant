-- ============================================================================
-- ULTIMATE FIX: Robust Handle New User Trigger
-- ============================================================================
-- Addresses:
-- 1. Timezone safety (uses UTC+8 instead of 'Asia/Taipei')
-- 2. Search path safety (explicitly sets search_path)
-- 3. Permission safety (grants explicit rights)
-- 4. Null safety (handles missing data gracefully)
-- ============================================================================

BEGIN;

-- 1. Drop existing objects to ensure clean slate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.get_next_energy_reset_time();

-- 2. Create Timezone-Safe Helper Function
-- Uses explicit interval math instead of timezone lookup to avoid DB configuration issues
CREATE OR REPLACE FUNCTION public.get_next_energy_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  now_utc TIMESTAMPTZ;
  now_taipei TIMESTAMPTZ;
  next_reset_taipei TIMESTAMPTZ;
BEGIN
  -- Get current time
  now_utc := NOW();
  
  -- Convert to Taipei time (UTC+8) manually to be safe
  now_taipei := now_utc + INTERVAL '8 hours';
  
  -- Calculate next 4 AM
  -- Truncate to day, then add 4 hours
  next_reset_taipei := DATE_TRUNC('day', now_taipei) + INTERVAL '4 hours';
  
  -- If 4 AM has already passed today, move to tomorrow
  IF next_reset_taipei <= now_taipei THEN
    next_reset_taipei := next_reset_taipei + INTERVAL '1 day';
  END IF;
  
  -- Convert back to UTC for storage (subtract 8 hours)
  RETURN next_reset_taipei - INTERVAL '8 hours';
END;
$$ LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER;

-- 3. Create Robust Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- Run as owner (bypasses RLS)
SET search_path = public, extensions -- Explicit search path for safety
AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_email TEXT;
BEGIN
  -- Log entry
  RAISE NOTICE 'handle_new_user: Processing user %', NEW.id;

  -- Safe Metadata Extraction
  BEGIN
    v_email := COALESCE(
      NEW.email,
      NEW.raw_user_meta_data->>'email',
      ''
    );
    
    v_username := COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'preferred_username',
      'user_' || substr(NEW.id::text, 1, 8)
    );
    
    v_full_name := COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    );
    
    v_avatar_url := COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture',
      ''
    );
  EXCEPTION WHEN OTHERS THEN
    -- Fallback if JSON extraction fails completely
    v_email := COALESCE(NEW.email, '');
    v_username := 'user_' || substr(NEW.id::text, 1, 8);
    v_full_name := '';
    v_avatar_url := '';
    RAISE WARNING 'Metadata extraction failed, using defaults. Error: %', SQLERRM;
  END;

  -- Insert Profile
  INSERT INTO public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url,
    role,
    onboarding_completed,
    daily_energy_count,
    daily_energy,
    daily_energy_reset_at,
    elo_rank,
    coins,
    xp,
    streak,
    user_wallet_balance,
    created_at,
    updated_at,
    last_active_at,
    skill_mastery_json,
    examiner_contribution_score,
    user_match_history,
    avatar_tier,
    chick_iq,
    chick_explanations_used,
    chick_fatigue,
    chick_fatigue_battle_counter,
    chick_soothe_used,
    chick_emotion_state,
    chick_hunger,
    chick_intimacy,
    food_bowls_count,
    chick_exploration_allowance,
    chick_evolution_stage,
    chick_evolution_variant,
    chick_buffs_unlocked,
    chick_hunger_last_updated_at,
    learning_dna,
    focus_stats
  )
  VALUES (
    NEW.id,
    v_email,
    v_username,
    v_full_name,
    v_avatar_url,
    'student',
    false,
    8,
    8,
    public.get_next_energy_reset_time(), -- Use schema-qualified function
    1000,
    0,
    0,
    0,
    0,
    NOW(),
    NOW(),
    NOW(),
    '{}'::jsonb,
    0,
    '[]'::jsonb,
    1,
    5,
    0,
    0,
    0,
    0,
    'normal',
    50,
    0,
    0,
    0,
    0,
    'default',
    '[]'::jsonb,
    NOW(),
    '{"quit_rate": 0, "learning_style": "visual", "preferred_difficulty": "medium"}'::jsonb,
    '{"total_minutes": 0, "current_streak": 0, "longest_streak": 0}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, profiles.email),
    last_active_at = NOW(),
    updated_at = NOW();

  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  -- Log full error details to Postgres logs
  RAISE WARNING 'CRITICAL ERROR in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  -- Re-raise to ensure transaction fails and we know about it
  RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-create Trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant Permissions (Safety Net)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO postgres, service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO postgres, service_role;
GRANT ALL ON FUNCTION public.get_next_energy_reset_time() TO postgres, service_role;

COMMIT;
