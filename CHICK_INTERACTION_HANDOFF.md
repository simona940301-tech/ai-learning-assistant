# 🐣 小雞互動邏輯開發進度與交接文件

> **最後更新**: 2025-11-25  
> **專案**: AI Learning Assistant - Chick (電子雞) 互動系統  
> **目的**: 詳細記錄小雞功能的完整實作進度與剩餘技術細節，供下一位工程師接手

---

## 📋 目錄

1. [專案概述](#專案概述)
2. [已完成功能](#已完成功能)
3. [未完成功能](#未完成功能)
4. [技術架構](#技術架構)
5. [資料庫架構](#資料庫架構)
6. [API 端點](#api-端點)
7. [前端組件](#前端組件)
8. [測試指南](#測試指南)
9. [已知問題](#已知問題)
10. [下一步工作](#下一步工作)

---

## 專案概述

### 核心理念
電子雞系統是一個「學習驅動」的 AI 伴侶，所有互動都與用戶的學習行為深度綁定：
- **知識餵食**: 食物只能通過學習獲得（完成對戰、複習錯題）
- **學科進化**: 根據學習偏好（數學/英文）進化成不同形態
- **戰鬥助手**: 在對戰中提供實質幫助（技能、Buff）
- **離線探險**: 離線時自動探險，帶回學習資源

### 設計文件
- [PROPOSED_CHICK_FEATURES.md](file:///Users/simonac/Desktop/moonshot-idea/PROPOSED_CHICK_FEATURES.md) - 功能提案與設計理念

---

## 已完成功能

### ✅ Phase 1: 餵食與探險系統

#### 1.1 資料庫架構 (Database Schema)

**已完成的 Migration 檔案**:

##### [023_chick_features.sql](file:///Users/simonac/Desktop/moonshot-idea/apps/web/db/sql/023_chick_features.sql)
```sql
-- 新增欄位到 profiles 表
- chick_hunger (INTEGER, 0-100, default 50)
- chick_intimacy (INTEGER, ≥0, default 0)
- food_bowls_count (INTEGER, ≥0, default 0)
- chick_exploration_start_at (TIMESTAMPTZ, nullable)
- chick_exploration_allowance (INTEGER, ≥0, default 0)
```

##### [024_chick_evolution.sql](file:///Users/simonac/Desktop/moonshot-idea/apps/web/db/sql/024_chick_evolution.sql)
```sql
-- 進化相關欄位
- chick_evolution_stage (INTEGER, ≥0, default 0)
  * 0: Egg, 1: Baby, 2: Child, 3: Teen
- chick_evolution_variant (TEXT, default 'default')
  * 'default', 'math', 'english', 'balanced'
- chick_buffs_unlocked (JSONB, default '[]')
```

**部署狀態**: ⚠️ **需要確認是否已應用到 Supabase**

---

#### 1.2 API 端點實作

##### ✅ `/api/shop/buy-food` (POST)
- **檔案**: [apps/web/app/api/shop/buy-food/route.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/shop/buy-food/route.ts)
- **功能**: 購買食物碗
- **邏輯**:
  - 價格: 100 金幣/碗
  - 檢查用戶餘額 (`user_wallet_balance`)
  - 扣除金幣，增加 `food_bowls_count`
  - 記錄交易到 `transactions` 表
- **回傳**: `{ success, newBalance, newBowls }`

##### ✅ `/api/chick/feed` (POST)
- **檔案**: [apps/web/app/api/chick/feed/route.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/feed/route.ts)
- **功能**: 餵食小雞
- **邏輯**:
  - 檢查是否有食物碗 (`food_bowls_count >= 1`)
  - 飢餓度 -20 (`chick_hunger`)
  - 親密度 +5 (`chick_intimacy`)
  - 消耗 1 個食物碗
  - 發送 Chick 訊息 (type: `FEEDING_YUMMY`)
- **回傳**: `{ success, newHunger, newBowls, newIntimacy }`

##### ✅ `/api/chick/explore` (POST)
- **檔案**: [apps/web/app/api/chick/explore/route.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/explore/route.ts)
- **功能**: 開始/領取探險獎勵
- **邏輯**:
  - **Action: 'start'**
    - 檢查是否已在探險中
    - 檢查金幣餘額 (`user_wallet_balance >= allowance`)
    - 設定 `chick_exploration_start_at` 為當前時間
    - 扣除零用錢 (`chick_exploration_allowance`)
  - **Action: 'claim'**
    - 檢查是否在探險中
    - 計算探險時長（最少 1 分鐘，正式應為 2 小時）
    - 計算獎勵:
      - XP: `50 + (allowance * 0.5) + (durationHours * 10)`
      - 禮物: 根據零用錢隨機生成
    - 重置探險狀態
    - 發送 Chick 訊息 (type: `EXPLORATION_RETURN`)
- **回傳**: `{ success, xpGained, gifts }`

##### ✅ `/api/chick/status` (GET)
- **檔案**: [apps/web/app/api/chick/status/route.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/status/route.ts)
- **功能**: 獲取小雞狀態（包含進化檢查）
- **邏輯**:
  - 調用 `checkEvolution()` 檢查是否達成進化條件
  - 如果進化，發送 `MILESTONE` 訊息
  - 檢查不活躍天數，更新情緒狀態
  - 更新 `last_login_at` (心跳)
  - 計算未讀訊息數量
- **回傳**: `{ iq, fatigue, emotionState, messagesUnreadCount, evolutionStage, evolutionVariant }`

---

#### 1.3 前端組件

##### ✅ ChickInteractionModal
- **檔案**: [apps/web/components/chick/ChickInteractionModal.tsx](file:///Users/simonac/Desktop/moonshot-idea/apps/web/components/chick/ChickInteractionModal.tsx)
- **功能**: 小雞互動主介面
- **包含功能**:
  - **餵食 Tab**:
    - 飢餓度進度條 (0-100)
    - 食物碗庫存顯示
    - 購買食物按鈕 (100 金幣)
    - 餵食按鈕 (-20 飢餓, +5 親密)
  - **探險 Tab**:
    - 探險狀態顯示 (進行中/未開始)
    - 零用錢滑桿 (0-1000 金幣)
    - 開始探險按鈕
    - 領取獎勵按鈕
  - **狀態顯示**:
    - 進化階段 (Stage 0-3)
    - 親密度等級 (Lv.X)
    - 進化變體 (Math/English/Balanced)
  - **獎勵彈窗**: 顯示探險獲得的 XP 和禮物

##### ✅ ChickStore (Zustand)
- **檔案**: [apps/web/src/store/chickStore.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/src/store/chickStore.ts)
- **狀態管理**:
  ```typescript
  // 新增狀態
  hunger: number (0-100)
  intimacy: number
  foodBowlsCount: number
  explorationStartAt: string | null
  explorationAllowance: number
  evolutionStage: number (0-3)
  evolutionVariant: string ('default'|'math'|'english'|'balanced')
  ```
- **Actions**:
  - `buyFood(quantity)` - 購買食物
  - `feed()` - 餵食
  - `startExploration(allowance)` - 開始探險
  - `claimExploration()` - 領取探險獎勵
  - `fetchStatus()` - 獲取狀態（包含從 `/api/profile` 獲取新欄位）

---

### ✅ Phase 2: 進化系統

#### 2.1 進化邏輯

##### ✅ Evolution Logic
- **檔案**: [apps/web/lib/chick/evolution.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/lib/chick/evolution.ts)
- **進化條件**:
  ```typescript
  Stage 0 → 1 (Egg → Baby):    親密度 100,  對戰 0 場
  Stage 1 → 2 (Baby → Child):  親密度 500,  對戰 50 場
  Stage 2 → 3 (Child → Teen):  親密度 2000, 對戰 200 場
  ```
- **變體判定** (在 Stage 1→2 時決定):
  - 數學分數 > 英文分數 + 10 → `'math'`
  - 英文分數 > 數學分數 + 10 → `'english'`
  - 其他 → `'balanced'`
- **數據來源**: `skill_mastery_json` (profiles 表)

#### 2.2 整合點
- ✅ `/api/chick/status` 在每次調用時檢查進化
- ✅ `ChickInteractionModal` 顯示進化階段和變體
- ✅ `chickStore` 儲存進化狀態

---

## 未完成功能

### ❌ Phase 1: 知識餵食系統 (Knowledge Feeding)

> **原始設計**: 食物碗只能通過學習獲得，無法購買

#### 需要實作的內容:

1. **移除購買功能**:
   - ❌ 刪除 `/api/shop/buy-food` 端點
   - ❌ 或修改為「無法購買」，僅用於測試

2. **實作學習獎勵**:
   - ❌ 在 `/api/play/progression/apply-battle` 中新增食物碗獎勵
     - 勝利: +3 碗
     - 失敗: +1 碗
   - ❌ 在錯題複習 API 中新增獎勵 (複習 5 題 → +1 碗)
   - ❌ 在每日任務完成時新增獎勵 (+5 碗)

3. **飢餓影響**:
   - ❌ 實作「飽足」狀態 Buff (hunger < 30):
     - 對戰 XP +10%
     - 對戰金幣 +10%
   - ❌ 實作「飢餓」狀態 Debuff (hunger > 80):
     - 無法使用戰鬥技能
     - 主畫面顯示虛弱狀態

4. **UI 更新**:
   - ❌ 在 `ChickInteractionModal` 中隱藏/禁用購買按鈕
   - ❌ 顯示「食物只能通過學習獲得」提示

---

### ❌ Phase 2: 戰鬥助手功能 (Battle Assistance)

> **原始設計**: Chick 在戰鬥中提供實質幫助

#### 需要實作的內容:

1. **戰鬥畫面整合**:
   - ❌ 在 `BattleQuestionV3` 組件中加入 Chick 形象
     - 檔案位置: `apps/web/components/battle/BattleQuestionV3.tsx` (需確認)
   - ❌ 根據 `evolutionStage` 和 `evolutionVariant` 顯示不同造型

2. **被動效果 (Visual)**:
   - ❌ 答對: 開心跳躍動畫
   - ❌ 答錯: 驚慌動畫
   - ❌ 連對 (Streak): 燃燒特效

3. **主動技能 (Functional)**:
   - ❌ **SOS 技能** (50/50):
     - 刪除 2 個錯誤選項
     - 每日 1 次（可隨親密度提升）
     - 發動條件: `hunger < 50` 且 `intimacy >= 200`
   - ❌ **時間凍結**:
     - 凍結倒數計時 10 秒
     - 每日 1 次
     - 發動條件: `evolutionStage >= 2`

4. **資料庫**:
   - ❌ 新增 `chick_skills_used_today` (JSONB) 記錄每日技能使用次數
   - ❌ 新增每日重置邏輯

5. **API**:
   - ❌ 新增 `/api/chick/use-skill` (POST)
     - 檢查發動條件
     - 扣除使用次數
     - 回傳技能效果

---

### ❌ Phase 3: 離線探險優化 (Useful Idle Exploration)

> **原始設計**: 探險帶回學習資源，而非隨機禮物

#### 需要實作的內容:

1. **自動探險觸發**:
   - ❌ 在 `/api/chick/status` 中檢查離線時間
   - ❌ 如果離線 > 2 小時且未在探險中，自動開始探險

2. **戰利品系統**:
   - ❌ **遺失的筆記** (Error Book 錯題):
     - 從 `error_book` 表隨機抓取 1-3 題
     - 包裝成「探險筆記」
     - 用戶必須重做才能獲得獎勵
   - ❌ **冷知識卡片**:
     - 根據 `skill_mastery_json` 判斷最弱學科
     - 生成相關趣味知識 (可用 AI 生成)
   - ❌ **金幣**: 根據探險時長計算

3. **資料庫**:
   - ❌ 新增 `exploration_loot` 表:
     ```sql
     - id (UUID)
     - user_id (UUID)
     - loot_type ('error_note' | 'knowledge_card' | 'coins')
     - loot_data (JSONB)
     - claimed_at (TIMESTAMPTZ)
     ```

4. **UI**:
   - ❌ 領取獎勵時顯示「探險筆記」
   - ❌ 點擊筆記進入答題介面
   - ❌ 答對後才能領取完整獎勵

---

### ❌ Phase 4: 作息系統 (Circadian Rhythm)

> **原始設計**: 模擬真實生物鐘，深夜陪讀

#### 需要實作的內容:

1. **時間判斷**:
   - ❌ 在 `ChickAvatar` 組件中根據當前時間切換狀態
     - 22:00 - 07:00: 睡眠狀態 (睡衣造型)
     - 其他時間: 正常狀態

2. **陪讀模式**:
   - ❌ 如果用戶在 22:00 - 02:00 進行學習活動:
     - Chick 從睡眠狀態切換為「陪讀」狀態
     - 顯示揉眼睛動畫
     - 點擊顯示對話: "雖然想睡...但會陪你拚完這題"

3. **學習活動偵測**:
   - ❌ 監聽以下事件:
     - 進入對戰
     - 開始答題
     - 查看 Error Book

4. **UI**:
   - ❌ 新增睡眠狀態圖片/動畫
   - ❌ 新增陪讀狀態圖片/動畫

---

### ❌ Phase 5: 進化外觀更新

> **目前狀態**: 進化邏輯已完成，但外觀未實作

#### 需要實作的內容:

1. **Chick 圖片資源**:
   - ❌ 設計/生成不同階段的圖片:
     - Stage 0: Egg (蛋)
     - Stage 1: Baby (黃色小雞)
     - Stage 2: Child (根據變體)
       - Math: 牛頓雞 (蘋果、算盤)
       - English: 莎士比亞雞 (羽毛筆、單片眼鏡)
       - Balanced: 達文西雞 (畫家造型)
     - Stage 3: Teen (進階版)

2. **圖片管理**:
   - ❌ 更新 [apps/web/components/chick/chickImage.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/components/chick/chickImage.ts)
   - ❌ 新增函數: `getChickImage(stage, variant, emotion)`

3. **組件更新**:
   - ❌ 更新 `ChickAvatar` 根據 `evolutionStage` 和 `evolutionVariant` 顯示圖片
   - ❌ 更新 `ChickInteractionModal` 顯示進化進度條

4. **進化動畫**:
   - ❌ 實作進化慶祝動畫 (Lottie 或 CSS)
   - ❌ 在進化時自動彈出慶祝畫面

---

## 技術架構

### 技術棧
- **前端**: Next.js 14 (App Router), React, TypeScript
- **狀態管理**: Zustand
- **UI 組件**: Radix UI, Tailwind CSS
- **動畫**: Framer Motion
- **後端**: Next.js API Routes
- **資料庫**: Supabase (PostgreSQL)
- **認證**: Supabase Auth

### 專案結構
```
apps/web/
├── app/
│   ├── api/
│   │   ├── chick/
│   │   │   ├── status/route.ts        ✅ 已完成
│   │   │   ├── feed/route.ts          ✅ 已完成
│   │   │   ├── explore/route.ts       ✅ 已完成
│   │   │   ├── messages/route.ts      ✅ 已完成 (舊系統)
│   │   │   └── action/route.ts        ✅ 已完成 (舊系統)
│   │   └── shop/
│   │       └── buy-food/route.ts      ✅ 已完成 (需移除)
│   └── (app)/
│       └── ...
├── components/
│   └── chick/
│       ├── ChickAvatar.tsx            ✅ 已完成 (需更新外觀)
│       ├── ChickInteractionModal.tsx  ✅ 已完成
│       ├── ChickBottomSheet.tsx       ✅ 已完成 (舊系統)
│       └── chickImage.ts              ⚠️ 需更新
├── lib/
│   └── chick/
│       └── evolution.ts               ✅ 已完成
├── src/
│   └── store/
│       └── chickStore.ts              ✅ 已完成
└── db/
    └── sql/
        ├── 023_chick_features.sql     ✅ 已完成
        └── 024_chick_evolution.sql    ✅ 已完成
```

---

## 資料庫架構

### Profiles 表新增欄位

```sql
-- 餵食與探險
chick_hunger INTEGER DEFAULT 50 CHECK (chick_hunger >= 0 AND chick_hunger <= 100)
chick_intimacy INTEGER DEFAULT 0 CHECK (chick_intimacy >= 0)
food_bowls_count INTEGER DEFAULT 0 CHECK (food_bowls_count >= 0)
chick_exploration_start_at TIMESTAMPTZ
chick_exploration_allowance INTEGER DEFAULT 0 CHECK (chick_exploration_allowance >= 0)

-- 進化
chick_evolution_stage INTEGER DEFAULT 0 CHECK (chick_evolution_stage >= 0)
chick_evolution_variant TEXT DEFAULT 'default'
chick_buffs_unlocked JSONB DEFAULT '[]'::jsonb

-- 舊系統 (已存在)
chick_iq INTEGER
chick_fatigue INTEGER
chick_emotion_state TEXT
last_login_at TIMESTAMPTZ
chick_iq_last_decay_at TIMESTAMPTZ
skill_mastery_json JSONB
```

### 相關表

#### chick_messages (已存在)
```sql
- id (UUID)
- user_id (UUID)
- type (TEXT) - 訊息類型
- text (TEXT) - 訊息內容
- state_snapshot (JSONB)
- created_at (TIMESTAMPTZ)
- read_at (TIMESTAMPTZ)
```

#### match_history (已存在)
```sql
- user_id (UUID)
- ... (用於計算對戰次數)
```

#### transactions (已存在)
```sql
- user_id (UUID)
- amount (INTEGER)
- transaction_type (TEXT)
- status (TEXT)
- metadata (JSONB)
```

---

## API 端點

### 已實作

| 端點 | 方法 | 功能 | 狀態 |
|------|------|------|------|
| `/api/chick/status` | GET | 獲取小雞狀態 (含進化檢查) | ✅ |
| `/api/chick/feed` | POST | 餵食小雞 | ✅ |
| `/api/chick/explore` | POST | 開始/領取探險 | ✅ |
| `/api/shop/buy-food` | POST | 購買食物 | ✅ (需移除) |
| `/api/chick/messages` | GET | 獲取訊息列表 | ✅ (舊系統) |
| `/api/chick/action` | POST | 觸發互動 | ✅ (舊系統) |

### 需要新增

| 端點 | 方法 | 功能 | 優先級 |
|------|------|------|--------|
| `/api/chick/use-skill` | POST | 使用戰鬥技能 | 🔴 高 |
| `/api/chick/loot` | GET | 獲取探險戰利品 | 🟡 中 |
| `/api/chick/claim-loot` | POST | 領取戰利品 | 🟡 中 |

### 需要修改

| 端點 | 修改內容 | 優先級 |
|------|----------|--------|
| `/api/play/progression/apply-battle` | 新增食物碗獎勵 | 🔴 高 |
| `/api/error-book/review` | 新增食物碗獎勵 (複習 5 題) | 🟡 中 |
| `/api/missions/complete` | 新增食物碗獎勵 | 🟡 中 |

---

## 前端組件

### 已實作

#### ChickInteractionModal
- **路徑**: [apps/web/components/chick/ChickInteractionModal.tsx](file:///Users/simonac/Desktop/moonshot-idea/apps/web/components/chick/ChickInteractionModal.tsx)
- **功能**: 完整的餵食與探險 UI
- **狀態**: ✅ 功能完整

#### ChickStore
- **路徑**: [apps/web/src/store/chickStore.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/src/store/chickStore.ts)
- **功能**: 狀態管理與 API 調用
- **狀態**: ✅ 功能完整

### 需要修改

#### ChickAvatar
- **路徑**: [apps/web/components/chick/ChickAvatar.tsx](file:///Users/simonac/Desktop/moonshot-idea/apps/web/components/chick/ChickAvatar.tsx)
- **需要**:
  - 根據 `evolutionStage` 和 `evolutionVariant` 顯示不同圖片
  - 實作睡眠/陪讀狀態切換
  - 顯示飢餓狀態 (虛弱動畫)

#### BattleQuestionV3 (需確認檔案位置)
- **需要**:
  - 在戰鬥畫面中顯示 Chick
  - 實作答題反應動畫
  - 整合 SOS 技能按鈕

---

## 測試指南

### 環境準備

1. **啟動開發服務器**:
   ```bash
   cd /Users/simonac/Desktop/moonshot-idea
   pnpm dev:web
   ```

2. **應用資料庫 Migration** (⚠️ 重要):
   ```bash
   # 方法 1: 使用 Supabase CLI
   supabase db push

   # 方法 2: 手動在 Supabase Dashboard 執行
   # 1. 開啟 Supabase Dashboard > SQL Editor
   # 2. 執行 023_chick_features.sql
   # 3. 執行 024_chick_evolution.sql
   ```

3. **檢查環境變數**:
   ```bash
   cat apps/web/.env.local | grep SUPABASE
   ```

### 功能測試

#### 1. 餵食系統測試

**步驟**:
1. 登入系統
2. 點擊小雞頭像開啟 `ChickInteractionModal`
3. 切換到「Feeding」Tab
4. 點擊「Buy (100)」購買食物碗
5. 確認金幣扣除，食物碗數量增加
6. 點擊「Feed」餵食
7. 確認飢餓度下降 20，親密度增加 5

**預期結果**:
- ✅ 購買成功，餘額正確扣除
- ✅ 餵食成功，數值正確更新
- ✅ 收到 Chick 訊息 "Yummy! I feel much better now. Thank you! 🥣"

#### 2. 探險系統測試

**步驟**:
1. 開啟 `ChickInteractionModal`
2. 切換到「Exploration」Tab
3. 調整零用錢滑桿 (例如 500 金幣)
4. 點擊「Start Exploration」
5. 確認探險狀態顯示為「Exploring...」
6. 等待 1 分鐘 (測試用)
7. 點擊「Call Back & Claim Rewards」
8. 確認顯示獎勵彈窗

**預期結果**:
- ✅ 探險開始，金幣正確扣除
- ✅ 探險狀態正確顯示
- ✅ 領取獎勵成功，顯示 XP 和禮物
- ✅ 收到 Chick 訊息

#### 3. 進化系統測試

**步驟**:
1. 使用 SQL 手動調整數值 (測試用):
   ```sql
   UPDATE profiles
   SET chick_intimacy = 100
   WHERE id = 'your-user-id';
   ```
2. 重新整理頁面
3. 開啟 `ChickInteractionModal`
4. 確認進化階段顯示為 Stage 1

**預期結果**:
- ✅ 進化階段正確更新
- ✅ 收到進化訊息 (MILESTONE)

### API 測試

```bash
# 測試購買食物
curl -X POST http://localhost:3000/api/shop/buy-food \
  -H "Content-Type: application/json" \
  -d '{"quantity": 1}' \
  --cookie "your-session-cookie"

# 測試餵食
curl -X POST http://localhost:3000/api/chick/feed \
  -H "Content-Type: application/json" \
  --cookie "your-session-cookie"

# 測試開始探險
curl -X POST http://localhost:3000/api/chick/explore \
  -H "Content-Type: application/json" \
  -d '{"action": "start", "allowance": 500}' \
  --cookie "your-session-cookie"

# 測試領取探險
curl -X POST http://localhost:3000/api/chick/explore \
  -H "Content-Type: application/json" \
  -d '{"action": "claim"}' \
  --cookie "your-session-cookie"
```

---

## 已知問題

### 1. 資料庫 Migration 未部署
- **問題**: `023_chick_features.sql` 和 `024_chick_evolution.sql` 可能尚未應用到 Supabase
- **影響**: 新欄位不存在，API 會報錯
- **解決**: 手動在 Supabase Dashboard 執行 SQL

### 2. 購買食物與設計理念衝突
- **問題**: 目前可以用金幣購買食物，但設計理念是「只能通過學習獲得」
- **影響**: 破壞核心機制
- **解決**: 移除購買功能，實作學習獎勵

### 3. 進化外觀未實作
- **問題**: 進化邏輯已完成，但 Chick 外觀沒有變化
- **影響**: 用戶無法感受到進化效果
- **解決**: 設計/生成不同階段的圖片，更新 `ChickAvatar`

### 4. 戰鬥助手未整合
- **問題**: Chick 尚未出現在戰鬥畫面中
- **影響**: 缺少核心功能
- **解決**: 修改 `BattleQuestionV3` 組件

### 5. 探險獎勵過於簡單
- **問題**: 目前只是隨機禮物，沒有學習價值
- **影響**: 無法達成「離線時間轉化為學習資源」的目標
- **解決**: 實作錯題回歸機制

---

## 下一步工作

### 🔴 高優先級 (P0)

1. **部署資料庫 Migration**
   - 執行 `023_chick_features.sql`
   - 執行 `024_chick_evolution.sql`
   - 驗證所有欄位已建立

2. **實作知識餵食系統**
   - 修改 `/api/play/progression/apply-battle` 新增食物碗獎勵
   - 移除或禁用 `/api/shop/buy-food`
   - 更新 UI 提示

3. **實作戰鬥助手基礎功能**
   - 在 `BattleQuestionV3` 中顯示 Chick
   - 實作答題反應動畫
   - 實作 SOS 技能 (50/50)

### 🟡 中優先級 (P1)

4. **實作進化外觀**
   - 設計/生成不同階段圖片
   - 更新 `chickImage.ts`
   - 更新 `ChickAvatar` 組件
   - 實作進化動畫

5. **優化探險系統**
   - 實作錯題回歸機制
   - 實作冷知識卡片
   - 新增 `exploration_loot` 表

6. **實作飢餓影響**
   - 飽足狀態 Buff (XP/金幣 +10%)
   - 飢餓狀態 Debuff (無法使用技能)
   - UI 狀態顯示

### 🟢 低優先級 (P2)

7. **實作作息系統**
   - 睡眠狀態切換
   - 陪讀模式
   - 新增睡眠/陪讀圖片

8. **實作進階戰鬥技能**
   - 時間凍結
   - 技能使用次數限制
   - 每日重置邏輯

9. **優化與測試**
   - 撰寫單元測試
   - 撰寫 E2E 測試
   - 效能優化

---

## 參考資料

### 設計文件
- [PROPOSED_CHICK_FEATURES.md](file:///Users/simonac/Desktop/moonshot-idea/PROPOSED_CHICK_FEATURES.md) - 功能提案
- [FEATURES_LIST_AND_TEST_PLAN.md](file:///Users/simonac/Desktop/moonshot-idea/FEATURES_LIST_AND_TEST_PLAN.md) - 整體測試計劃

### 相關檔案
- [023_chick_features.sql](file:///Users/simonac/Desktop/moonshot-idea/apps/web/db/sql/023_chick_features.sql)
- [024_chick_evolution.sql](file:///Users/simonac/Desktop/moonshot-idea/apps/web/db/sql/024_chick_evolution.sql)
- [ChickInteractionModal.tsx](file:///Users/simonac/Desktop/moonshot-idea/apps/web/components/chick/ChickInteractionModal.tsx)
- [chickStore.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/src/store/chickStore.ts)
- [evolution.ts](file:///Users/simonac/Desktop/moonshot-idea/apps/web/lib/chick/evolution.ts)

### API 端點
- [/api/chick/status](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/status/route.ts)
- [/api/chick/feed](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/feed/route.ts)
- [/api/chick/explore](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/chick/explore/route.ts)
- [/api/shop/buy-food](file:///Users/simonac/Desktop/moonshot-idea/apps/web/app/api/shop/buy-food/route.ts)

---

## 聯絡資訊

如有任何問題，請參考：
- 專案 README
- Supabase Dashboard
- 現有的測試計劃文件

**祝開發順利！** 🚀
