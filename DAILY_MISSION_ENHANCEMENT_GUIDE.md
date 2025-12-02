# 每日任務系統升級指南
## Daily Mission System Enhancement Guide

> **專案色系適配版本** - 完全基於您的 Warm Minimalist Palette 設計

---

## 📊 系統概覽

### 已實現的核心功能 ✅

1. **數據庫架構** (`026_daily_missions.sql`)
   - `daily_missions` 表格與 JSONB 結構
   - `generate_daily_missions()` 個人化任務生成
   - `update_mission_progress()` 進度追蹤
   - RLS (Row Level Security) 安全策略

2. **後端 API**
   - GET `/api/missions/daily` - 獲取/生成任務
   - POST `/api/missions/daily` - 領取獎勵
   - POST `/api/missions/progress` - 更新進度（已增強）

3. **前端組件**
   - `DailyMissionWidget.tsx` - 基礎版本
   - `DailyMissionWidgetV2.tsx` - **新：情緒化設計版本** ⭐

4. **進度追蹤整合**
   - Battle 系統整合 (`lib/progression/service.ts`)
   - 小雞餵食整合 (`app/api/chick/feed/route.ts`)

---

## 🎨 色系適配說明

### 您的專案配色方案

```css
/* 主色系 - Warm Minimalist Palette */
--background: HSL(44, 56%, 95%)     /* #FAF6E9 淺奶油色 */
--foreground: HSL(14, 26%, 29%)     /* #5D4037 深咖啡棕 */
--primary: HSL(42, 98%, 70%)        /* #FED168 金黃色 */
--secondary: HSL(36, 41%, 67%)      /* #CCB188 柔和米色 */
--accent: HSL(123, 23%, 42%)        /* #528555 綠色 */
--muted: HSL(42, 56%, 85%)          /* #EDD9AB 淺灰米色 */
--border: HSL(36, 30%, 80%)         /* #E0D0B8 淺棕米色 */
```

### UI 組件色彩應用

| 組件 | 色彩方案 | 用途 |
|------|---------|------|
| **Widget 背景** | `bg-card` (白色) | 任務卡片背景 |
| **完成狀態背景** | `bg-accent/10` + `border-accent/20` | 已完成任務高亮 |
| **主要按鈕** | `bg-gradient-to-r from-primary to-accent` | 領取獎勵按鈕 |
| **進度條** | `bg-primary` | 進度指示器 |
| **完成圖標** | `text-accent` (綠色) | CheckCircle |
| **金色光暈** | `animate-pulse-glow` | 全部完成時的光暈效果 |

---

## 🚀 新增功能實作指南

### 1. 情緒化設計 Widget (DailyMissionWidgetV2)

#### 核心特性

✨ **金色脈衝光暈動畫** - 當所有任務完成時
```tsx
// 使用方式
className={`
  ${allCompleted
    ? 'animate-pulse-glow border-primary'
    : 'border-border/50'
  }
`}
```

✨ **任務卡片狀態視覺化**
- 未完成：半透明灰色 (`bg-card border-border/30`)
- 已完成：綠色高亮 (`bg-accent/10 border-accent/20`)
- 完成動畫：Scale + Rotate 彈跳效果

✨ **獎勵預覽顯示**
```tsx
{/* 每個任務卡片顯示獎勵 */}
<div className="flex items-center gap-1.5 text-xs">
  <span className="text-primary">{mission.reward.xp} XP</span>
  <span className="text-accent">{mission.reward.gold} 金幣</span>
  {mission.reward.bonus_item && (
    <span className="text-destructive">
      <Star className="h-3 w-3" /> 稀有
    </span>
  )}
</div>
```

✨ **Shimmer 閃爍效果** - 領取按鈕
```tsx
<motion.div
  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
  animate={{ x: ['-100%', '200%'] }}
  transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
/>
```

#### 使用方式

```tsx
// 在 Play 頁面導入新版本
import { DailyMissionWidgetV2 } from '@/components/play/DailyMissionWidgetV2'

// 替換原有的 DailyMissionWidget
<DailyMissionWidgetV2 />
```

---

### 2. 任務追蹤事件總線 (Mission Tracker)

#### 功能說明

新建立的 `lib/mission-tracker.ts` 提供集中化的任務進度追蹤與通知系統。

#### 核心函數

##### `trackMissionEvent(eventType, payload?)`

自動追蹤任務進度並顯示 Toast 通知。

**事件類型：**
```typescript
type MissionEventType =
  | 'BATTLE_COMPLETED'  // 對戰完成
  | 'BATTLE_WON'        // 對戰勝利
  | 'CHICK_FED'         // 小雞餵食
  | 'ERROR_REVIEWED'    // 錯題複習
  | 'ALL_MISSIONS_COMPLETED'  // 所有任務完成
```

**使用範例：**

```typescript
import { trackMissionEvent } from '@/lib/mission-tracker'

// 在對戰完成後
await trackMissionEvent('BATTLE_WON', {
  battle_id: 'battle_123',
  score: 850
})

// 在餵食小雞後
await trackMissionEvent('CHICK_FED')

// 在複習錯題後
await trackMissionEvent('ERROR_REVIEWED', {
  question_id: 'q_456'
})
```

#### Toast 通知樣式

| 通知類型 | 背景色 | 文字色 | 觸發條件 |
|---------|-------|--------|---------|
| **任務完成** | `hsl(123, 23%, 42%)` (綠色) | 白色 | 單個任務剛完成 |
| **進度更新** | `hsl(50, 100%, 98%)` (卡片白) | `hsl(14, 26%, 29%)` | 任務進度增加但未完成 |
| **全部完成** | `hsl(42, 98%, 70%)` (金黃) | `hsl(14, 26%, 29%)` | 所有任務剛完成 |

---

### 3. 整合到現有系統

#### 在 Battle 系統中整合

**檔案：** `lib/progression/service.ts`

```typescript
import { trackMissionEvent } from '@/lib/mission-tracker'

// 在對戰完成後（約第 194 行）
export async function handleBattleCompletion(userId: string, won: boolean) {
  // ... 現有邏輯 ...

  // 追蹤任務進度
  await trackMissionEvent('BATTLE_COMPLETED')

  if (won) {
    await trackMissionEvent('BATTLE_WON')
  }

  // ... 現有邏輯 ...
}
```

#### 在小雞餵食中整合

**檔案：** `app/api/chick/feed/route.ts`

```typescript
import { trackMissionEvent } from '@/lib/mission-tracker'

// 在餵食成功後（約第 55 行）
export async function POST(req: Request) {
  // ... 更新 Profile ...

  // 追蹤任務進度
  await trackMissionEvent('CHICK_FED')

  // ... 返回結果 ...
}
```

#### 在錯題複習中整合

**檔案：** 您的錯題複習 API

```typescript
import { trackMissionEvent } from '@/lib/mission-tracker'

// 在錯題複習完成後
await trackMissionEvent('ERROR_REVIEWED', {
  question_id: questionId
})
```

---

## 🎯 頂尖 UX 優化建議實現

### 1. 即時回饋 Popup ✅

**已實現：** `mission-tracker.ts` 中的 `showMissionProgressNotification()`

**效果：**
- 任務進度更新時立即顯示 Toast
- 任務完成時顯示綠色成功通知
- 所有任務完成時顯示金色慶祝通知

### 2. 情緒化 Widget 設計 ✅

**已實現：** `DailyMissionWidgetV2.tsx`

**效果：**
- 全部完成時的金色脈衝光暈
- 任務卡片完成動畫 (Scale + Rotate)
- 領取按鈕的 Shimmer 閃爍效果
- 獎勵預覽顯示

### 3. 樂觀 UI 更新

**部分實現：** `showOptimisticMissionFeedback()`

**建議完整實現：**

```typescript
import { trackMissionEvent, showOptimisticMissionFeedback } from '@/lib/mission-tracker'

// 在執行任務動作前顯示即時回饋
async function handleBattleWin() {
  // 1. 立即顯示樂觀回饋
  showOptimisticMissionFeedback('BATTLE_WON')

  // 2. 執行實際邏輯
  await saveBattleResult()

  // 3. 追蹤任務（會自動顯示正式通知）
  await trackMissionEvent('BATTLE_WON')
}
```

### 4. 稀有獎勵動畫 ⚠️ 待實現

**建議實現位置：** `DailyMissionWidgetV2.tsx` 的 `handleClaim()`

**實現方案：**

```tsx
// 在領取獎勵成功後
if (result.rewards.bonus_items?.length > 0) {
  // 顯示稀有獎勵動畫
  showRareItemAnimation(result.rewards.bonus_items)
}

// 新增稀有獎勵動畫組件
function showRareItemAnimation(items: BonusItem[]) {
  // 使用 framer-motion 創建：
  // 1. 金色光芒從中心擴散
  // 2. 獎勵圖標旋轉飛入
  // 3. 星星粒子效果
  // 4. 特殊音效 (可選)
}
```

---

## 📝 AI 驅動任務生成 (進階功能)

### 當前實現狀態

**現有：** 靜態任務生成（基於預設規則）

**目標：** 基於實時用戶數據的 AI 驅動任務生成

### 改進方案：增強 `generate_daily_missions()` 函數

**檔案：** `db/sql/026_daily_missions.sql`

**需要的數據：**

```sql
-- 1. 計算用戶最弱領域（過去 7 天錯誤率最高）
WITH user_weak_areas AS (
  SELECT
    concept_id,
    COUNT(*) FILTER (WHERE is_correct = false) as error_count,
    COUNT(*) as total_attempts,
    (COUNT(*) FILTER (WHERE is_correct = false)::float / COUNT(*)) as error_rate
  FROM user_battle_history
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days'
  GROUP BY concept_id
  ORDER BY error_rate DESC
  LIMIT 1
),

-- 2. 計算用戶活躍度分數（過去 7 天）
user_activity AS (
  SELECT
    COUNT(DISTINCT DATE(created_at)) as active_days,
    COUNT(*) as total_actions
  FROM user_activity_log
  WHERE user_id = p_user_id
    AND created_at >= NOW() - INTERVAL '7 days'
),

-- 3. 獲取用戶連續登入天數
user_streak AS (
  SELECT streak_days
  FROM profiles
  WHERE id = p_user_id
)

-- 使用這些數據動態生成任務...
```

### 動態難度調整邏輯

```sql
-- 根據活躍度調整任務數量
v_target_count := CASE
  WHEN activity_score > 7 THEN 3  -- 高活躍用戶：3 次
  WHEN activity_score > 4 THEN 2  -- 中活躍用戶：2 次
  ELSE 1                          -- 低活躍用戶：1 次
END;
```

---

## 🔧 部署檢查清單

### 數據庫遷移

- [ ] 確認 `026_daily_missions.sql` 已執行
- [ ] 驗證 RLS 策略已啟用
- [ ] 測試 `generate_daily_missions()` 函數
- [ ] 測試 `update_mission_progress()` 函數

### API 端點

- [ ] `/api/missions/daily` GET - 獲取任務
- [ ] `/api/missions/daily` POST - 領取獎勵
- [ ] `/api/missions/progress` POST - 更新進度（已增強）
- [ ] 驗證所有端點返回正確的 JSON 格式

### 前端組件

- [ ] 部署 `DailyMissionWidgetV2.tsx`
- [ ] 在 Play 頁面整合新 Widget
- [ ] 測試動畫效果（需要瀏覽器）
- [ ] 測試 Toast 通知顯示

### 進度追蹤整合

- [ ] Battle 系統整合 `trackMissionEvent()`
- [ ] 小雞餵食整合 `trackMissionEvent()`
- [ ] 錯題複習整合 `trackMissionEvent()`
- [ ] 測試所有事件觸發正確

### 樣式與動畫

- [ ] 確認 `tailwind.config.ts` 包含 `pulse-glow` 動畫
- [ ] 測試金色光暈效果
- [ ] 測試 Shimmer 閃爍效果
- [ ] 測試任務完成動畫

---

## 🎨 自定義調整指南

### 調整色彩

所有色彩都基於 Tailwind 的 CSS 變量，可在 `globals.css` 中統一調整：

```css
/* 修改主色 */
--primary: 42 98% 70%;  /* 改為您喜歡的 HSL 值 */

/* 修改強調色 */
--accent: 123 23% 42%;  /* 綠色 */
```

### 調整動畫速度

```tsx
// DailyMissionWidgetV2.tsx

// 金色光暈速度
animate={{ /* ... */ }}
transition={{ duration: 2 }}  // 改為 1.5 或 2.5

// Shimmer 閃爍速度
transition={{ duration: 2 }}  // 改為更快或更慢
```

### 調整 Toast 持續時間

```typescript
// mission-tracker.ts

toast.success('訊息', {
  duration: 3000  // 改為 2000 或 5000 毫秒
})
```

---

## 📊 監控與分析建議

### 關鍵指標追蹤

建議在 `mission-tracker.ts` 中加入以下分析：

```typescript
// 追蹤任務完成率
analytics.track('mission_completed', {
  mission_id: mission.id,
  mission_type: mission.type,
  completion_time: Date.now() - mission.created_at
})

// 追蹤領取獎勵行為
analytics.track('rewards_claimed', {
  total_xp: rewards.xp,
  total_gold: rewards.gold,
  bonus_items: rewards.bonus_items
})
```

### A/B 測試建議

1. **任務難度測試**
   - A 組：固定 target_count = 2
   - B 組：動態 target_count（基於活躍度）
   - 測量：完成率、回訪率

2. **獎勵機制測試**
   - A 組：標準獎勵
   - B 組：稀有獎勵（10% 機率）
   - 測量：領取率、用戶黏著度

---

## 🚀 快速啟動步驟

### 1. 最小可行實現 (MVP)

```bash
# 1. 確認數據庫遷移
psql -d your_database -f apps/web/db/sql/026_daily_missions.sql

# 2. 在 Play 頁面替換 Widget
# apps/web/app/(app)/play/page.tsx
import { DailyMissionWidgetV2 } from '@/components/play/DailyMissionWidgetV2'

# 3. 整合進度追蹤（選一個系統開始）
# 例如：在 Battle 系統中
import { trackMissionEvent } from '@/lib/mission-tracker'
await trackMissionEvent('BATTLE_WON')

# 4. 測試
npm run dev
```

### 2. 完整實現

依序完成：
1. ✅ 部署數據庫遷移
2. ✅ 部署新版 Widget
3. ✅ 整合所有系統的進度追蹤
4. ⚠️ 實現稀有獎勵動畫
5. ⚠️ 實現 AI 驅動任務生成

---

## 💡 常見問題

### Q: 如何測試任務生成？

```sql
-- 在 Supabase SQL Editor 中執行
SELECT generate_daily_missions('your_user_id_here');
```

### Q: 如何手動更新任務進度？

```sql
SELECT update_mission_progress(
  'your_user_id_here',
  'play_battle',
  1
);
```

### Q: Toast 通知沒有顯示？

檢查：
1. `sonner` 已安裝：`pnpm list sonner`
2. 在根組件中添加 `<Toaster />` provider
3. 確認 API 返回 `newly_completed` 欄位

### Q: 動畫效果不正常？

檢查：
1. `tailwind.config.ts` 包含 `pulse-glow` 動畫
2. `framer-motion` 已安裝
3. 瀏覽器支持 CSS animations

---

## 🎯 總結

此升級方案完全基於您的 **Warm Minimalist Palette** 設計理念，確保：

✅ 色彩一致性 - 使用您定義的 HSL 變量
✅ 視覺層次 - 金黃色 (primary) + 綠色 (accent) 的完美搭配
✅ 情緒價值 - 金色光暈、完成動畫、稀有獎勵提示
✅ 即時反饋 - Toast 通知、樂觀 UI
✅ 系統整合 - Battle、Chick、Error Book 全方位追蹤

**下一步建議：**
1. 部署 `DailyMissionWidgetV2` 替換舊版
2. 整合 `mission-tracker` 到 Battle 系統
3. 測試完整流程
4. 收集用戶回饋
5. 逐步實現進階功能（AI 生成、稀有獎勵動畫）

祝您的每日任務系統大獲成功！🚀
