-- ============================================================
-- Migration: 036_add_game_progression_fields_to_profiles.sql
-- Description: Add XP, level, coins, and match statistics to profiles table
-- Created: 2025-12-10
-- Purpose: Fix PVE reward system by adding missing game progression fields
-- ============================================================

-- Add game progression fields to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS streak_reward_state JSONB DEFAULT '{}'::jsonb NOT NULL,
ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_pve_matches INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_pvp_matches INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS total_questions_answered INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS last_battle_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS tutorial_badge_awarded BOOLEAN DEFAULT false;

-- Add chick system fields
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS chick_hunger INTEGER DEFAULT 50 NOT NULL CHECK (chick_hunger >= 0 AND chick_hunger <= 100),
ADD COLUMN IF NOT EXISTS chick_food_bowls INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS chick_last_fed_at TIMESTAMPTZ;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON profiles(coins DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_matches ON profiles(total_matches DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_last_battle_at ON profiles(last_battle_at DESC);

-- Add comments for documentation
COMMENT ON COLUMN profiles.xp IS 'Total experience points earned (總經驗值)';
COMMENT ON COLUMN profiles.level IS 'Current player level (玩家等級)';
COMMENT ON COLUMN profiles.coins IS 'Total coins/gold earned (金幣數量)';
COMMENT ON COLUMN profiles.streak IS 'Current daily login streak (連續登入天數)';
COMMENT ON COLUMN profiles.best_streak IS 'Best streak ever achieved (最高連續登入紀錄)';
COMMENT ON COLUMN profiles.streak_reward_state IS 'Streak milestone rewards claimed (連續登入獎勵領取狀態)';
COMMENT ON COLUMN profiles.total_matches IS 'Total matches played (總對戰場次)';
COMMENT ON COLUMN profiles.total_wins IS 'Total matches won (總勝場)';
COMMENT ON COLUMN profiles.total_pve_matches IS 'Total PVE matches played (PVE 場次)';
COMMENT ON COLUMN profiles.total_pvp_matches IS 'Total PVP matches played (PVP 場次)';
COMMENT ON COLUMN profiles.total_correct_answers IS 'Total correct answers (答對題數)';
COMMENT ON COLUMN profiles.total_questions_answered IS 'Total questions answered (總答題數)';
COMMENT ON COLUMN profiles.last_battle_at IS 'Timestamp of last battle (最後對戰時間)';
COMMENT ON COLUMN profiles.tutorial_completed_at IS 'Timestamp when tutorial was completed (教學完成時間)';
COMMENT ON COLUMN profiles.tutorial_badge_awarded IS 'Whether tutorial badge was awarded (教學徽章是否已授予)';
COMMENT ON COLUMN profiles.chick_hunger IS 'Chick hunger level 0-100 (小雞飢餓度)';
COMMENT ON COLUMN profiles.chick_food_bowls IS 'Number of food bowls owned (飼料碗數量)';
COMMENT ON COLUMN profiles.chick_last_fed_at IS 'Last time chick was fed (最後餵食時間)';

-- Update existing profiles to have default values
UPDATE profiles
SET
  xp = COALESCE(xp, 0),
  level = COALESCE(level, 1),
  coins = COALESCE(coins, 0),
  streak = COALESCE(streak, 0),
  best_streak = COALESCE(best_streak, 0),
  streak_reward_state = COALESCE(streak_reward_state, '{}'::jsonb),
  total_matches = COALESCE(total_matches, 0),
  total_wins = COALESCE(total_wins, 0),
  total_pve_matches = COALESCE(total_pve_matches, 0),
  total_pvp_matches = COALESCE(total_pvp_matches, 0),
  total_correct_answers = COALESCE(total_correct_answers, 0),
  total_questions_answered = COALESCE(total_questions_answered, 0),
  chick_hunger = COALESCE(chick_hunger, 50),
  chick_food_bowls = COALESCE(chick_food_bowls, 0)
WHERE
  xp IS NULL
  OR level IS NULL
  OR coins IS NULL
  OR streak IS NULL
  OR best_streak IS NULL
  OR streak_reward_state IS NULL
  OR total_matches IS NULL
  OR total_wins IS NULL
  OR total_pve_matches IS NULL
  OR total_pvp_matches IS NULL
  OR total_correct_answers IS NULL
  OR total_questions_answered IS NULL
  OR chick_hunger IS NULL
  OR chick_food_bowls IS NULL;

-- Create a view for leaderboard (top players by XP)
CREATE OR REPLACE VIEW leaderboard_by_xp AS
SELECT
  id,
  email,
  username,
  display_name,
  avatar_url,
  xp,
  level,
  total_matches,
  total_wins,
  CASE
    WHEN total_matches > 0 THEN ROUND((total_wins::NUMERIC / total_matches::NUMERIC) * 100, 2)
    ELSE 0
  END as win_rate,
  ROW_NUMBER() OVER (ORDER BY xp DESC, total_wins DESC) as rank
FROM profiles
WHERE xp > 0
ORDER BY xp DESC, total_wins DESC
LIMIT 100;

-- Grant permissions
GRANT SELECT ON leaderboard_by_xp TO authenticated;
GRANT SELECT ON leaderboard_by_xp TO service_role;

COMMENT ON VIEW leaderboard_by_xp IS 'Top 100 players ranked by XP (經驗值排行榜)';
