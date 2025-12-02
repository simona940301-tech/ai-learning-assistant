# 每日任務系統測試指南

## ✅ 修復完成

已修復 **401 Unauthorized** 錯誤：
- ✅ 修改 `/api/missions/daily` 使用 `createClient()` 而非 `createRouteHandlerClient`
- ✅ 修改 `/api/missions/progress` 使用 `createClient()`
- ✅ 支持開發模式的 mock user (e770f9cd-52a7-43de-b983-70f6f78d2f53)

---

## 🚀 現在開始測試

### 步驟 1：執行數據庫遷移

在 **Supabase Dashboard → SQL Editor** 執行：

```sql
-- 複製整個 apps/web/db/sql/026_daily_missions_safe.sql 的內容
-- 或直接執行以下快速檢查：

SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'daily_missions'
) AS table_exists;
```

**如果返回 `false`：**
- 複製 `apps/web/db/sql/026_daily_missions_safe.sql` 的完整內容
- 粘貼到 SQL Editor
- 點擊 RUN

**如果返回 `true`：**
- 表已存在，跳到步驟 2

---

### 步驟 2：重啟開發服務器

```bash
# 停止當前服務器（Ctrl+C）
# 然後重新啟動
pnpm dev
```

---

### 步驟 3：測試 Widget 顯示

1. 訪問 http://localhost:3000/play
2. 檢查是否看到每日任務 Widget（應該在「選擇你的對戰模式」下方）

**預期結果：**
- ✅ Widget 顯示「載入中...」然後加載任務列表
- ✅ 看到 3 個任務（單字特訓、照顧夥伴或勝利滋味、溫故知新）
- ✅ 每個任務顯示進度條和獎勵信息

**如果仍然顯示「載入中...」：**
- 打開 DevTools (F12) → Console 標籤
- 檢查是否有新的錯誤信息
- 檢查 Network 標籤中 `/api/missions/daily` 的響應

---

### 步驟 4：測試進度追蹤

#### 測試 4.1：完成對戰

1. 點擊「系統對戰」或「自訂對戰」
2. 完成一場對戰（不論輸贏）
3. 檢查：
   - ✅ 是否出現 Toast 通知：「任務進度更新」
   - ✅ Widget 中對戰任務進度是否更新（0/2 → 1/2）
   - ✅ 進度條百分比是否變化

#### 測試 4.2：餵食 Chick（如果任務包含）

1. 訪問 Profile 頁面或找到 Chick 餵食功能
2. 餵食一次
3. 檢查：
   - ✅ Toast 通知：「照顧夥伴 +1」
   - ✅ 任務標記為完成（綠色勾選）

#### 測試 4.3：完成所有任務

1. 完成所有 3 個任務
2. 檢查：
   - ✅ Widget 顯示「領取今日獎勵」按鈕（金色閃爍）
   - ✅ 進度條顯示 100%

---

## 🔍 故障排查

### 問題 1：仍然看到 401 錯誤

**原因：** 開發服務器沒有重啟

**解決：**
```bash
# 完全停止服務器
# Ctrl+C 或關閉終端
# 重新啟動
pnpm dev
```

---

### 問題 2：看到「Error generating missions」錯誤

**原因：** 數據庫遷移未執行或執行失敗

**解決：**

1. 在 Supabase Dashboard 執行驗證查詢：
```sql
-- 檢查表
SELECT * FROM information_schema.tables
WHERE table_name = 'daily_missions';

-- 檢查函數
SELECT proname FROM pg_proc
WHERE proname IN ('generate_daily_missions', 'update_mission_progress');
```

2. 如果缺少函數，執行 `026_daily_missions_safe.sql`

---

### 問題 3：看到「onboarding_task_configs does not exist」錯誤

**原因：** 任務生成函數依賴 `onboarding_task_configs` 表

**解決：**

任務生成函數會自動使用默認弱點區域，這不是問題。但如果你想手動創建記錄：

```sql
-- 為 mock user 創建配置（可選）
INSERT INTO onboarding_task_configs (user_id, weak_areas)
VALUES ('e770f9cd-52a7-43de-b983-70f6f78d2f53', ARRAY['vocabulary', 'reading', 'cloze'])
ON CONFLICT (user_id) DO UPDATE
SET weak_areas = EXCLUDED.weak_areas;
```

---

### 問題 4：進度沒有更新

**檢查：**

1. Console 中是否看到 `[Mission Tracker]` 日誌
2. Network 標籤中是否有 `/api/missions/progress` 請求
3. 請求的響應狀態碼（應該是 200）

**如果沒有看到請求：**
- 檢查 `GamifiedMatchResultModal.tsx` 是否正確導入了 `trackMissionEvent`
- 檢查 `chickStore.ts` 餵食後是否調用了 `trackMissionEvent`

---

## 📊 手動測試 API

如果 Widget 仍然有問題，可以在瀏覽器 Console 手動測試 API：

```javascript
// 測試 1：獲取任務
fetch('/api/missions/daily', {
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Daily Missions:', data))
  .catch(err => console.error('Error:', err))

// 測試 2：更新進度
fetch('/api/missions/progress', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ mission_type: 'play_battle', increment: 1 }),
  credentials: 'include'
})
  .then(res => res.json())
  .then(data => console.log('Progress Update:', data))
  .catch(err => console.error('Error:', err))
```

---

## ✨ 成功標誌

當一切正常時，你應該看到：

1. **Widget 正確顯示**
   - 溫暖的米黃色背景
   - 3 個任務卡片
   - 進度條和獎勵預覽

2. **進度即時更新**
   - 完成對戰後立即看到進度更新
   - Toast 通知彈出
   - 進度條動畫

3. **完成獎勵**
   - 所有任務完成後出現金色按鈕
   - 點擊領取後獲得 XP 和金幣

---

## 📝 測試結果反饋

請告訴我：
1. Widget 是否正確顯示？
2. 是否看到任務列表？
3. 完成對戰後進度是否更新？
4. 有任何錯誤信息嗎？（Console 或 Network）

我會根據你的反饋繼續調試！
