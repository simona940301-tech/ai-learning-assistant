-- 🚨 立即修復：設置你的用戶資料
-- 執行後立即刷新瀏覽器

-- 設置羽毛為 7，時間戳為 1 分鐘前
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute',
  daily_energy_reset_at = NOW() + INTERVAL '1 day'
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';

-- 確認設置成功
SELECT
  id,
  daily_energy_count as energy,
  energy_last_updated_at,
  daily_energy_reset_at,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) / 60 as minutes_ago
FROM profiles
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';

-- 應該會看到：
-- energy: 7
-- energy_last_updated_at: (約 1 分鐘前的時間)
-- minutes_ago: ~1
