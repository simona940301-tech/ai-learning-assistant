# 🔧 羽毛倒數計時器最終修復指南

## 🎯 問題確認

根據 Console 輸出，問題非常明確：

```javascript
energyLastUpdatedAt: undefined  // ❌ API 沒有返回這個值
energy: 0                        // ⚠️  羽毛數量也是 0
```

---

## ✅ 立即修復步驟

### 步驟 1：在 Supabase Dashboard 執行 SQL

**打開 Supabase Dashboard → SQL Editor → 執行以下 SQL：**

```sql
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
  daily_energy_count,
  energy_last_updated_at,
  daily_energy_reset_at
FROM profiles
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';
```

**預期結果：**
- `daily_energy_count`: 7
- `energy_last_updated_at`: 有一個時間戳（約 1 分鐘前）
- `daily_energy_reset_at`: 有一個時間戳（約 1 天後）

---

### 步驟 2：刷新瀏覽器

執行 SQL 後，**立即刷新瀏覽器**。

---

### 步驟 3：檢查 Console 輸出

刷新後，在 Console 中你應該會看到：

```javascript
🔍 [useEnergyStatus] Current state: {
  energy: 7,                                              // ✅ 不再是 0
  energyLastUpdatedAt: "2025-12-03T02:XX:XX.XXXXXX+00:00" // ✅ 有值了！
}

🔄 [useEnergyStatus] Recalculating nextEnergyAt with: {
  energy: 7,
  energyLastUpdatedAt: "2025-12-03T02:XX:XX.XXXXXX+00:00"
}
```

---

### 步驟 4：驗證倒數計時器

1. **第一次刷新**：應該看到倒數約 **29:00**
2. **等待 5 秒**
3. **第二次刷新**：應該看到倒數約 **28:55** ✅

**如果倒數持續減少而不重置 → 修復成功！**

---

## 🔍 如果還是不行

### 檢查點 1：API Response

1. 打開開發者工具（F12）
2. 切換到 **Network** 面板
3. 刷新頁面
4. 找到 `/api/play/user/status` 請求
5. 查看 **Response** 標籤

**應該看到：**
```json
{
  "success": true,
  "data": {
    "dailyEnergyCount": 7,
    "energyLastUpdatedAt": "2025-12-03T02:XX:XX.XXXXXX+00:00",  // ← 必須有這個！
    "dailyEnergyResetAt": "2025-12-03T20:00:00+00:00"
  }
}
```

**如果 `energyLastUpdatedAt` 仍然缺失或為 null：**
→ API 沒有正確返回，需要檢查後端代碼

---

### 檢查點 2：資料庫值

在 Supabase Dashboard 再次執行：

```sql
SELECT
  id,
  daily_energy_count,
  energy_last_updated_at,
  daily_energy_reset_at,
  EXTRACT(EPOCH FROM (NOW() - energy_last_updated_at)) / 60 as minutes_since_update
FROM profiles
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';
```

**確認：**
- ✅ `energy_last_updated_at` 不是 NULL
- ✅ `daily_energy_count` 不是 0
- ✅ `minutes_since_update` 是一個合理的數字（1-2 分鐘）

---

### 檢查點 3：前端接收到的值

在 Console 中執行：

```javascript
// 檢查 userStatus
window.__DEBUG_ENERGY = true;

// 然後刷新頁面，觀察輸出
```

---

## 🐛 可能的額外問題

### 問題 1：API 沒有返回 `energyLastUpdatedAt`

**檢查：** [status/route.ts:241-248](apps/web/app/api/play/user/status/route.ts#L241-L248)

確認 API 返回時包含這個欄位：

```typescript
return Api.success(
  {
    dailyEnergyCount: dailyEnergy,
    walletBalance: profile.coins ?? profile.user_wallet_balance ?? 0,
    eloRank: profile.elo_rank || 1000,
    dailyEnergyResetAt,
    energyLastUpdatedAt: energyLastUpdatedAt,  // ← 確認這行存在！
  },
  Api.withTimestamp()
)
```

---

### 問題 2：前端沒有正確設置 `userStatus`

**檢查：** [play-context.tsx:277-284](apps/web/lib/play-context.tsx#L277-L284)

確認前端正確接收：

```typescript
setUserStatus({
  dailyEnergyCount: data.dailyEnergyCount || 0,
  walletBalance: data.walletBalance || 0,
  eloRank: data.eloRank || 1000,
  dailyEnergyResetAt: data.dailyEnergyResetAt,
  energyLastUpdatedAt: data.energyLastUpdatedAt,  // ← 確認這行存在！
  presetId,
})
```

---

### 問題 3：每次刷新 API 都被調用多次

從 Console 看到很多重複的 `🔍 [useEnergyStatus]` 輸出，說明組件被多次渲染。

這可能導致 `userStatus` 對象引用不斷變化，觸發 `useMemo` 重新計算。

**臨時解決方案：** 移除 `console.log`，減少輸出混亂

---

## 📊 修復確認清單

執行完 SQL 並刷新瀏覽器後，確認以下各項：

- [ ] Console 中 `energyLastUpdatedAt` 不再是 `undefined`
- [ ] Console 中 `energy` 不再是 `0`
- [ ] 倒數計時器顯示約 29:00
- [ ] 刷新頁面時倒數持續減少（不重置）
- [ ] Network 面板中 API 返回 `energyLastUpdatedAt`
- [ ] 資料庫中 `energy_last_updated_at` 不是 NULL

---

## 🎯 最終驗證

**完整測試流程：**

1. 執行 SQL 設置羽毛為 7，時間戳為 1 分鐘前
2. 刷新瀏覽器，記錄倒數時間（例如：29:05）
3. 等待 10 秒
4. 再次刷新，確認倒數減少了 10 秒（28:55）
5. 切換到其他頁面（如 `/error-book`）
6. 等待 5 秒
7. 切回來，確認倒數又減少了 5 秒（28:50）

**如果以上測試全部通過 → 修復完成！** 🎉

---

## 🆘 如果仍然失敗

請提供以下資訊：

1. **SQL 查詢結果**（上面的 SELECT 語句）
2. **API Response**（從 Network 面板複製完整 JSON）
3. **Console 輸出**（刷新後的前 20 行）
4. **倒數顯示的值**（刷新前後的對比）

我會根據這些資訊進一步診斷！
