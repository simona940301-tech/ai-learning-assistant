-- ============================================
-- Growth System V1 - Progression Schema
-- ============================================
-- This migration extends the battle progression data model with XP/Level
-- tracking, streak milestones, chests, achievements, and badges.

-- Extend profiles table with progression stats
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1 CHECK (level >= 1),
  ADD COLUMN IF NOT EXISTS best_streak INTEGER DEFAULT 0 CHECK (best_streak >= 0),
  ADD COLUMN IF NOT EXISTS streak_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS streak_reward_state JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS last_battle_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tutorial_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tutorial_badge_awarded BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS total_matches INTEGER DEFAULT 0 CHECK (total_matches >= 0),
  ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0 CHECK (total_wins >= 0),
  ADD COLUMN IF NOT EXISTS total_pve_matches INTEGER DEFAULT 0 CHECK (total_pve_matches >= 0),
  ADD COLUMN IF NOT EXISTS total_pvp_matches INTEGER DEFAULT 0 CHECK (total_pvp_matches >= 0),
  ADD COLUMN IF NOT EXISTS total_correct_answers INTEGER DEFAULT 0 CHECK (total_correct_answers >= 0),
  ADD COLUMN IF NOT EXISTS total_questions_answered INTEGER DEFAULT 0 CHECK (total_questions_answered >= 0);

-- ============================================
-- battle_progression_state: fine-grained state store for XP buffs & streaks
-- ============================================
CREATE TABLE IF NOT EXISTS battle_progression_state (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  xp_multiplier NUMERIC(4,2) DEFAULT 1.0 CHECK (xp_multiplier >= 0.5),
  xp_multiplier_expires_at TIMESTAMPTZ,
  daily_streak_count INTEGER DEFAULT 0 CHECK (daily_streak_count >= 0),
  last_streaked_on DATE,
  streak_frozen BOOLEAN DEFAULT FALSE,
  streak_reward_cursor INTEGER DEFAULT 0 CHECK (streak_reward_cursor >= 0),
  tutorial_match_id UUID,
  tutorial_forced BOOLEAN DEFAULT FALSE,
  tutorial_reward_claimed BOOLEAN DEFAULT FALSE,
  active_badges JSONB DEFAULT '[]'::jsonb,
  pending_rewards JSONB DEFAULT '[]'::jsonb,
  last_progression_calculated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_battle_progression_state_streak ON battle_progression_state (daily_streak_count DESC);

-- ============================================
-- battle_streak_milestones: configurable streak rewards
-- ============================================
CREATE TABLE IF NOT EXISTS battle_streak_milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  milestone_days INTEGER NOT NULL UNIQUE CHECK (milestone_days > 0),
  reward_chest_type TEXT CHECK (reward_chest_type IN ('BRONZE', 'GOLD')), -- optional chest reward
  reward_gold INTEGER DEFAULT 0 CHECK (reward_gold >= 0),
  reward_xp INTEGER DEFAULT 0 CHECK (reward_xp >= 0),
  reward_badge_code TEXT,
  reward_buff_hours INTEGER DEFAULT 0 CHECK (reward_buff_hours >= 0),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default milestones
INSERT INTO battle_streak_milestones (milestone_days, reward_chest_type, reward_gold, reward_xp, reward_badge_code, reward_buff_hours, metadata)
VALUES
  (3, 'BRONZE', 0, 40, NULL, 0, jsonb_build_object('label', '3-day Streak')),
  (7, 'GOLD', 100, 120, NULL, 24, jsonb_build_object('label', '7-day Momentum', 'xp_multiplier', 1.2)),
  (30, NULL, 300, 250, 'streak_legend', 72, jsonb_build_object('label', '30-day Legend', 'avatar_frame', 'ember_rookie'))
ON CONFLICT (milestone_days) DO UPDATE SET
  reward_chest_type = EXCLUDED.reward_chest_type,
  reward_gold = EXCLUDED.reward_gold,
  reward_xp = EXCLUDED.reward_xp,
  reward_badge_code = EXCLUDED.reward_badge_code,
  reward_buff_hours = EXCLUDED.reward_buff_hours,
  metadata = EXCLUDED.metadata;

-- ============================================
-- battle_chests: inventory of unopened/opened chests per player
-- ============================================
CREATE TABLE IF NOT EXISTS battle_chests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  chest_type TEXT NOT NULL CHECK (chest_type IN ('BRONZE', 'GOLD')),
  status TEXT NOT NULL DEFAULT 'UNOPENED' CHECK (status IN ('UNOPENED', 'OPENED')),
  source TEXT NOT NULL,
  rewards JSONB DEFAULT '{}'::jsonb,
  xp_delta INTEGER DEFAULT 0,
  gold_delta INTEGER DEFAULT 0,
  buff_payload JSONB DEFAULT 'null'::jsonb,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_battle_chests_user_status ON battle_chests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_battle_chests_created ON battle_chests (granted_at DESC);

-- ============================================
-- battle_badge_definitions & user_badges
-- ============================================
CREATE TABLE IF NOT EXISTS battle_badge_definitions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  rarity TEXT DEFAULT 'common',
  category TEXT DEFAULT 'progression',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  badge_code TEXT REFERENCES battle_badge_definitions(code) ON DELETE CASCADE,
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges (user_id);

INSERT INTO battle_badge_definitions (code, name, description, icon, rarity, category)
VALUES
  ('rookie_warrior', '新手戰士', '完成首次教學戰並贏得勝利', 'rookie', 'common', 'tutorial'),
  ('streak_legend', '恆毅傳說', '連續 30 天完成每日對戰', 'flame-ring', 'legendary', 'streak'),
  ('perfect_game', '完美演算', '一場對戰中保持 100% 正確率', 'perfect', 'epic', 'performance'),
  ('first_pvp_win', '試煉者', '首次真人 PVP 勝利', 'arena', 'rare', 'pvp'),
  ('pvp_streak_5', '火線五連勝', '連續 5 場 PVP 勝利', 'streak', 'epic', 'pvp')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category;

-- ============================================
-- battle_achievement_definitions & user_achievements
-- ============================================
CREATE TABLE IF NOT EXISTS battle_achievement_definitions (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  reward_chest_type TEXT CHECK (reward_chest_type IN ('BRONZE', 'GOLD')),
  reward_gold INTEGER DEFAULT 0 CHECK (reward_gold >= 0),
  reward_xp INTEGER DEFAULT 0 CHECK (reward_xp >= 0),
  reward_badge_code TEXT REFERENCES battle_badge_definitions(code),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  achievement_code TEXT REFERENCES battle_achievement_definitions(code) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, achievement_code)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements (user_id);

INSERT INTO battle_achievement_definitions (code, name, description, category, reward_chest_type, reward_gold, reward_xp, reward_badge_code, metadata)
VALUES
  ('perfect_accuracy', '100% 正確', '單場 10 題全對', 'performance', 'BRONZE', 0, 60, 'perfect_game', jsonb_build_object('required_correct', 10)),
  ('first_pvp_win', '首勝紀念', '首次真人 PVP 勝利', 'pvp', NULL, 150, 80, 'first_pvp_win', jsonb_build_object('matches', 1)),
  ('pvp_win_streak_5', '連勝五場', '連續 5 場 PVP 勝利', 'pvp', 'GOLD', 200, 120, 'pvp_streak_5', jsonb_build_object('streak', 5)),
  ('fifty_matches', '對戰老手', '累積完成 50 場對戰', 'lifetime', 'BRONZE', 120, 100, NULL, jsonb_build_object('total_matches', 50)),
  ('two_hundred_answers', '二百問', '累積答完 200 題', 'lifetime', NULL, 0, 150, NULL, jsonb_build_object('total_questions', 200))
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  reward_chest_type = EXCLUDED.reward_chest_type,
  reward_gold = EXCLUDED.reward_gold,
  reward_xp = EXCLUDED.reward_xp,
  reward_badge_code = EXCLUDED.reward_badge_code,
  metadata = EXCLUDED.metadata;

-- ============================================
-- RLS Policies
-- ============================================
ALTER TABLE battle_progression_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_chests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_progression_state' AND policyname = 'Users can manage own progression state'
  ) THEN
    CREATE POLICY "Users can manage own progression state"
      ON battle_progression_state
      FOR ALL
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_chests' AND policyname = 'Users can view own chests'
  ) THEN
    CREATE POLICY "Users can view own chests"
      ON battle_chests FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_chests' AND policyname = 'Users can insert own chests'
  ) THEN
    CREATE POLICY "Users can insert own chests"
      ON battle_chests FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'battle_chests' AND policyname = 'Users can update own chests'
  ) THEN
    CREATE POLICY "Users can update own chests"
      ON battle_chests FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can view own badges'
  ) THEN
    CREATE POLICY "Users can view own badges"
      ON user_badges FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_badges' AND policyname = 'Users can insert badges via service'
  ) THEN
    CREATE POLICY "Users can insert badges via service"
      ON user_badges FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can view own achievements'
  ) THEN
    CREATE POLICY "Users can view own achievements"
      ON user_achievements FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_achievements' AND policyname = 'Users can insert own achievements'
  ) THEN
    CREATE POLICY "Users can insert own achievements"
      ON user_achievements FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
