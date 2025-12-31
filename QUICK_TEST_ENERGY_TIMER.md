# 🧪 快速測試：羽毛倒數計時器

## 方法 1：在 Supabase Dashboard 測試（推薦）

### 步驟 1：設置測試狀態

在 Supabase Dashboard 的 SQL Editor 執行：

```sql
-- 設置：1 分鐘前消耗羽毛（從 8 → 7）
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 確認設置成功
SELECT
  daily_energy_count,
  energy_last_updated_at,
  calculate_current_energy(daily_energy_count, energy_last_updated_at, 8, 30) as should_be_7
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

### 步驟 2：測試倒數計時器

1. **刷新瀏覽器** → 應該看到：
   - 羽毛數量：7
   - 倒數計時器：約 29:00

2. **等待 5 秒**

3. **再次刷新瀏覽器** → 應該看到：
   - 羽毛數量：7（不變）
   - 倒數計時器：約 28:55（減少了 5 秒）✅

4. **重複刷新 3-5 次**：
   - ✅ **正確**：倒數持續減少（28:50 → 28:45 → 28:40...）
   - ❌ **錯誤**：每次都重置為 30:00

---

## 方法 2：測試羽毛恢復

### 步驟 1：模擬 30 分鐘前消耗

```sql
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '30 minutes'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

### 步驟 2：刷新瀏覽器

應該看到：
- 羽毛數量：8（恢復了 1 根）✅
- 倒數計時器：消失或顯示下一次恢復時間

### 步驟 3：再次刷新

- ✅ **正確**：羽毛仍然是 8，時間戳不變
- ❌ **錯誤**：羽毛數量變化，時間戳被更新

---

## 方法 3：測試切換頁面

### 步驟 1：設置狀態

```sql
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

### 步驟 2：觀察倒數

1. 刷新瀏覽器，記住倒數時間（例如：29:00）
2. 導航到錯題本頁面（`/error-book`）
3. 等待 10 秒
4. 回到首頁或對戰頁面
5. 檢查倒數時間

**預期結果：**
- ✅ 倒數應該減少了 10 秒（28:50）
- ❌ 倒數重置為 30:00

---

## 🎯 驗證修復成功的標準

### ✅ 修復成功的表現

1. **倒數穩定**：
   - 刷新頁面 5 次，倒數持續減少
   - 不會突然重置為 30:00

2. **切換頁面正常**：
   - 離開頁面再回來，倒數繼續進行
   - 時間與實際經過時間一致

3. **羽毛恢復正確**：
   - 30 分鐘後自動恢復 1 根
   - 恢復後時間戳不改變

### ❌ 仍有問題的表現

1. **倒數重置**：
   - 每次刷新都回到 30:00
   - 切換頁面後倒數重置

2. **時間戳異常**：
   - 查詢資料庫發現 `energy_last_updated_at` 不斷變化
   - 即使沒有消耗羽毛

---

## 🔍 深度診斷（如果問題仍存在）

### 檢查時間戳是否在變化

```sql
-- 第一次查詢
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  NOW() as current_time
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 記下 energy_last_updated_at

-- 刷新瀏覽器頁面

-- 第二次查詢（5 秒後）
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  NOW() as current_time
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 比較兩次的 energy_last_updated_at
```

**預期結果：**
- ✅ `energy_last_updated_at` **不應該改變**（除非你消耗了羽毛）
- ❌ 如果每次刷新都變化，說明 API 仍在錯誤地更新它

---

## 📊 參考：正確的時間戳行為

| 操作 | `energy_last_updated_at` 應該 |
|------|------------------------------|
| 刷新頁面 | 不變 ✅ |
| 切換頁面 | 不變 ✅ |
| 羽毛自動恢復 | 不變 ✅ |
| **消耗羽毛** | **更新為現在** ✅ |
| 每日重置 | 更新為重置時間 ✅ |

---

## 🚨 如果測試失敗

如果倒數計時器仍然重置，請提供以下資訊：

1. **前端顯示**：
   - 羽毛數量是多少？
   - 倒數顯示什麼？
   - 刷新後倒數變成多少？

2. **資料庫狀態**（執行上面的 SQL）：
   - `daily_energy_count` 的值
   - `energy_last_updated_at` 的值
   - 刷新前後是否變化

3. **瀏覽器控制台**：
   - 是否有 API 錯誤？
   - Network 面板中 `/api/play/user/status` 的回應是什麼？

我會根據這些資訊進一步診斷！
