# 🐣 Chick 行為引擎 + 心理學鉤子實施總結

**實施日期**: 2025-12-04
**狀態**: ✅ Phase D+E Complete
**基於**: 專案架構規劃 (D) Chick 能量 + (E) 心理學鉤子

---

## 📋 目錄

1. [(D) Chick 行為引擎](#d-chick-行為引擎)
2. [(E) 心理學鉤子補滿](#e-心理學鉤子補滿)
3. [新增組件清單](#新增組件清單)
4. [使用指南](#使用指南)
5. [整合步驟](#整合步驟)

---

## 🐣 (D) Chick 行為引擎

### 目標

將 Chick 從「裝飾元素」升級為「行為引導引擎」，主動提示用戶完成特定任務。

### 實施內容

#### 1. **ChickFloatingWidget** - 滾動響應式 Widget

**檔案**: [`apps/web/components/companion/chick-floating-widget.tsx`](apps/web/components/companion/chick-floating-widget.tsx)

**核心功能**:
- ✅ **滾動自適應**: 常態 64px，滾動 >100px 時縮小至 40px
- ✅ **智能定位**: 不遮擋 TabBar 和 InputDock
  - 未滾動: `bottom: calc(var(--tab-bar-height) + 1.5rem)`
  - 滾動後: `bottom: calc(var(--tab-bar-height) + 0.75rem)` + `right: 1rem`
- ✅ **行為提示系統**: `useChickBehaviorPrompts()` hook

#### 2. **行為提示規則**

基於 Chick 狀態 (`hunger`, `emotionState`) 和能量狀態 (`energy`) 自動生成提示：

| 條件 | 優先級 | 提示訊息 | 行為導向 |
|------|--------|---------|---------|
| `hunger > 70` | 🔴 High | "我好餓... 去完成一場對戰來賺飼料吧！" | 引導至 Play 頁面 |
| `emotionState === 'sad' \| 'cold'` | 🟡 Medium | "心情有點糟... 去做 5 題錯題複習讓我開心一點吧！" | 引導至 Backpack 錯題 |
| `energy <= 2 && energy > 0` | 🟡 Medium | "再打一場你就沒體力了，建議先休息或買能量包喔！" | 引導至 Store 或提醒 |
| `energy === maxEnergy` | 🟢 Low | "能量滿了！趕快去對戰吧，不然就浪費了～" | 引導至 Play 頁面 |

**實施方式**:
```tsx
const behaviorPrompt = useChickBehaviorPrompts()

// 優先顯示行為提示 > 系統訊息
const displayMessage = behaviorPrompt?.message || getCurrentMessage()?.text
```

---

## 🧠 (E) 心理學鉤子補滿

### 1. Loss Aversion (損失厭惡)

**組件**: [`LossAversionCard`](apps/web/components/home/LossAversionCard.tsx)

**觸發條件**: 用戶有未複習的錯題

**視覺設計**:
- **高緊迫** (剩餘 ≤2 天): 紅色背景 + 警告圖示 + 脈衝動畫
- **中緊迫** (剩餘 3-5 天): 橙色背景
- **低緊迫** (剩餘 6-7 天): 黃色背景

**核心元素**:
- 錯題數量強調: "你有 **12 題** 錯題"
- 損失框架: "快過了黃金複習期（剩餘 2 天）"
- 黃金複習期進度條: 視覺化時間流逝
- 明確 CTA: "立即複習" 按鈕

**使用範例**:
```tsx
import { LossAversionCard } from '@/components/home/LossAversionCard'

<LossAversionCard
  wrongQuestionsCount={12}
  daysUntilExpiry={2}
/>
```

---

### 2. Social Proof (社群證明)

**組件**: [`SocialProofCard`](apps/web/components/profile/SocialProofCard.tsx)

**觸發條件**: Profile 頁面自動顯示

**視覺設計**:
- **頂尖玩家** (≥90%): 紫色漸變 + 🏆 徽章
- **優秀玩家** (≥75%): 藍色漸變 + ⭐ 徽章
- **進步中** (≥50%): 綠色漸變 + 👍 徽章
- **加油** (<50%): 黃色漸變 + 💪 徽章

**核心元素**:
- 百分位數字: "你的等級超越了 **75%** 的用戶"
- 全站排名: "#234 / 10,000"
- 動態進度條: 1s 動畫展示百分位
- 里程碑提示: "🎯 再加油一點就能進入頂尖 10%！"

**使用範例**:
```tsx
import { SocialProofCard } from '@/components/profile/SocialProofCard'

<SocialProofCard
  currentLevel={25}
  percentile={75}
  totalUsers={10000}
/>
```

---

### 3. Scarcity (稀缺性)

**組件**: [`ScarcityBadge`](apps/web/components/store/ScarcityBadge.tsx)

**觸發條件**: 限時/限量商品

**視覺設計**:
- **Badge 模式**: 顯示在商品卡片角落
  - `critical` (剩餘 <6h): 紅色 + 脈衝動畫 + 秒數倒數
  - `high` (剩餘 6-24h): 橙色
  - `medium` (剩餘 1-3 天): 黃色
  - `low` (剩餘 >3 天): 藍色

- **Banner 模式**: 顯示在商品卡片內部
  - 完整倒數計時: 天/時/分/秒
  - 限量商品: "僅剩 5 份"
  - 熱賣商品: "🔥 熱賣中"

**使用範例**:
```tsx
import { ScarcityBadge } from '@/components/store/ScarcityBadge'

// Badge 模式（商品角落）
<ScarcityBadge
  expiresAt={new Date('2025-12-05T23:59:59')}
  type="limited-time"
  variant="badge"
/>

// Banner 模式（商品卡片內）
<ScarcityBadge
  expiresAt={new Date('2025-12-05T23:59:59')}
  type="limited-stock"
  remainingStock={5}
  variant="banner"
/>
```

---

### 4. Endowment Effect (稟賦效應)

**組件**: [`EndowmentProgressCard`](apps/web/components/profile/EndowmentProgressCard.tsx)

**觸發條件**: Profile 頁面、Backpack 頁面

**視覺設計**:
- **已擁有區域**:
  - 3x2 網格展示前 6 個已解鎖徽章/道具
  - Hover 放大效果
  - 超過 6 個顯示 "+3 個已解鎖"

- **下一個很近**:
  - 藍色漸變卡片
  - 顯示進度條與解鎖條件
  - 強調 "快要解鎖了" 的獎勵期待

- **尚未解鎖預覽**:
  - 鎖頭圖示
  - 灰階顯示
  - 4x1 網格預覽

**核心元素**:
- 收集進度: "5 / 20" + 進度條
- 已擁有物品網格: 視覺化展示財產
- 下一個成就提示: "進度 85%，再完成 3 場對戰即可解鎖！"

**使用範例**:
```tsx
import { EndowmentProgressCard, AchievementItem } from '@/components/profile/EndowmentProgressCard'

const badges: AchievementItem[] = [
  {
    id: 'rookie',
    name: '新手',
    description: '完成首次對戰',
    icon: '🏅',
    isUnlocked: true,
  },
  {
    id: 'warrior',
    name: '戰士',
    description: '完成 10 場對戰',
    icon: '⚔️',
    isUnlocked: false,
    progress: 70, // 已完成 7/10
    requirement: '再完成 3 場對戰即可解鎖！'
  }
]

<EndowmentProgressCard
  title="我的徽章"
  items={badges}
  nextItem={badges.find(b => !b.isUnlocked && b.progress! > 50)}
  variant="badges"
/>
```

---

## 📦 新增組件清單

| 組件 | 路徑 | 用途 |
|------|------|------|
| `ChickFloatingWidget` | `apps/web/components/companion/chick-floating-widget.tsx` | 滾動響應式 Chick Widget + 行為引導 |
| `LossAversionCard` | `apps/web/components/home/LossAversionCard.tsx` | 錯題複習提醒（Home 頁面） |
| `SocialProofCard` | `apps/web/components/profile/SocialProofCard.tsx` | 排名百分位展示（Profile 頁面） |
| `ScarcityBadge` | `apps/web/components/store/ScarcityBadge.tsx` | 限時/限量倒數計時（Store 頁面） |
| `EndowmentProgressCard` | `apps/web/components/profile/EndowmentProgressCard.tsx` | 已擁有徽章/道具展示（Profile 頁面） |

---

## 📖 使用指南

### Home 頁面整合

```tsx
// apps/web/app/(app)/home/page.tsx

import { LossAversionCard } from '@/components/home/LossAversionCard'
import { ChickFloatingWidget } from '@/components/companion/chick-floating-widget'

export default function HomePage() {
  // 從 API 或狀態管理取得錯題數據
  const wrongQuestionsCount = 12 // 示例
  const daysUntilExpiry = 2 // 示例

  return (
    <>
      <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
        {/* 損失厭惡卡片 */}
        <LossAversionCard
          wrongQuestionsCount={wrongQuestionsCount}
          daysUntilExpiry={daysUntilExpiry}
        />

        {/* 其他現有內容 */}
        <DailySnapshot />
        <NextActionCard />
      </main>

      {/* Chick Widget - 全局浮動 */}
      <ChickFloatingWidget />
    </>
  )
}
```

---

### Profile 頁面整合

```tsx
// apps/web/app/(app)/profile/page.tsx

import { SocialProofCard } from '@/components/profile/SocialProofCard'
import { EndowmentProgressCard } from '@/components/profile/EndowmentProgressCard'

export default function ProfilePage() {
  // 從 API 取得數據
  const currentLevel = 25
  const percentile = 75
  const badges = [...] // AchievementItem[]

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
      {/* 社群證明卡片 */}
      <SocialProofCard
        currentLevel={currentLevel}
        percentile={percentile}
        totalUsers={10000}
      />

      {/* 稟賦效應卡片 */}
      <EndowmentProgressCard
        title="我的徽章"
        items={badges}
        nextItem={badges.find(b => !b.isUnlocked && b.progress && b.progress > 50)}
        variant="badges"
      />

      {/* 其他現有內容 */}
      <DreamSchoolProgressCard />
    </main>
  )
}
```

---

### Store 頁面整合

```tsx
// apps/web/app/(app)/store-shop/page.tsx

import { ScarcityBadge } from '@/components/store/ScarcityBadge'

export default function StorePage() {
  const products = [
    {
      id: '1',
      name: '限時題本',
      expiresAt: new Date('2025-12-05T23:59:59'),
      remainingStock: 5,
    }
  ]

  return (
    <main className="mx-auto max-w-lg px-4 pt-6 pb-24 space-y-6">
      {products.map(product => (
        <div key={product.id} className="relative">
          {/* Badge 模式 - 顯示在角落 */}
          <ScarcityBadge
            expiresAt={product.expiresAt}
            type="limited-stock"
            remainingStock={product.remainingStock}
            variant="badge"
          />

          <Card className="p-6">
            <h3>{product.name}</h3>
            {/* 產品內容 */}

            {/* Banner 模式 - 顯示在內部 */}
            <ScarcityBadge
              expiresAt={product.expiresAt}
              type="limited-time"
              variant="banner"
            />
          </Card>
        </div>
      ))}
    </main>
  )
}
```

---

## 🔧 整合步驟

### 1. 替換現有 TamagotchiWidget

```tsx
// 1. 移除舊的 import
// import { TamagotchiWidget } from '@/components/companion/tamagotchi-widget'

// 2. 使用新的 ChickFloatingWidget
import { ChickFloatingWidget } from '@/components/companion/chick-floating-widget'

// 3. 在 Layout 或主要頁面中使用
<ChickFloatingWidget />
```

### 2. 添加 API 端點（如果尚未存在）

需要以下數據：

| 端點 | 用途 | 回傳數據 |
|------|------|----------|
| `GET /api/mistakes/summary` | 錯題統計 | `{ count: number, daysUntilExpiry: number }` |
| `GET /api/profile/rank` | 排名百分位 | `{ percentile: number, rank: number, totalUsers: number }` |
| `GET /api/badges/progress` | 徽章進度 | `{ badges: AchievementItem[] }` |
| `GET /api/store/items` | 商品列表 | `{ items: StoreItem[] }` 包含 `expiresAt`, `remainingStock` |

### 3. 全局樣式確認

確保以下 CSS 變數已定義（已在 Phase 1 完成）:

```css
/* apps/web/app/globals.css */
--tab-bar-height: 64px;
--ask-input-dock-height: 56px;
--safe-area-inset-bottom: env(safe-area-inset-bottom, 0px);
```

---

## ✅ 功能驗證 Checklist

### Chick 行為引擎
- [ ] Chick Widget 在滾動時從 64px 縮小至 40px
- [ ] 滾動時 Widget 移動到右下角，不遮擋 TabBar
- [ ] 滾動時隱藏 SpeechBubble、StreakBadge、Glow
- [ ] `hunger > 70` 時顯示 "去完成一場對戰來賺飼料" 提示
- [ ] `emotionState === 'sad'` 時顯示 "去做 5 題錯題複習" 提示
- [ ] `energy <= 2` 時顯示 "再打一場你就沒體力了" 提示
- [ ] `energy === maxEnergy` 時顯示 "能量滿了！趕快去對戰" 提示

### Loss Aversion
- [ ] 有錯題時顯示 `LossAversionCard`
- [ ] 剩餘時間 ≤2 天時顯示紅色高緊迫樣式
- [ ] 黃金複習期進度條正確顯示
- [ ] 點擊 "立即複習" 跳轉至 `/backpack?tab=mistakes`

### Social Proof
- [ ] 正確計算並顯示百分位數（75%）
- [ ] 正確計算並顯示全站排名（#234）
- [ ] 進度條動畫正常播放
- [ ] 根據百分位顯示對應的主題色彩與徽章

### Scarcity
- [ ] Badge 模式在商品角落顯示
- [ ] Banner 模式在商品內部顯示
- [ ] 倒數計時每秒更新
- [ ] 剩餘時間 <6 小時時顯示秒數 + 脈衝動畫
- [ ] 過期後自動隱藏

### Endowment Effect
- [ ] 已解鎖徽章正確顯示在網格中
- [ ] Hover 放大效果正常
- [ ] "下一個很近" 卡片顯示最接近解鎖的成就
- [ ] 進度條正確顯示進度百分比
- [ ] 未解鎖徽章顯示鎖頭圖示

---

## 🚀 效果預期

### 行為改變

| 心理學原理 | 預期行為改變 | 衡量指標 |
|-----------|------------|---------|
| Loss Aversion | 提升錯題複習率 | 錯題複習完成率 +30% |
| Social Proof | 提升每日活躍度 | DAU +15%, 平均對戰場次 +20% |
| Scarcity | 提升限時商品轉換率 | 限時商品購買率 +40% |
| Endowment Effect | 提升徽章收集動力 | 徽章解鎖率 +25%, 留存率 +10% |
| Chick 行為引導 | 提升關鍵行為完成率 | 對戰參與率 +20%, 能量使用率 +35% |

### 用戶體驗提升

- ✅ **智能引導**: Chick 主動提示下一步行動，減少用戶決策負擔
- ✅ **緊迫感**: 倒數計時與稀缺性提示，促進立即行動
- ✅ **成就感**: 排名展示與已擁有物品展示，提升滿足感
- ✅ **損失框架**: 錯題過期提示，觸發損失厭惡心理
- ✅ **社群比較**: 百分位數字，激發競爭與進步動力

---

## 🔮 未來優化方向

1. **A/B Testing**: 測試不同提示文案的轉換率
2. **個性化**: 根據用戶行為歷史調整提示優先級
3. **動態倒數**: Store 商品庫存實時更新
4. **推送通知**: 錯題過期前 1 天推送提醒
5. **獎勵放大**: 解鎖徽章時顯示慶祝動畫

---

**實施狀態**: ✅ All Components Complete
**無破壞性修改**: ✅ 所有新組件為獨立模組，不影響現有功能
**遵循設計系統**: ✅ 使用 Phase 1 定義的 Design Tokens

🎉 Phase D + E 完成！
