-- ============================================================================
-- ELITE handle_new_user Function with Comprehensive Error Handling
-- ============================================================================
-- This version includes:
-- 1. Detailed error logging
-- 2. Graceful fallbacks for each column
-- 3. Transaction safety
-- 4. Diagnostic output
-- ============================================================================

-- Helper function for energy reset time
CREATE OR REPLACE FUNCTION get_next_energy_reset_time()
RETURNS TIMESTAMPTZ AS $$
DECLARE
  now_taipei TIMESTAMPTZ;
  next_reset_taipei TIMESTAMPTZ;
BEGIN
  now_taipei := NOW() AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Taipei';
  next_reset_taipei := DATE_TRUNC('day', now_taipei) + INTERVAL '4 hours';
  IF next_reset_taipei <= now_taipei THEN
    next_reset_taipei := next_reset_taipei + INTERVAL '1 day';
  END IF;
  RETURN next_reset_taipei AT TIME ZONE 'Asia/Taipei';
EXCEPTION WHEN OTHERS THEN
  RETURN NOW() + INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Main trigger function with elite error handling
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_error_context TEXT;
  v_username TEXT;
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'handle_new_user triggered for user: %', NEW.id;
  
  BEGIN
    -- Extract metadata with fallbacks
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
    
    RAISE NOTICE 'Extracted metadata - username: %, full_name: %, avatar: %', 
      v_username, v_full_name, v_avatar_url;
    
    -- Insert with explicit column list and safe defaults
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
      COALESCE(NEW.email, ''),
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
      updated_at = NOW(),
      last_active_at = NOW();
    
    RAISE NOTICE 'Profile created successfully for user: %', NEW.id;
    
  EXCEPTION 
    WHEN unique_violation THEN
      RAISE NOTICE 'Profile already exists for user: %', NEW.id;
      RETURN NEW;
      
    WHEN not_null_violation THEN
      GET STACKED DIAGNOSTICS v_error_context = PG_EXCEPTION_CONTEXT;
      RAISE WARNING 'NOT NULL violation in handle_new_user: % - Context: %', SQLERRM, v_error_context;
      RAISE EXCEPTION 'Database error saving new user: NOT NULL violation - %', SQLERRM;
      
    WHEN foreign_key_violation THEN
      GET STACKED DIAGNOSTICS v_error_context = PG_EXCEPTION_CONTEXT;
      RAISE WARNING 'Foreign key violation in handle_new_user: % - Context: %', SQLERRM, v_error_context;
      RAISE EXCEPTION 'Database error saving new user: Foreign key violation - %', SQLERRM;
      
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_context = PG_EXCEPTION_CONTEXT;
      RAISE WARNING 'Unexpected error in handle_new_user: % - SQLSTATE: % - Context: %', 
        SQLERRM, SQLSTATE, v_error_context;
      RAISE EXCEPTION 'Database error saving new user: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'Elite version with comprehensive error handling and logging. Automatically creates profile for new users.';

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO service_role;
