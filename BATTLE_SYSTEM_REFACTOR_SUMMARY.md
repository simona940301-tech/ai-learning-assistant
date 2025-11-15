# 🎮 對戰系統重構完成總結

## ✅ 已完成項目

### 1. 資料庫 Schema 擴展
- ✅ 新增 `elo_rank` 欄位（預設 1000）
- ✅ 新增 `daily_energy` 欄位（預設 8，每日重置）
- ✅ 新增 `daily_energy_reset_at` 欄位（UTC+8 04:00 重置）
- ✅ 建立索引優化查詢效能

### 2. API 端點
- ✅ `GET /api/play/user/status` - 獲取用戶狀態（含 lazy-reset dailyEnergy）
- ✅ `POST /api/play/user/consume-energy` - 消耗每日體力
- ✅ `POST /api/play/battle/update-elo` - 更新 Elo 排名（Rust 伺服器調用）

### 3. Rust 伺服器整合
- ✅ Elo 計算模組 (`elo.rs`) - 標準 Elo 公式，K-factor = 32
- ✅ Elo API 客戶端 (`elo_api_client.rs`) - 對戰結束時調用更新 API
- ✅ 對戰結束流程整合 - PVP 對戰結束時自動更新 Elo

### 4. DDA 系統
- ✅ DDA 平滑調整機制已存在 (`dda.rs`)
- ✅ EWMA 平滑平均
- ✅ 難度分級（Low/Target/High）
- ✅ 前端可接收 DDA 調整後的題目難度

## 📋 架構設計

### Elo 系統流程
```
對戰結束 (Rust Server)
  ↓
計算 Elo 變化（基於分數）
  ↓
調用 /api/play/battle/update-elo
  ↓
API 從 DB 獲取實際 Elo
  ↓
計算新 Elo（標準公式）
  ↓
更新 DB + 發放金幣獎勵
```

### Daily Energy 流程
```
用戶請求狀態
  ↓
檢查 daily_energy_reset_at
  ↓
如果已過期 → 重置為 8，更新 reset_at
  ↓
返回當前 dailyEnergy
```

### DDA 流程
```
每題答題後
  ↓
更新 EWMA（平滑平均）
  ↓
判斷難度區間（Low/Target/High）
  ↓
限制切換次數（每場最多 2 次）
  ↓
調整下一題難度係數（0.9 / 1.0 / 1.1）
```

## 🔧 技術細節

### Elo 計算公式
```typescript
expectedScore = 1 / (1 + 10^((opponentElo - playerElo) / 400))
eloDiff = K_FACTOR * (actualScore - expectedScore)
newElo = oldElo + eloDiff
```

### Daily Energy Reset
- 重置時間：UTC+8 04:00（台灣時間）
- 重置邏輯：Lazy-reset（讀取時檢查）
- 重置數量：8 點

### DDA 參數
- EWMA Alpha: 0.6
- 目標勝率區間：55% - 65%
- 難度係數：Low (0.9), Target (1.0), High (1.1)
- 每場最多切換：2 次

## 🎨 UI/UX 待優化項目

### 遊戲頁面 (`/play`)
- [ ] 極簡設計重構
- [ ] Tailwind v4 樣式更新
- [ ] Elo 顯示整合
- [ ] Daily Energy 視覺優化
- [ ] 對戰結果頁面優化

## 📝 注意事項

1. **Elo 更新**：僅 PVP 對戰會更新 Elo，PVE 對戰不影響排名
2. **Daily Energy**：排位對戰會消耗體力，純練習模式可選擇不消耗
3. **DDA**：難度調整是平滑的，不會突然跳躍
4. **API URL**：Rust 伺服器預設連接到 `http://localhost:3000`，生產環境需配置環境變數

## 🚀 下一步

1. 執行資料庫 migration
2. 測試 Elo 更新流程
3. 測試 Daily Energy 重置邏輯
4. UI/UX 優化（Tailwind v4）
5. 前端整合 Elo 顯示

