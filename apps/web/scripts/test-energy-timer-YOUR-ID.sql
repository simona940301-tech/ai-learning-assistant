-- 測試腳本：驗證羽毛倒數計時器不會重置
-- 使用你的實際用戶 ID

-- 1. 設置測試場景：用戶在 1 分鐘前消耗了羽毛
-- 預期：應該會看到還剩約 29 分鐘才能恢復下一根羽毛

UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';  -- 你的用戶 ID

-- 驗證設置
SELECT
  id,
  daily_energy_count as current_energy,
  energy_last_updated_at,
  daily_energy_reset_at,
  calculate_current_energy(
    daily_energy_count,
    energy_last_updated_at,
    8,
    30
  ) as calculated_energy,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) / 60 as minutes_since_last_update
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 預期結果：
-- current_energy: 7
-- calculated_energy: 7 (因為只過了 1 分鐘)
-- minutes_since_last_update: ~1

-- ✅ 測試步驟：
-- 1. 執行此腳本
-- 2. 重新整理瀏覽器 5 次
-- 3. 倒數計時器應該顯示 ~29:00 並持續倒數
-- 4. 不應該每次刷新都重置為 30:00

-- 🔴 如果看到倒數每次刷新都重置，說明 bug 仍然存在
-- ✅ 如果倒數持續進行不重置，說明 bug 已修復
