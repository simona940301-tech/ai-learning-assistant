-- ============================================================================
-- Fix: Make email nullable and handle missing email gracefully
-- ============================================================================

-- 1. Make email column nullable (safe fallback)
ALTER TABLE profiles 
  ALTER COLUMN email DROP NOT NULL;

-- 2. Update handle_new_user to handle missing email
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
  v_email TEXT;
BEGIN
  -- Extract email with fallback
  v_email := COALESCE(
    NEW.email,
    NEW.raw_user_meta_data->>'email',
    ''
  );
  
  -- Extract other metadata
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
  
  -- Log for debugging
  RAISE NOTICE 'Creating profile for user % with email: %', NEW.id, v_email;
  
  -- Insert profile
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
    v_email, -- Now nullable
    v_username,
    v_full_name,
    v_avatar_url,
    'student',
    false,
    8,
    8,
    get_next_energy_reset_time(),
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
    updated_at = NOW();
  
  RAISE NOTICE 'Profile created successfully for user %', NEW.id;
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Error in handle_new_user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  RAISE EXCEPTION 'Database error saving new user: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user creation with graceful email fallback for OAuth providers that may not provide email.';
