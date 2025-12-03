-- 檢查你當前登入的用戶資料
-- 根據 Console 輸出，你的用戶 ID 是 b34075cd-d271-4f20-ab9a-cdaa25836da1

SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  daily_energy_reset_at,
  CASE
    WHEN energy_last_updated_at IS NULL THEN '❌ NULL - 這就是問題！'
    ELSE '✅ 有值'
  END as status
FROM profiles
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';

-- 如果 energy_last_updated_at 是 NULL，執行下面的修復：

-- 修復：設置初始時間戳
UPDATE profiles
SET
  energy_last_updated_at = NOW() - INTERVAL '1 minute',
  daily_energy_reset_at = COALESCE(daily_energy_reset_at, NOW() + INTERVAL '1 day')
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1'
  AND energy_last_updated_at IS NULL;

-- 確認修復成功
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  daily_energy_reset_at,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) / 60 as minutes_since_update
FROM profiles
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';
