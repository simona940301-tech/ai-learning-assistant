-- English Mastery Badges (High-Difficulty English Badge Set)
-- This migration only inserts badge definition rows;
-- it does not change existing schema definitions.

-- Ensure badge tables exist (aligned with 20250210_add_progression_system.sql)
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
  -- Volume / 投入
  ('eng_volume_basic', '迷你腦力戰士', '累計完成至少 200 題英文題目。', 'flatline-layers', 'common', 'progression'),
  ('eng_volume_advanced', '千錘百練', '累計完成至少 1000 題英文題目。', 'flatline-map-explore', 'rare', 'progression'),
  ('eng_volume_expert', '單字王者', '累計完成至少 3000 題英文題目。', 'flatline-target-lock', 'epic', 'progression'),
  ('eng_volume_grandmaster', '詞彙宗師', '累計完成至少 5000 題英文題目。', 'flatline-award-star', 'legendary', 'progression'),

  -- Streak / 持續性（依英文每日題量）
  ('eng_streak_weekly', '習慣倉鼠', '連續 7 天，每天至少完成 15 題英文題目。', 'flatline-calendar-7', 'rare', 'streak'),
  ('eng_streak_habit', '紀律機器人', '連續 30 天，每天至少完成 20 題英文題目。', 'flatline-repeat', 'epic', 'streak'),
  ('eng_streak_prep', '高強度備戰', '連續 60 天，每天至少完成 40 題英文題目。', 'flatline-bolt-timer', 'epic', 'streak'),
  ('eng_streak_iron', '鋼鐵意志', '連續 90 天，每天至少完成 50 題英文題目。', 'flatline-shield-check', 'legendary', 'streak'),

  -- Quality / 精準與速度
  ('eng_accuracy_high', '高效精準', '在至少 200 題英文題目中，難度加權準確率達到 90% 以上。', 'flatline-target-90', 'epic', 'performance'),
  ('eng_accuracy_flawless', '無暇執行', '在至少 500 題英文題目中，難度加權準確率達到 95% 以上。', 'flatline-gem-diamond', 'legendary', 'performance'),
  ('eng_speed_automatic', '', '在至少 200 題英文題目中，準確率 80% 以上，且平均作答時間不超過 20 秒。', 'flatline-brain-auto', 'epic', 'performance'),

  -- Outcome / Dream Ready 百分比
  ('eng_ready_70', 'Dream Ready 70%', 'Dream School Ready 達到 70% 以上。', 'flatline-medal-bronze', 'rare', 'performance'),
  ('eng_ready_85', 'Dream Ready 85%', 'Dream School Ready 達到 85% 以上。', 'flatline-medal-silver', 'epic', 'performance'),
  ('eng_ready_100', 'Dream Ready 100%', 'Dream School Ready 達到 100% 以上。', 'flatline-medal-gold', 'legendary', 'performance'),
  ('eng_ready_110', 'Dream Ready 110%', 'Dream School Ready 達到 110% 以上，代表高強度行為加成與模考表現。', 'flatline-medal-platinum', 'legendary', 'performance')
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  rarity = EXCLUDED.rarity,
  category = EXCLUDED.category;
