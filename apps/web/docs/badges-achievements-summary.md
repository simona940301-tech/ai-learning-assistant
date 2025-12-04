# 獎章與徽章系統完整邏輯總結

## 📋 系統架構概覽

系統包含以下幾個相關但獨立的系統：

1. **徽章系統 (Badges)** - `battle_badge_definitions` + `user_badges`
2. **成就系統 (Achievements)** - `battle_achievement_definitions` + `user_achievements`
3. **連續學習里程碑 (Streak Milestones)** - `battle_streak_milestones`
4. **ELO 排名等級 (Tier System)** - 基於 `elo_rank` 的排名系統

---

## 🏅 徽章系統 (Badges)

### 資料表結構
- **定義表**: `battle_badge_definitions`
  - `code`: 徽章代碼 (主鍵)
  - `name`: 徽章名稱
  - `description`: 描述
  - `icon`: 圖標名稱
  - `rarity`: 稀有度 (common, rare, epic, legendary)
  - `category`: 分類 (tutorial, streak, performance, pvp)

- **用戶徽章表**: `user_badges`
  - `user_id`: 用戶 ID
  - `badge_code`: 徽章代碼
  - `awarded_at`: 獲得時間
  - `metadata`: 額外資料

### 現有徽章列表

| 徽章代碼 | 名稱 | 描述 | 稀有度 | 分類 | 獲得條件 |
|---------|------|------|--------|------|----------|
| `rookie_warrior` | 新手戰士 | 完成首次教學戰並贏得勝利 | common | tutorial | 完成教學戰並獲勝 |
| `streak_legend` | 恆毅傳說 | 連續 30 天完成每日對戰 | legendary | streak | 連續 30 天完成對戰 |
| `perfect_game` | 完美演算 | 一場對戰中保持 100% 正確率 | epic | performance | 單場全對 (由成就 `perfect_accuracy` 觸發) |
| `first_pvp_win` | 試煉者 | 首次真人 PVP 勝利 | rare | pvp | 首次 PVP 勝利 (由成就 `first_pvp_win` 觸發) |
| `pvp_streak_5` | 火線五連勝 | 連續 5 場 PVP 勝利 | epic | pvp | 連續 5 場 PVP 勝利 (由成就 `pvp_win_streak_5` 觸發) |

### API 獲取方式
- **端點**: `/api/play/progression/status`
- **返回欄位**: `badges` (最多 8 個，按獲得時間倒序)
- **資料格式**: `{ badge_code: string, awarded_at: string }`

---

## 🎯 成就系統 (Achievements)

### 資料表結構
- **定義表**: `battle_achievement_definitions`
  - `code`: 成就代碼 (主鍵)
  - `name`: 成就名稱
  - `description`: 描述
  - `category`: 分類 (performance, pvp, lifetime)
  - `reward_chest_type`: 獎勵寶箱類型 (BRONZE, GOLD)
  - `reward_gold`: 獎勵金幣
  - `reward_xp`: 獎勵 XP
  - `reward_badge_code`: 獎勵的徽章代碼 (可選)
  - `metadata`: 達成條件詳細資訊

- **用戶成就表**: `user_achievements`
  - `user_id`: 用戶 ID
  - `achievement_code`: 成就代碼
  - `unlocked_at`: 解鎖時間
  - `progress`: 進度資料

### 現有成就列表

| 成就代碼 | 名稱 | 描述 | 分類 | 達成條件 | 獎勵 | 觸發徽章 |
|---------|------|------|------|----------|------|----------|
| `perfect_accuracy` | 100% 正確 | 單場 10 題全對 | performance | 單場 10 題全對 | BRONZE 寶箱 + 60 XP | `perfect_game` |
| `first_pvp_win` | 首勝紀念 | 首次真人 PVP 勝利 | pvp | 首次 PVP 勝利 | 150 金幣 + 80 XP | `first_pvp_win` |
| `pvp_win_streak_5` | 連勝五場 | 連續 5 場 PVP 勝利 | pvp | 連續 5 場 PVP 勝利 | GOLD 寶箱 + 200 金幣 + 120 XP | `pvp_streak_5` |
| `fifty_matches` | 對戰老手 | 累積完成 50 場對戰 | lifetime | 累積 50 場對戰 | BRONZE 寶箱 + 120 金幣 + 100 XP | 無 |
| `two_hundred_answers` | 二百問 | 累積答完 200 題 | lifetime | 累積答完 200 題 | 150 XP | 無 |

### 成就評估邏輯
- **檔案**: `lib/progression/achievements.ts`
- **函數**: `evaluateAchievements(ctx: AchievementContext)`
- **觸發時機**: 對戰結束後評估

### API 獲取方式
- **目前**: 沒有專門的 API 端點獲取成就
- **建議**: 需要新增 `/api/play/progression/achievements` 或擴展現有端點

---

## 🔥 連續學習里程碑 (Streak Milestones)

### 資料表結構
- **里程碑表**: `battle_streak_milestones`
  - `milestone_days`: 里程碑天數 (主鍵)
  - `reward_chest_type`: 獎勵寶箱類型
  - `reward_gold`: 獎勵金幣
  - `reward_xp`: 獎勵 XP
  - `reward_badge_code`: 獎勵的徽章代碼 (可選)
  - `reward_buff_hours`: 獎勵 buff 持續時間 (小時)
  - `metadata`: 額外資料

### 現有里程碑列表

| 天數 | 獎勵寶箱 | 金幣 | XP | 徽章 | Buff 時長 | 標籤 |
|------|---------|------|-----|------|-----------|------|
| 3 天 | BRONZE | 0 | 40 | 無 | 0 小時 | 3-day Streak |
| 7 天 | GOLD | 100 | 120 | 無 | 24 小時 | 7-day Momentum (XP 1.2x) |
| 30 天 | 無 | 300 | 250 | `streak_legend` | 72 小時 | 30-day Legend |

### API 獲取方式
- **端點**: `/api/play/progression/status`
- **返回欄位**: `progression.streak.nextMilestone`
- **資料格式**: 
  ```json
  {
    "dayCount": 7,
    "rewardChest": "GOLD",
    "rewardBadge": null
  }
  ```

---

## 🏆 ELO 排名等級系統 (Tier System)

### 等級劃分

| 等級 | ELO 分數範圍 | 說明 |
|------|-------------|------|
| 鐵 (Iron) | < 1000 | 初始等級 |
| 銀 (Silver) | 1000 - 1199 | 入門等級 |
| 金 (Gold) | 1200 - 1399 | 中級等級 |
| 白金 (Platinum) | 1400 - 1599 | 高級等級 |
| 鑽石 (Diamond) | ≥ 1600 | 頂級等級 |

### 資料來源
- **欄位**: `profiles.elo_rank`
- **API**: `/api/play/user/status` 返回 `eloRank`

### 顯示位置
- **已移除**: 原本顯示在頭像旁邊的 tier icon
- **建議**: 可考慮在等級卡片或徽章區域顯示

---

## 📊 資料獲取 API 總結

### 已實現的 API

1. **`/api/play/progression/status`**
   - 返回: 進度資料、寶箱、徽章 (最多 8 個)、里程碑資訊
   - 徽章資料: `badges` 陣列

2. **`/api/play/user/status`**
   - 返回: 每日能量、金幣、ELO 排名

### 缺失的 API

1. **成就資料 API**
   - 目前沒有專門的端點獲取用戶成就
   - 需要新增或擴展現有端點

---

## 🎨 UI 顯示建議

### 當前 Profile 頁面結構
1. ✅ 頭像區域 (已移除 tier icon)
2. ✅ 等級 & XP 卡片
3. ✅ 獎章卡片 (目前是靜態佔位符)
4. ✅ 連續學習 & 金幣統計
5. ✅ 學習資產按鈕

### 建議的獎章/徽章顯示方案

#### 方案 A: 統一顯示在「我的獎章」卡片
- 顯示所有已獲得的徽章 (從 `user_badges`)
- 顯示所有已解鎖的成就 (需要新增 API)
- 顯示當前 ELO 等級 (可選)
- 顯示連續學習里程碑進度 (可選)

#### 方案 B: 分開顯示
- **徽章卡片**: 只顯示徽章 (badges)
- **成就卡片**: 顯示成就 (achievements)
- **里程碑進度**: 顯示在連續學習卡片中

#### 方案 C: 混合顯示
- **主要徽章**: 顯示在「我的獎章」卡片 (已獲得的徽章)
- **成就徽章**: 顯示在成就區域 (如果成就獎勵徽章)
- **ELO 等級**: 顯示在等級卡片或獨立顯示

---

## ❓ 需要決定的問題

1. **成就資料獲取**: 是否需要新增 API 來獲取用戶成就？
2. **顯示優先級**: 徽章、成就、ELO 等級、里程碑，哪些應該優先顯示？
3. **顯示方式**: 統一顯示還是分開顯示？
4. **未解鎖狀態**: 是否要顯示未解鎖的徽章/成就（灰色/鎖定狀態）？
5. **ELO 等級位置**: ELO 等級應該顯示在哪裡？(等級卡片、徽章卡片、或獨立顯示)

---

## 📝 技術實作注意事項

1. **API 擴展**: 可能需要擴展 `/api/play/progression/status` 來包含成就資料
2. **資料關聯**: 需要 join `battle_badge_definitions` 來獲取徽章完整資訊
3. **圖標資源**: 確認所有徽章圖標資源是否已準備好
4. **性能考量**: 如果顯示大量徽章/成就，需要考慮分頁或虛擬滾動















