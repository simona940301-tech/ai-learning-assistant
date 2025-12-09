# 🔧 前端功能顯示問題修復總結

## 問題診斷

您在前端看不到新實作的功能，主要原因：

1. ✅ **Store 資料來源不一致** - 已修復
   - 之前：從 `/api/profile` 獲取 `chick_hunger` 等欄位
   - 現在：統一從 `/api/chick/status` 獲取所有資料

2. ✅ **API 返回資料不完整** - 已修復
   - `/api/chick/status` 現在返回所有必要欄位，包括探索資料

3. ⚠️ **需要確認 Migration 已執行**

---

## 已修復的內容

### 1. Store 更新 (`chickStore.ts`)

**修改前**:
```typescript
// 從多個 API 獲取資料
const [chickData, progressionData, profileData] = await Promise.all([
  fetchJson('/api/chick/status'),  // 不包含 hunger, foodBowlsCount
  fetchJson('/api/play/progression/status'),
  fetchJson('/api/profile'),  // 獲取 hunger, foodBowlsCount
])
```

**修改後**:
```typescript
// 統一從 /api/chick/status 獲取所有資料
const [chickData, progressionData] = await Promise.all([
  fetchJson('/api/chick/status'),  // 包含所有欄位
  fetchJson('/api/play/progression/status'),
])
```

### 2. API 更新 (`/api/chick/status`)

**新增返回欄位**:
- `explorationStartAt` - 探索開始時間
- `explorationAllowance` - 探索零用錢

**現在返回的完整資料**:
```json
{
  "hunger": 50,
  "intimacy": 0,
  "foodBowlsCount": 0,
  "explorationStartAt": null,
  "explorationAllowance": 0,
  "isWellFed": false,
  "wellFedExpiresAt": null,
  ...
}
```

---

## 🔍 排查步驟

### Step 1: 確認 Migration 已執行

在 Supabase SQL Editor 中執行：

```sql
-- 檢查欄位是否存在
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'chick_hunger',
  'chick_intimacy',
  'food_bowls_count',
  'chick_hunger_last_updated_at',
  'chick_last_fed_at',
  'chick_exploration_start_at',
  'chick_exploration_allowance'
);
```

**預期結果**: 應該返回所有 7 個欄位

### Step 2: 檢查 API 響應

打開瀏覽器開發者工具（F12）→ Network 標籤：

1. 點擊 Chick 頭像
2. 找到 `/api/chick/status` 請求
3. 檢查響應內容

**預期響應**:
```json
{
  "hunger": 50,
  "intimacy": 0,
  "foodBowlsCount": 0,
  "explorationStartAt": null,
  "explorationAllowance": 0,
  ...
}
```

### Step 3: 檢查 Store 狀態

在瀏覽器 Console 中執行：

```javascript
// 如果使用 React DevTools
// 檢查 useChickStore 的狀態

// 或添加臨時 console.log
// 在 ChickInteractionModal.tsx 中添加：
console.log('Chick Store State:', {
  hunger,
  foodBowlsCount,
  explorationStartAt
})
```

### Step 4: 檢查 UI 渲染

確認以下元素是否顯示：

1. ✅ 飢餓度進度條（0-100%）
2. ✅ 食物碗數量顯示
3. ✅ 「如何獲得食物碗？」說明卡片
4. ✅ 飽足/飢餓狀態提示（如果符合條件）

---

## 🐛 常見問題與解決

### 問題 1: 所有數值都是 0 或預設值

**原因**: Migration 未執行或欄位未初始化

**解決**:
```sql
-- 初始化現有用戶的資料
UPDATE profiles
SET 
  chick_hunger = 50,
  chick_intimacy = 0,
  food_bowls_count = 0,
  chick_hunger_last_updated_at = NOW()
WHERE chick_hunger IS NULL;
```

### 問題 2: API 返回 500 錯誤

**檢查**:
1. 瀏覽器 Console 的錯誤訊息
2. 後端日誌（終端或 Supabase Logs）
3. 確認 Migration 已執行

**常見錯誤**:
- `column "chick_hunger" does not exist` → Migration 未執行
- `relation "battle_progression_state" does not exist` → Migration 未執行

### 問題 3: UI 不更新

**檢查**:
1. 確認 `fetchStatus()` 被調用
2. 確認 Store 狀態正確更新
3. 檢查 React DevTools 中的組件狀態

**解決**:
- 強制重新整理頁面（Ctrl+Shift+R 或 Cmd+Shift+R）
- 清除瀏覽器緩存
- 確認沒有 JavaScript 錯誤

---

## ✅ 驗證清單

請確認以下項目：

- [ ] Migration `025_chick_hunger_system.sql` 已執行
- [ ] 資料庫欄位存在（見 Step 1）
- [ ] API `/api/chick/status` 返回正確資料（見 Step 2）
- [ ] Store 狀態正確（見 Step 3）
- [ ] UI 正確顯示（見 Step 4）
- [ ] 瀏覽器 Console 無錯誤
- [ ] Network 請求成功（200 狀態碼）

---

## 🚀 快速測試

### 測試 1: 手動設置測試資料

```sql
-- 設置測試資料
UPDATE profiles
SET 
  chick_hunger = 25,  -- 飽足狀態（< 30）
  food_bowls_count = 5,
  chick_intimacy = 100
WHERE id = 'your-user-id';
```

**預期結果**:
- 飢餓度顯示 25%
- 食物碗顯示 5
- 顯示綠色「飽足狀態」提示

### 測試 2: 測試餵食功能

1. 確保有食物碗（`food_bowls_count > 0`）
2. 點擊 Chick 頭像
3. 點擊 "Feed" 按鈕
4. 檢查：
   - 飢餓度減少 20
   - 食物碗減少 1
   - 親密度增加 5

### 測試 3: 測試對戰獎勵

1. 完成一場對戰（勝利）
2. 檢查食物碗是否增加 3
3. 檢查飢餓度是否增加 15

---

## 📝 如果問題持續

請提供以下資訊：

1. **瀏覽器 Console 錯誤**（截圖或文字）
2. **Network 請求響應**（`/api/chick/status` 的響應內容）
3. **資料庫查詢結果**（Step 1 的 SQL 查詢結果）
4. **Store 狀態**（React DevTools 中的狀態）

---

**修復完成日期**: 2025-01-XX  
**下一步**: 確認 Migration 已執行，然後測試功能











































