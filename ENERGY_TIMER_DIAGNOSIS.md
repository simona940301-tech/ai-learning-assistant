# 🔍 羽毛倒數計時器診斷指南

## 問題現象

**症狀：** 每次刷新頁面或切換頁面，倒數計時器都會重置為 30:00

## 🎯 可能的原因分析

### 原因 1：API 返回的 `energyLastUpdatedAt` 為 null

**診斷方法：**

1. 打開瀏覽器開發者工具（F12）
2. 切換到 **Network** 面板
3. 刷新頁面
4. 找到 `/api/play/user/status` 請求
5. 查看 Response：

```json
{
  "success": true,
  "data": {
    "dailyEnergyCount": 7,
    "energyLastUpdatedAt": "2025-12-03T01:38:21.187054+00:00",  // ← 檢查這個值
    "dailyEnergyResetAt": "2025-12-03T20:00:00+00:00"
  }
}
```

**如果 `energyLastUpdatedAt` 是 `null` 或不存在：**
→ 這就是問題根源！API 沒有返回時間戳

**修復：** 檢查資料庫的 `energy_last_updated_at` 欄位是否有值

---

### 原因 2：資料庫的 `energy_last_updated_at` 一直在變化

**診斷方法：**

在 Supabase Dashboard 執行以下 SQL：

```sql
-- 第一次查詢
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  NOW() as check_time_1
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 記下 energy_last_updated_at 的值

-- 等待 5 秒，刷新瀏覽器頁面

-- 第二次查詢
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  NOW() as check_time_2
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 比較兩次的 energy_last_updated_at
```

**如果兩次查詢的 `energy_last_updated_at` 不同：**
→ API 在錯誤地更新時間戳！

**修復：** 檢查 [status/route.ts](apps/web/app/api/play/user/status/route.ts#L198-L216) 是否有誤

---

### 原因 3：前端計算邏輯錯誤

**診斷方法：**

啟用調試模式：

1. 編輯 [EnergyPill.tsx](apps/web/components/status/EnergyPill.tsx)
2. 將 `useEnergyStatus` 改為 `useEnergyStatusDebug`：

```typescript
// 修改前
import { useEnergyStatus } from '@/lib/hooks/useEnergyStatus'

export function EnergyPill() {
  const { energy, maxEnergy, formattedTime } = useEnergyStatus()
  // ...
}

// 修改後
import { useEnergyStatusDebug } from '@/lib/hooks/useEnergyStatus-debug'

export function EnergyPill() {
  const { energy, maxEnergy, formattedTime } = useEnergyStatusDebug()
  // ...
}
```

3. 打開瀏覽器 Console
4. 刷新頁面
5. 查看詳細的調試輸出

**正常的輸出應該是：**

```
🎯 [useEnergyStatus] UserStatus: {
  energy: 7,
  maxEnergy: 8,
  isFull: false,
  energyLastUpdatedAt: "2025-12-03T01:38:21.187054+00:00"
}

📊 [calculateNextEnergyAt] Calculation: {
  lastUpdated: "2025-12-03T01:38:21.187Z",
  now: "2025-12-03T01:39:00.000Z",
  timeSinceUpdateMinutes: "0.65",
  intervalsPassed: 0,
  nextRecoveryTime: "2025-12-03T02:08:21.187Z",
  remainingMinutes: "29.35"
}

⏱️  [useEnergyStatus] Timer tick: {
  remainingMs: 1761187,
  remainingFormatted: "29:21"
}
```

**如果看到：**
```
⚠️  [calculateNextEnergyAt] No energyLastUpdatedAt, using NOW + 30min
```
→ `energyLastUpdatedAt` 是 undefined 或 null

---

## 🔧 完整診斷流程

### 步驟 1：檢查資料庫狀態

```sql
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  daily_energy_reset_at,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) / 60 as minutes_since_update
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

**預期結果：**
- `daily_energy_count`: 7 或任何非 8 的值
- `energy_last_updated_at`: 有一個時間戳（不是 NULL）
- `minutes_since_update`: 應該是你實際經過的時間

**❌ 如果 `energy_last_updated_at` 是 NULL：**
```sql
-- 修復：設置初始時間戳
UPDATE profiles
SET energy_last_updated_at = NOW() - INTERVAL '1 minute'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

---

### 步驟 2：檢查 API 響應

1. 打開瀏覽器開發者工具
2. Network → `/api/play/user/status`
3. 檢查 Response

**預期的 Response：**
```json
{
  "success": true,
  "data": {
    "dailyEnergyCount": 7,
    "walletBalance": 1000,
    "eloRank": 1000,
    "dailyEnergyResetAt": "2025-12-03T20:00:00+00:00",
    "energyLastUpdatedAt": "2025-12-03T01:38:21.187054+00:00"  // ← 必須存在！
  }
}
```

**❌ 如果 `energyLastUpdatedAt` 缺失或為 null：**
→ 檢查 [status/route.ts](apps/web/app/api/play/user/status/route.ts#L240-L250) 是否正確返回

---

### 步驟 3：檢查前端計算

**啟用調試模式** （見上方「原因 3」）

刷新頁面兩次，觀察 Console 輸出：

**✅ 正確的行為：**
```
// 第一次刷新
nextRecoveryTime: "2025-12-03T02:08:21.187Z"
remainingMinutes: "29.35"

// 第二次刷新（5秒後）
nextRecoveryTime: "2025-12-03T02:08:21.187Z"  // ← 相同！
remainingMinutes: "29.27"                      // ← 減少了
```

**❌ 錯誤的行為：**
```
// 第一次刷新
nextRecoveryTime: "2025-12-03T02:08:21.187Z"
remainingMinutes: "29.35"

// 第二次刷新（5秒後）
nextRecoveryTime: "2025-12-03T02:13:21.187Z"  // ← 改變了！
remainingMinutes: "30.00"                      // ← 重置了
```

---

### 步驟 4：監控時間戳變化

```sql
-- 監控腳本（在 Supabase Dashboard 執行多次）
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  NOW() as current_time,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) as seconds_since_last_update
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

每次刷新頁面後執行一次，觀察 `energy_last_updated_at` 是否改變。

**✅ 正確：** `energy_last_updated_at` 保持不變
**❌ 錯誤：** `energy_last_updated_at` 每次刷新都更新

---

## 🎯 常見問題排查

### Q1: 資料庫有 `energy_last_updated_at` 但 API 返回 null

**原因：** API 可能沒有正確讀取欄位

**檢查：** [status/route.ts:154-161](apps/web/app/api/play/user/status/route.ts#L154-L161)

```typescript
// 確保這段代碼存在
if (hasDailyEnergy) {
  dailyEnergy = profile.daily_energy
  energyLastUpdatedAt = profile.energy_last_updated_at  // ← 必須讀取！
} else if (hasDailyEnergyCount) {
  dailyEnergy = profile.daily_energy_count
  energyLastUpdatedAt = profile.energy_last_updated_at  // ← 必須讀取！
}
```

**檢查 API Response：** [status/route.ts:241-248](apps/web/app/api/play/user/status/route.ts#L241-L248)

```typescript
return Api.success(
  {
    dailyEnergyCount: dailyEnergy,
    walletBalance: profile.coins ?? profile.user_wallet_balance ?? 0,
    eloRank: profile.elo_rank || 1000,
    dailyEnergyResetAt,
    energyLastUpdatedAt: profile.energy_last_updated_at || new Date().toISOString(),  // ← 必須返回！
  },
  Api.withTimestamp()
)
```

---

### Q2: API 返回正確但前端沒有使用

**檢查：** [play-context.tsx:282](apps/web/lib/play-context.tsx#L282)

```typescript
setUserStatus({
  dailyEnergyCount: data.dailyEnergyCount || 0,
  walletBalance: data.walletBalance || 0,
  eloRank: data.eloRank || 1000,
  dailyEnergyResetAt: data.dailyEnergyResetAt,
  energyLastUpdatedAt: data.energyLastUpdatedAt,  // ← 必須設置！
  presetId,
})
```

---

### Q3: 所有檢查都通過但倒數仍然重置

**可能原因：** `play-context` 在每次頁面切換時重新獲取狀態

**診斷：** 在 Console 中執行：

```javascript
// 查看當前狀態
window.__PLAY_CONTEXT_DEBUG = true

// 然後切換頁面，觀察 refreshStatus 被調用的次數
```

**如果 `refreshStatus` 被頻繁調用：**
→ 檢查 `play-context.tsx` 中的 `useEffect` 依賴項

---

## 📊 完整檢查清單

- [ ] 資料庫 `energy_last_updated_at` 有值且不是 NULL
- [ ] API `/api/play/user/status` 返回 `energyLastUpdatedAt`
- [ ] 前端 `userStatus.energyLastUpdatedAt` 有值
- [ ] 刷新頁面時 `energy_last_updated_at` **不改變**
- [ ] 前端計算的 `nextEnergyAt` 保持一致
- [ ] Console 沒有「No energyLastUpdatedAt」警告

---

## 🚑 緊急修復

**如果你需要立即測試，執行以下 SQL：**

```sql
-- 設置一個固定的時間戳（1 分鐘前）
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute',
  daily_energy_reset_at = NOW() + INTERVAL '1 day'
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';

-- 確認設置
SELECT
  daily_energy_count,
  energy_last_updated_at,
  NOW() - energy_last_updated_at as time_diff
FROM profiles
WHERE id = '8b9f3f4c-13c0-4319-9eaa-a5ca55973bcc';
```

然後：
1. 刷新瀏覽器（應該看到倒數約 29:00）
2. 等待 5 秒
3. 再刷新（應該看到倒數約 28:55）

如果這樣測試成功，說明：
- ✅ 前端邏輯正確
- ✅ API 邏輯正確
- ❌ 某個地方在錯誤地更新 `energy_last_updated_at`

---

## 📞 提供診斷結果

請提供以下資訊：

1. **資料庫查詢結果：**
   ```sql
   SELECT * FROM profiles WHERE id = 'your-id';
   ```

2. **API Response（從 Network 面板複製）：**
   ```json
   {
     "success": true,
     "data": { ... }
   }
   ```

3. **Console 輸出（啟用 debug 模式後）：**
   ```
   🎯 [useEnergyStatus] UserStatus: ...
   ```

4. **刷新前後的對比：**
   - 第一次刷新：倒數顯示 ___
   - 第二次刷新：倒數顯示 ___

我會根據這些資訊精確定位問題！
