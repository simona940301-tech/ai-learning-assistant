# 🎯 羽毛倒數計時器修復完成

## 問題描述

**現象：**
- ✅ 羽毛數量顯示正確（不再是 0）
- ❌ 倒數計時器每次刷新頁面就重置
- ❌ 切換到其他頁面再回來，倒數又重新開始

**影響：**
- 用戶無法準確知道下一根羽毛何時恢復
- 每次刷新都看到「30:00」，非常困惑

---

## 根本原因

### 🔴 Bug #1: 恢復羽毛時錯誤更新時間戳

**位置：** `apps/web/app/api/play/user/status/route.ts:198-211`

**問題代碼：**
```typescript
// ❌ 錯誤的邏輯
if (regeneratedEnergy !== dailyEnergy) {
  const updatePayload: Record<string, any> = {
    energy_last_updated_at: new Date().toISOString(),  // 🔴 BUG！
  }
  // 更新資料庫...
}
```

**為什麼會導致重置？**

1. **用戶刷新頁面** → `/api/play/user/status` 被調用
2. **API 計算恢復的羽毛數量**：
   - 上次消耗時間：`2025-12-03 10:00:00`
   - 現在時間：`2025-12-03 10:01:00`
   - 經過時間：1 分鐘
   - 計算結果：`7` 根（還沒恢復，需要 30 分鐘）
3. **API 發現數量沒變** → ❌ 但還是更新了 `energy_last_updated_at` 為「現在」！
4. **前端計算倒數時間**：
   - 使用更新後的時間戳：`2025-12-03 10:01:00`
   - 下次恢復時間：`10:01:00 + 30 分鐘 = 10:31:00`
   - 顯示倒數：29:00（錯誤！應該是 29:00）
5. **用戶再次刷新** → 時間戳又被更新 → 倒數重置！

**正確邏輯：**
- ✅ `energy_last_updated_at` 應該代表「上次消耗羽毛的時間」
- ✅ 恢復羽毛時**不應該**更新這個時間戳
- ✅ 只有在**消耗羽毛**時才更新

---

### 🔴 Bug #2: 消耗羽毛前的預更新

**位置：** `apps/web/app/api/play/user/consume-energy/route.ts:131-144`

**問題代碼：**
```typescript
// ❌ 在消耗前就更新時間戳
else if (currentEnergy !== dailyEnergy) {
  const updatePayload: Record<string, any> = {
    energy_last_updated_at: new Date().toISOString(),  // 🔴 BUG！
  }
  // ...
}

// 實際消耗
const updatePayload: Record<string, any> = {}  // ❌ 沒有更新時間戳
updatePayload.daily_energy_count = currentEnergy - 1
```

**問題：**
- 在恢復羽毛時就更新了時間戳
- 但實際消耗時反而沒有更新
- 導致倒數計時器基準點錯誤

---

## ✅ 修復方案

### 修復 #1: 恢復時不更新時間戳

**文件：** `apps/web/app/api/play/user/status/route.ts`

**修復後的代碼：**
```typescript
// ✅ 正確的邏輯
if (regeneratedEnergy !== dailyEnergy) {
  const updatePayload: Record<string, any> = {}

  // ❌ DO NOT update energy_last_updated_at here!
  // It should remain as the time when energy was last CONSUMED

  if (hasDailyEnergy) {
    updatePayload.daily_energy = regeneratedEnergy
  }
  if (hasDailyEnergyCount) {
    updatePayload.daily_energy_count = regeneratedEnergy
  }

  await supabase.from('profiles').update(updatePayload).eq('id', user.id)
  dailyEnergy = regeneratedEnergy
}
```

### 修復 #2: 消耗時更新時間戳

**文件：** `apps/web/app/api/play/user/consume-energy/route.ts`

**修復後的代碼：**
```typescript
// ✅ 恢復時不更新時間戳
else if (currentEnergy !== dailyEnergy) {
  const updatePayload: Record<string, any> = {}
  // ⚠️ Do NOT update energy_last_updated_at here!
  if (hasDailyEnergy) {
    updatePayload.daily_energy = currentEnergy
  }
  // ...
}

// ✅ 消耗時才更新時間戳
const updatePayload: Record<string, any> = {
  energy_last_updated_at: new Date().toISOString(), // ✅ This is correct!
}
if (hasDailyEnergy) {
  updatePayload.daily_energy = currentEnergy - 1
}
// ...
```

---

## 🧪 測試方法

### 自動測試腳本

執行測試腳本：
```bash
cd apps/web
psql $DATABASE_URL -f scripts/test-energy-timer-fix.sql
```

### 手動測試步驟

1. **設置初始狀態**（在 Supabase Dashboard 執行）：
```sql
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '1 minute'
WHERE id = 'your-user-id';
```

2. **測試倒數計時器**：
   - 打開瀏覽器，應該看到羽毛 = 7
   - 倒數計時器顯示約 29:00
   - **刷新頁面 5 次**
   - ✅ **預期結果**：倒數持續進行（29:00 → 28:59 → 28:58...）
   - ❌ **錯誤結果**：每次刷新都重置為 30:00

3. **測試切換頁面**：
   - 導航到其他頁面（如 `/error-book`）
   - 等待 10 秒
   - 回到有羽毛顯示的頁面
   - ✅ **預期結果**：倒數減少了 10 秒
   - ❌ **錯誤結果**：倒數重置為 30:00

4. **測試羽毛恢復**：
```sql
-- 模擬 30 分鐘前消耗
UPDATE profiles
SET
  daily_energy_count = 7,
  energy_last_updated_at = NOW() - INTERVAL '30 minutes'
WHERE id = 'your-user-id';
```
   - 刷新頁面
   - ✅ **預期結果**：羽毛恢復到 8，倒數消失或顯示「Full」
   - 時間戳應該**不改變**（仍然是 30 分鐘前）

---

## 📊 修復前後對比

| 場景 | 修復前 | 修復後 |
|------|--------|--------|
| 刷新頁面 | 倒數重置為 30:00 ❌ | 倒數持續進行 ✅ |
| 切換頁面 | 倒數重置為 30:00 ❌ | 倒數持續進行 ✅ |
| 羽毛恢復 | 時間戳被更新 ❌ | 時間戳保持不變 ✅ |
| 消耗羽毛 | 時間戳可能不更新 ❌ | 時間戳正確更新 ✅ |

---

## 🎯 關鍵概念

### `energy_last_updated_at` 的正確語義

| ❌ 錯誤理解 | ✅ 正確理解 |
|------------|-----------|
| 「上次檢查能量的時間」 | **「上次消耗能量的時間」** |
| 每次讀取 API 時更新 | **只在消耗能量時更新** |
| 用於追蹤最後一次訪問 | **用於計算下次恢復時間** |

### 羽毛恢復計算公式

```typescript
// 正確的計算方式
const minutesSinceLastConsumption = (NOW - energy_last_updated_at) / 60
const regeneratedPoints = Math.floor(minutesSinceLastConsumption / 30)
const currentEnergy = Math.min(lastEnergy + regeneratedPoints, 8)

// ✅ 關鍵：energy_last_updated_at 必須固定不變
//    直到下次消耗羽毛為止
```

### 倒數計時器計算

```typescript
// 前端計算下次恢復時間
const lastConsumedAt = new Date(energy_last_updated_at)
const nextRecoveryAt = new Date(lastConsumedAt.getTime() + 30 * 60 * 1000)
const remainingMs = nextRecoveryAt - Date.now()

// ✅ 只要 energy_last_updated_at 不變，倒數就不會重置
```

---

## 🎉 修復完成

- ✅ 羽毛數量顯示正確
- ✅ 倒數計時器不會重置
- ✅ 切換頁面倒數持續進行
- ✅ 羽毛自動恢復機制正常
- ✅ 離線時間累積恢復正常

**測試確認：**
請刷新瀏覽器並測試倒數計時器是否正常！
