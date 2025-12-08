# 🔍 前端功能顯示問題排查指南

## 問題：前端看不到新實作的功能

### 可能原因與解決方案

#### 1. ✅ Store 已更新
- **檔案**: `apps/web/src/store/chickStore.ts`
- **狀態**: ✅ 已更新為從 `/api/chick/status` 獲取資料
- **檢查**: Store 現在會正確獲取 `hunger`, `intimacy`, `foodBowlsCount` 等欄位

#### 2. ✅ API 已更新
- **檔案**: `apps/web/app/api/chick/status/route.ts`
- **狀態**: ✅ 已返回所有必要欄位
- **返回欄位**:
  - `hunger`
  - `intimacy`
  - `foodBowlsCount`
  - `isWellFed`
  - `wellFedExpiresAt`

#### 3. ✅ UI 組件已更新
- **檔案**: `apps/web/components/chick/ChickInteractionModal.tsx`
- **狀態**: ✅ 已移除購買按鈕，新增狀態提示

---

## 🔧 排查步驟

### Step 1: 檢查瀏覽器 Console

打開瀏覽器開發者工具（F12），檢查是否有錯誤：

```javascript
// 應該看到這些 API 調用
GET /api/chick/status
GET /api/play/progression/status
```

**常見錯誤**:
- `404 Not Found` → API 路由不存在
- `500 Internal Server Error` → 後端錯誤
- `CORS Error` → 跨域問題

### Step 2: 檢查 Network 請求

1. 打開 Network 標籤
2. 點擊 Chick 頭像
3. 檢查 `/api/chick/status` 請求的響應

**預期響應**:
```json
{
  "iq": 0,
  "fatigue": 0,
  "emotionState": "normal",
  "messagesUnreadCount": 0,
  "hunger": 50,
  "intimacy": 0,
  "foodBowlsCount": 0,
  "evolutionStage": 0,
  "evolutionVariant": "default",
  "isWellFed": false,
  "wellFedExpiresAt": null
}
```

### Step 3: 檢查 Store 狀態

在瀏覽器 Console 中執行：

```javascript
// 如果使用 React DevTools
// 檢查 useChickStore 的狀態

// 或直接在組件中添加 console.log
console.log('Chick Store:', useChickStore.getState())
```

### Step 4: 檢查資料庫 Migration

確認 Migration 已執行：

```sql
-- 在 Supabase SQL Editor 中執行
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'chick_hunger',
  'chick_intimacy', 
  'food_bowls_count',
  'chick_hunger_last_updated_at',
  'chick_last_fed_at'
);
```

應該返回所有欄位名稱。

---

## 🐛 常見問題

### 問題 1: 飢餓度一直顯示 50

**原因**: Migration 未執行或欄位未初始化

**解決**:
```sql
-- 檢查欄位是否存在
SELECT chick_hunger, chick_hunger_last_updated_at 
FROM profiles 
WHERE id = 'your-user-id';

-- 如果為 NULL，初始化
UPDATE profiles 
SET 
  chick_hunger = 50,
  chick_hunger_last_updated_at = NOW()
WHERE chick_hunger IS NULL;
```

### 問題 2: 食物碗數量不更新

**原因**: API 未正確返回或 Store 未更新

**檢查**:
1. 檢查 `/api/chick/status` 響應中的 `foodBowlsCount`
2. 檢查 Store 中的 `foodBowlsCount` 值
3. 確認 `fetchStatus()` 被正確調用

### 問題 3: 狀態提示不顯示

**原因**: 條件判斷錯誤或樣式問題

**檢查**:
- 飽足狀態：`hunger < 30`
- 飢餓狀態：`hunger > 80`
- 確認 `hunger` 值正確傳遞到組件

---

## ✅ 驗證清單

- [ ] Migration 已執行（`025_chick_hunger_system.sql`）
- [ ] API `/api/chick/status` 返回正確資料
- [ ] Store 正確更新狀態
- [ ] UI 組件正確顯示資料
- [ ] 瀏覽器 Console 無錯誤
- [ ] Network 請求成功

---

## 🚀 快速測試

### 測試 1: 檢查 API

```bash
# 在終端執行（需要登入 cookie）
curl http://localhost:3000/api/chick/status \
  -H "Cookie: your-session-cookie"
```

### 測試 2: 手動更新資料庫

```sql
-- 設置測試資料
UPDATE profiles 
SET 
  chick_hunger = 25,  -- 飽足狀態
  food_bowls_count = 5,
  chick_intimacy = 100
WHERE id = 'your-user-id';

-- 重新整理頁面，應該看到：
-- - 飽足狀態提示（綠色）
-- - 5 個食物碗
```

### 測試 3: 測試餵食功能

1. 確保有食物碗（`food_bowls_count > 0`）
2. 點擊 Chick 頭像
3. 點擊 "Feed" 按鈕
4. 檢查：
   - 飢餓度減少 20
   - 食物碗減少 1
   - 親密度增加 5

---

## 📝 下一步

如果以上都正常，但功能仍不顯示，請檢查：

1. **組件是否正確渲染**
   - 檢查 `ChickInteractionModal` 是否被調用
   - 檢查 `isOpen` 狀態

2. **樣式是否正確**
   - 檢查 Tailwind CSS 是否正確編譯
   - 檢查是否有樣式衝突

3. **資料流是否正確**
   - Store → Component → UI
   - 確認資料正確傳遞

---

**如果問題持續，請提供**:
1. 瀏覽器 Console 錯誤訊息
2. Network 請求的響應內容
3. Store 的當前狀態
4. 資料庫中的實際資料









































