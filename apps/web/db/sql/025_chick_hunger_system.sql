-- ============================================
-- Chick Hunger System Enhancement
-- ============================================
-- 新增飢餓度時間追蹤和錯題複習進度表

-- 1. 新增飢餓度時間追蹤欄位
DO $$
BEGIN
    -- 最後更新時間
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_hunger_last_updated_at') THEN
        ALTER TABLE profiles ADD COLUMN chick_hunger_last_updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 最後餵食時間（用於統計）
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'chick_last_fed_at') THEN
        ALTER TABLE profiles ADD COLUMN chick_last_fed_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. 確保 battle_progression_state 表存在（如果不存在則創建）
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

-- 3. 新增飽足狀態 Buff 欄位到 battle_progression_state
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'battle_progression_state' AND column_name = 'chick_well_fed_expires_at') THEN
        ALTER TABLE battle_progression_state ADD COLUMN chick_well_fed_expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- 4. 確保索引存在
CREATE INDEX IF NOT EXISTS idx_battle_progression_state_streak ON battle_progression_state (daily_streak_count DESC);

-- 5. 錯題複習進度追蹤表
CREATE TABLE IF NOT EXISTS chick_error_review_progress (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    current_count INTEGER DEFAULT 0 CHECK (current_count >= 0),
    last_reset_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chick_error_review_progress_user ON chick_error_review_progress(user_id);

-- 6. 技能使用記錄表
CREATE TABLE IF NOT EXISTS chick_skill_usage (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    skill_type TEXT NOT NULL CHECK (skill_type IN ('SOS', 'TIME_FREEZE')),
    used_at TIMESTAMPTZ DEFAULT NOW(),
    used_date DATE DEFAULT CURRENT_DATE,
    battle_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 創建 IMMUTABLE 函數用於索引
CREATE OR REPLACE FUNCTION date_from_timestamptz(ts TIMESTAMPTZ)
RETURNS DATE AS $$
    SELECT (ts AT TIME ZONE 'UTC')::DATE;
$$ LANGUAGE SQL IMMUTABLE;

-- 創建索引（使用 IMMUTABLE 函數）
CREATE INDEX IF NOT EXISTS idx_chick_skill_usage_user_date 
ON chick_skill_usage(user_id, date_from_timestamptz(used_at));

CREATE INDEX IF NOT EXISTS idx_chick_skill_usage_user_type_date 
ON chick_skill_usage(user_id, skill_type, date_from_timestamptz(used_at));

-- 創建觸發器自動更新 used_date
CREATE OR REPLACE FUNCTION update_chick_skill_usage_date()
RETURNS TRIGGER AS $$
BEGIN
    NEW.used_date := (NEW.used_at AT TIME ZONE 'UTC')::DATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_chick_skill_usage_date ON chick_skill_usage;
CREATE TRIGGER trigger_update_chick_skill_usage_date
    BEFORE INSERT OR UPDATE OF used_at ON chick_skill_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_chick_skill_usage_date();

-- 7. 初始化現有用戶的 chick_hunger_last_updated_at
UPDATE profiles
SET chick_hunger_last_updated_at = NOW()
WHERE chick_hunger_last_updated_at IS NULL;

