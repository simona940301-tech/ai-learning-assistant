-- ============================================================================
-- Migration: 修正新用戶精力值系統 - 確保所有用戶有滿精力值
-- Date: 2025-01-30
-- Purpose: 修正新用戶註冊時精力值初始化問題，確保第一次登入就能玩遊戲
-- ============================================================================

-- 1. 確保 daily_energy_reset_at 和 elo_rank 欄位存在（如果不存在則添加）
-- ============================================================================
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS daily_energy_reset_at TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS elo_rank INTEGER DEFAULT 1000 CHECK (elo_rank >= 0 AND elo_rank <= 3000);

-- 2. 創建輔助函數：計算下一個精力值重置時間（UTC+8 04:00）
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

COMMENT ON FUNCTION get_next_energy_reset_time() IS 
'計算下一個精力值重置時間（UTC+8 04:00）。用於新用戶初始化和精力值重置邏輯。';

-- 3. 回補現有用戶：修正沒有正確初始化精力值的用戶
-- ============================================================================
UPDATE profiles
SET 
  daily_energy_count = 8, -- 設定為滿精力值
  daily_energy_reset_at = COALESCE(
    daily_energy_reset_at,
    get_next_energy_reset_time()
  ), -- 如果為 NULL，則設定為下一個重置時間
  elo_rank = COALESCE(elo_rank, 1000) -- 如果為 NULL，則設定為預設值
WHERE 
  daily_energy_count IS NULL 
  OR daily_energy_count < 0 
  OR daily_energy_count > 8
  OR daily_energy_reset_at IS NULL
  OR elo_rank IS NULL;

-- 4. 更新 handle_new_user() 函數，確保新用戶有滿精力值
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    avatar_url,
    daily_energy_count,
    daily_energy_reset_at,
    elo_rank
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    8, -- 滿精力值，確保新用戶可以立即開始遊戲
    get_next_energy_reset_time(), -- 精確計算下次重置時間（UTC+8 04:00）
    COALESCE((NEW.raw_user_meta_data->>'elo_rank')::INTEGER, 1000) -- 預設 ELO 分數
  )
  ON CONFLICT (id) DO NOTHING; -- 防止重複插入
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION handle_new_user() IS 
'處理新用戶註冊。確保新用戶有滿精力值（8），正確的重置時間，和預設 ELO 分數。';

-- 5. 創建索引以提升查詢效能
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_energy_reset 
ON profiles(daily_energy_reset_at) 
WHERE daily_energy_reset_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_elo_rank 
ON profiles(elo_rank DESC) 
WHERE elo_rank IS NOT NULL;

-- 6. 添加註解
-- ============================================================================
COMMENT ON COLUMN profiles.daily_energy_reset_at IS 
'下次精力值重置時間（UTC+8 04:00）。當到達此時間時，精力值會自動重置為 8。';

COMMENT ON COLUMN profiles.elo_rank IS 
'玩家 ELO 等級分數（預設 1000，範圍 0-3000）。用於匹配系統。';

-- ============================================================================
-- 驗證查詢（可選，用於檢查修正結果）
-- ============================================================================
-- SELECT 
--   COUNT(*) as total_users,
--   COUNT(CASE WHEN daily_energy_count = 8 THEN 1 END) as users_with_full_energy,
--   COUNT(CASE WHEN daily_energy_reset_at IS NOT NULL THEN 1 END) as users_with_reset_time,
--   COUNT(CASE WHEN elo_rank IS NOT NULL THEN 1 END) as users_with_elo
-- FROM profiles;































