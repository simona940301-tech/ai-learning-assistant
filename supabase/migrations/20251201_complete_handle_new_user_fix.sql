-- ============================================================================
-- Migration: COMPLETE Fix for handle_new_user trigger
-- Date: 2025-12-01
-- Purpose: Initialize ALL NOT NULL columns based on actual schema
-- ============================================================================

-- 1. Ensure helper function exists
-- ============================================================================
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
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 2. Complete handle_new_user trigger with ALL NOT NULL columns
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    -- Core identity (NOT NULL, no default)
    id,
    email,
    
    -- Profile info (nullable or has defaults)
    username,
    avatar_url,
    display_name,
    full_name,
    role,
    
    -- Onboarding (nullable or has defaults)
    onboarding_completed,
    target_university,
    target_department,
    
    -- Energy system (has defaults but let's be explicit)
    daily_energy_count,
    daily_energy,
    daily_energy_reset_at,
    
    -- Battle/Game system (has defaults)
    elo_rank,
    coins,
    xp,
    streak,
    
    -- Wallet
    user_wallet_balance,
    
    -- Timestamps (has defaults)
    created_at,
    updated_at,
    last_active_at,
    
    -- Skills & assessments (nullable or has defaults)
    initial_skill_assessment,
    skill_mastery_json,
    
    -- Examiner contribution
    examiner_contribution_score,
    
    -- Match history
    user_match_history,
    
    -- Avatar system
    avatar_preset,
    avatar_tier,
    avatar_generated_at,
    
    -- Chick system (all have defaults)
    chick_iq,
    chick_iq_last_decay_at,
    chick_explanations_used,
    chick_explanations_reset_at,
    chick_fatigue,
    chick_fatigue_battle_counter,
    chick_soothe_used,
    chick_soothe_reset_at,
    chick_emotion_state,
    chick_emotion_updated_at,
    chick_hunger,
    chick_intimacy,
    food_bowls_count,
    chick_exploration_start_at,
    chick_exploration_allowance,
    chick_evolution_stage,
    chick_evolution_variant,
    chick_buffs_unlocked,
    chick_hunger_last_updated_at,
    chick_last_fed_at,
    chick_name,
    user_nickname,
    chick_hatched_at,
    chick_first_fed_at,
    last_seen_at,
    last_login_at,
    
    -- Learning DNA
    learning_dna,
    
    -- Focus stats
    focus_stats
  )
  VALUES (
    -- Core identity
    NEW.id,
    NEW.email,
    
    -- Profile info
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    NULL, -- display_name
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    'student', -- role has default
    
    -- Onboarding
    false, -- onboarding_completed has default
    NULL, -- target_university
    NULL, -- target_department
    
    -- Energy system
    8, -- daily_energy_count (legacy)
    8, -- daily_energy
    get_next_energy_reset_time(),
    
    -- Battle/Game system
    1000, -- elo_rank has default
    0, -- coins has default
    0, -- xp has default
    0, -- streak has default
    
    -- Wallet
    0, -- user_wallet_balance has default
    
    -- Timestamps
    NOW(), -- created_at has default
    NOW(), -- updated_at has default
    NOW(), -- last_active_at has default
    
    -- Skills & assessments
    NULL, -- initial_skill_assessment
    '{}'::jsonb, -- skill_mastery_json has default
    
    -- Examiner contribution
    0, -- examiner_contribution_score has default
    
    -- Match history
    '[]'::jsonb, -- user_match_history has default
    
    -- Avatar system
    NULL, -- avatar_preset
    1, -- avatar_tier has default
    NULL, -- avatar_generated_at
    
    -- Chick system
    5, -- chick_iq has default
    NULL, -- chick_iq_last_decay_at
    0, -- chick_explanations_used has default
    NULL, -- chick_explanations_reset_at
    0, -- chick_fatigue has default
    0, -- chick_fatigue_battle_counter has default
    0, -- chick_soothe_used has default
    NULL, -- chick_soothe_reset_at
    'normal', -- chick_emotion_state has default
    NULL, -- chick_emotion_updated_at
    50, -- chick_hunger has default
    0, -- chick_intimacy has default
    0, -- food_bowls_count has default
    NULL, -- chick_exploration_start_at
    0, -- chick_exploration_allowance has default
    0, -- chick_evolution_stage has default
    'default', -- chick_evolution_variant has default
    '[]'::jsonb, -- chick_buffs_unlocked has default
    NOW(), -- chick_hunger_last_updated_at has default
    NULL, -- chick_last_fed_at
    NULL, -- chick_name
    NULL, -- user_nickname
    NULL, -- chick_hatched_at
    NULL, -- chick_first_fed_at
    NULL, -- last_seen_at
    NULL, -- last_login_at
    
    -- Learning DNA
    '{"quit_rate": 0, "learning_style": "visual", "preferred_difficulty": "medium"}'::jsonb, -- has default
    
    -- Focus stats
    '{"total_minutes": 0, "current_streak": 0, "longest_streak": 0}'::jsonb -- has default
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'Handles new user registration. Initializes ALL required fields based on actual profiles table schema.';
