# 🐣 Chick 知識餵食系統實作總結

> **實作日期**: 2025-01-XX  
> **狀態**: ✅ Phase 1 核心功能完成

---

## 📋 實作內容

### ✅ 1. 核心機制實作

#### 1.1 飢餓度管理系統

**檔案**: `apps/web/lib/chick/hunger.ts`

**功能**:
- ✅ `updateHungerOverTime()` - 時間驅動的飢餓度增長（每小時 +5 點）
- ✅ `increaseHungerFromActivity()` - 活動驅動的飢餓度增長
- ✅ `checkAndApplyWellFedBuff()` - 檢查並應用飽足狀態 Buff
- ✅ `isHungry()` / `isWellFed()` - 狀態判斷函數

**機制**:
- 基礎時間衰減：每小時 +5 點
- 對戰活動：每次 +15 點
- 任務活動：每次 +10 點
- 錯題複習：每題 +2 點

#### 1.2 食物碗獎勵系統

**檔案**: `apps/web/lib/chick/rewards.ts`

**功能**:
- ✅ `addFoodBowls()` - 增加食物碗數量
- ✅ `grantBattleFoodReward()` - 對戰獎勵（勝利 +3，失敗 +1）
- ✅ `grantMissionFoodReward()` - 任務獎勵（+5）
- ✅ `grantErrorReviewFoodReward()` - 錯題複習獎勵（每 5 題 +1）

---

### ✅ 2. API 端點修改

#### 2.1 `/api/chick/status` (GET)

**修改內容**:
- ✅ 加入飢餓度時間更新邏輯
- ✅ 檢查並應用飽足狀態 Buff
- ✅ 返回 `hunger`, `intimacy`, `foodBowlsCount`, `isWellFed` 等欄位

#### 2.2 `/api/play/progression/apply-battle` (POST)

**修改內容**:
- ✅ 對戰後增加飢餓度 +15 點
- ✅ 根據勝負給予食物碗（勝利 +3，失敗 +1）
- ✅ 檢查飽足狀態，應用 XP +10% Buff

#### 2.3 `/api/missions/complete` (POST)

**修改內容**:
- ✅ 完成任務後增加飢餓度 +10 點
- ✅ 給予食物碗獎勵 +5 碗

#### 2.4 `/api/chick/feed` (POST)

**修改內容**:
- ✅ 記錄最後餵食時間 (`chick_last_fed_at`)
- ✅ 更新飢餓度最後更新時間

#### 2.5 `/api/chick/review-progress` (NEW)

**功能**:
- ✅ POST - 追蹤錯題複習進度，每 5 題給予 1 碗
- ✅ GET - 獲取當前複習進度

---

### ✅ 3. 資料庫 Migration

**檔案**: `apps/web/db/sql/025_chick_hunger_system.sql`

**新增欄位**:
- ✅ `profiles.chick_hunger_last_updated_at` - 飢餓度最後更新時間
- ✅ `profiles.chick_last_fed_at` - 最後餵食時間
- ✅ `battle_progression_state.chick_well_fed_expires_at` - 飽足狀態過期時間

**新增表**:
- ✅ `chick_error_review_progress` - 錯題複習進度追蹤
- ✅ `chick_skill_usage` - 技能使用記錄（為未來功能預留）

---

### ✅ 4. UI/UX 優化

#### 4.1 ChickInteractionModal 更新

**改進**:
- ✅ 移除購買按鈕
- ✅ 新增「如何獲得食物碗」說明卡片
- ✅ 新增飽足狀態視覺提示（綠色光環 + 說明）
- ✅ 新增飢餓狀態警告提示（紅色閃爍 + 說明）

**視覺效果**:
- 飽足狀態：綠色邊框 + Sparkles 圖標 + "對戰 XP +10%，金幣 +10%" 提示
- 飢餓狀態：紅色邊框 + AlertTriangle 圖標 + 脈衝動畫 + "無法使用戰鬥技能" 警告

---

## 📊 設計平衡性

### 飢餓度增長計算

**活躍玩家**（每天 3 場對戰 + 1 任務 + 5 題錯題）:
```
時間: 24h × 5 = +120
對戰: 3 × 15 = +45
任務: 1 × 10 = +10
錯題: 5 × 2 = +10
總計: +185 點 → 需要 9-10 碗
```

**可獲得**:
```
對戰: 3 × 3 + 1 = 10 碗
任務: +5 碗
錯題: +1 碗
總計: 16 碗（足夠）
```

**輕度玩家**（每天 1 場對戰 + 1 任務）:
```
時間: +120
對戰: +15
任務: +10
總計: +145 點 → 需要 7-8 碗
```

**可獲得**:
```
對戰: 1 × 3 = 3 碗
任務: +5 碗
總計: 8 碗（剛好）
```

---

## 🎯 狀態影響

### 飽足狀態 (hunger < 30)

**效果**:
- ✅ 對戰 XP +10%
- ✅ 對戰金幣 +10%
- ✅ 可以使用所有戰鬥技能
- ✅ 視覺：綠色光環效果

**持續時間**: 1 小時（自動過期）

### 正常狀態 (30 ≤ hunger ≤ 80)

**效果**:
- ✅ 正常表現
- ✅ 可以使用戰鬥技能（需滿足其他條件）

### 飢餓狀態 (hunger > 80)

**效果**:
- ❌ 無法使用戰鬥技能
- ❌ 主畫面顯示虛弱動畫
- ⚠️ 視覺：紅色警告 + 脈衝動畫

---

## 🔄 整合點

### 需要整合的地方

1. **錯題複習頁面**:
   - 在用戶複習錯題時，調用 `/api/chick/review-progress`
   - 顯示「已複習 X/5 題，再複習 Y 題可獲得 1 碗食物」

2. **對戰結算頁面**:
   - 顯示獲得的食物碗數量
   - 如果處於飽足狀態，顯示 Buff 效果

3. **每日任務頁面**:
   - 完成任務時顯示獲得的食物碗數量

---

## 📝 待完成項目

### Phase 2: 戰鬥助手功能
- [ ] 在 `BattleQuestionV3` 中整合 Chick 顯示
- [ ] 實作答題反應動畫
- [ ] 實作 SOS 技能（50/50）
- [ ] 實作時間凍結技能

### Phase 3: 探險優化
- [ ] 實作自動探險觸發
- [ ] 實作錯題回歸機制
- [ ] 實作冷知識卡片

### Phase 4: 作息系統
- [ ] 實作時間判斷邏輯
- [ ] 實作陪讀模式
- [ ] 新增睡眠/陪讀圖片

### Phase 5: 進化外觀
- [ ] 設計不同階段的圖片
- [ ] 更新 `chickImage.ts`
- [ ] 實作進化動畫

---

## 🧪 測試建議

### 功能測試

1. **飢餓度更新**:
   ```bash
   # 1. 記錄當前飢餓度
   # 2. 等待 1 小時
   # 3. 調用 /api/chick/status
   # 4. 確認飢餓度增加 5 點
   ```

2. **對戰獎勵**:
   ```bash
   # 1. 記錄當前食物碗數量
   # 2. 完成一場對戰（勝利）
   # 3. 確認獲得 +3 碗
   # 4. 完成一場對戰（失敗）
   # 5. 確認獲得 +1 碗
   ```

3. **任務獎勵**:
   ```bash
   # 1. 記錄當前食物碗數量
   # 2. 完成每日任務
   # 3. 確認獲得 +5 碗
   ```

4. **錯題複習**:
   ```bash
   # 1. 記錄當前食物碗數量
   # 2. 複習 5 題錯題
   # 3. 確認獲得 +1 碗
   ```

5. **飽足狀態 Buff**:
   ```bash
   # 1. 將飢餓度調整為 < 30
   # 2. 完成一場對戰
   # 3. 確認 XP 和金幣有 +10% 加成
   ```

---

## 📚 相關檔案

### 新增檔案
- `apps/web/lib/chick/hunger.ts` - 飢餓度管理
- `apps/web/lib/chick/rewards.ts` - 獎勵系統
- `apps/web/app/api/chick/review-progress/route.ts` - 錯題複習追蹤
- `apps/web/db/sql/025_chick_hunger_system.sql` - 資料庫 Migration
- `CHICK_SYSTEM_DESIGN_V2.md` - 設計文件

### 修改檔案
- `apps/web/lib/progression/service.ts` - 對戰結算邏輯
- `apps/web/app/api/chick/status/route.ts` - 狀態 API
- `apps/web/app/api/chick/feed/route.ts` - 餵食 API
- `apps/web/app/api/missions/complete/route.ts` - 任務完成 API
- `apps/web/components/chick/ChickInteractionModal.tsx` - UI 組件

---

## ⚠️ 注意事項

1. **資料庫 Migration**: 需要執行 `025_chick_hunger_system.sql`
2. **錯題複習整合**: 需要在錯題複習頁面調用 `/api/chick/review-progress`
3. **購買功能**: `/api/shop/buy-food` 仍存在，但 UI 已移除，可考慮完全刪除
4. **性能優化**: 飢餓度更新可改為批量處理（未來優化）

---

## 🎉 完成狀態

✅ **Phase 1: 核心機制** - 100% 完成  
⏳ **Phase 2: 戰鬥助手** - 0% 完成  
⏳ **Phase 3: 探險優化** - 0% 完成  
⏳ **Phase 4: 作息系統** - 0% 完成  
⏳ **Phase 5: 進化外觀** - 0% 完成

---

**實作完成日期**: 2025-01-XX  
**下一步**: 整合錯題複習頁面，開始 Phase 2 戰鬥助手功能

