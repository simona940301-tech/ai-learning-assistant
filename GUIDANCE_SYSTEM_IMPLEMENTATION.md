# 🎯 極簡主義情境化引導系統 - 實施指南

## 📋 目錄

1. [系統概述](#系統概述)
2. [核心原則](#核心原則)
3. [安裝步驟](#安裝步驟)
4. [使用指南](#使用指南)
5. [觸發機制](#觸發機制)
6. [自定義引導](#自定義引導)
7. [測試與調試](#測試與調試)

---

## 系統概述

### 🎯 設計目標

在**不干擾用戶主要任務流程**的前提下，通過**情境化提示**（而非強制教學），引導用戶高效發現和使用應用程式中的關鍵功能和效率捷徑。

### 🧠 心理學基礎

| 原則 | 說明 | 實現方式 |
|------|------|----------|
| **認知負荷最小化** | 單次引導只傳遞一個資訊，文案 < 8 字，< 7 秒自動消失 | `autoHideMs={7000}` + 簡短文案 |
| **自主權賦予 (SDT)** | 用戶可隨時「跳過/不再顯示」任何引導 | 永久關閉選項 + Session 關閉 |
| **情境化優先** | 引導基於用戶實際行為觸發 | 四種觸發機制 (T01-T04) |
| **漸進式揭露** | 優先使用低侵入性方式 | 3 個呈現層級 (Halo → Tooltip → Modal) |

---

## 核心原則

### ⚙️ 四種觸發情境 (T01-T04)

| ID | 情境 | 優先級 | 策略目的 |
|----|------|--------|----------|
| **T04** | Post-Onboarding First Run<br>Onboarding 完成後 5 分鐘內 | 0 (最高) | 快速鞏固 3 個核心功能 |
| **T03** | Minor Error Correction<br>用戶操作導致非嚴重錯誤 | 1 | 提供即時精準的糾正性引導 |
| **T02** | Inefficient Repetition<br>用戶手動執行低效操作 ≥3 次 | 2 | 提升效率，展示捷徑 |
| **T01** | Exploration Stall<br>用戶在頁面停留 ≥10 秒無操作 | 3 (最低) | 提示可能在尋找的功能 |

### 🛠️ 三個呈現層級

| 層級 | 呈現方式 | 侵入性 | 適用階段 |
|------|----------|--------|----------|
| **Level 1** | 視覺微光 (Halo/Glow) | 極低 | T04 階段、高效能 T02 |
| **Level 2** | 提示氣泡 (Tooltip Bubble) | 中等 | T01、T02、T03 |
| **Level 3** | 半模態引導 (Light Modal) | 高 | 僅限關鍵的 T03 情境 |

### 🚫 冷卻機制

- **T04 階段冷卻期**: 30 分鐘 或 5 個操作行為
- **標準冷卻期**: 4 小時（任何引導執行後）
- **T04 階段限制**: 最多顯示 3 個引導（核心功能）

---

## 安裝步驟

### Step 1: 整合到根 Layout

編輯 `apps/web/app/layout.tsx`:

```tsx
import { GuidanceProvider } from '@/components/guidance/GuidanceProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GuidanceProvider>
          {/* 其他 Providers */}
          {children}
        </GuidanceProvider>
      </body>
    </html>
  )
}
```

### Step 2: 在 Onboarding 完成時設置標記

編輯 `apps/web/app/onboarding/reward/page.tsx`:

```tsx
import { useRouter } from 'next/navigation'

function RewardPage() {
  const router = useRouter()

  const handleComplete = () => {
    // 設置 sessionStorage 標記
    sessionStorage.setItem('first_run_after_onboarding', 'true')

    // 跳轉到主頁面（帶 query param）
    router.push('/play?from=onboarding')
  }

  return (
    <button onClick={handleComplete}>
      完成新手引導
    </button>
  )
}
```

### Step 3: 在頁面中啟用自動檢測

#### 示例 1: Play 頁面 (T04 + T01)

編輯 `apps/web/app/(app)/play/page.tsx`:

```tsx
'use client'

import { useGuidance } from '@/lib/guidance/useGuidance'
import { useEffect } from 'react'

export default function PlayPage() {
  // 啟用自動檢測
  const { recordOperation } = useGuidance({
    autoDetectT04: true,        // 檢測 Post-Onboarding
    autoDetectT01: {
      enabled: true,             // 檢測 Exploration Stall
      delayMs: 10000,           // 10 秒無操作後觸發
    },
    page: 'play',
  })

  // 記錄用戶操作（用於 T04 冷卻）
  const handleModeClick = (mode: string) => {
    recordOperation()
    // ... 其他邏輯
  }

  return (
    <div>
      <button
        data-mode-card="system"  {/* 🎯 重要：添加 data 屬性供引導定位 */}
        onClick={() => handleModeClick('system')}
      >
        系統對戰
      </button>
    </div>
  )
}
```

#### 示例 2: Ask 頁面 (T01 + T02)

編輯 `apps/web/app/(app)/ask/page.tsx`:

```tsx
'use client'

import { useGuidance, useInefficientRepetition } from '@/lib/guidance/useGuidance'

export default function AskPage() {
  const { recordOperation } = useGuidance({
    autoDetectT01: {
      enabled: true,
      delayMs: 10000,
    },
    page: 'ask',
  })

  // 檢測低效重複操作 (T02)
  const { trackAction } = useInefficientRepetition('manual-solve', 3)

  const handleSolve = () => {
    trackAction() // 自動追蹤，達到 3 次後觸發引導
    recordOperation()
    // ... 其他邏輯
  }

  return (
    <div>
      <button onClick={handleSolve}>解題</button>
      <button data-tab="summary">摘要模式</button> {/* 引導目標 */}
    </div>
  )
}
```

#### 示例 3: Backpack 頁面 (T03 - 錯誤糾正)

編輯 `apps/web/app/(app)/backpack/BackpackContentV3.tsx`:

```tsx
'use client'

import { useErrorCorrection } from '@/lib/guidance/useGuidance'

export function BackpackContentV3() {
  const { trackError } = useErrorCorrection('upload-file-size', 2)

  const handleUpload = async (file: File) => {
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB

    if (file.size > MAX_SIZE) {
      // 追蹤錯誤，達到 2 次後觸發引導
      trackError({ fileSize: file.size })
      alert('檔案太大！')
      return
    }

    // ... 上傳邏輯
  }

  return (
    <div>
      <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />
      <button data-upload-type="link">使用雲端連結</button> {/* 引導目標 */}
    </div>
  )
}
```

---

## 使用指南

### 🎨 添加 Data 屬性標記

引導系統使用 **CSS 選擇器** 定位目標元素，請確保目標元素有對應的 `data-*` 屬性：

```tsx
// ✅ 正確：添加 data 屬性
<button data-mode-card="system">系統對戰</button>
<button data-mode-card="practice">無限練習</button>
<button data-tab="summary">摘要模式</button>
<button data-upload-type="link">雲端連結</button>
<div data-widget="daily-mission">每日任務</div>

// ❌ 錯誤：沒有標記
<button>系統對戰</button>
```

### 📝 自定義引導內容

編輯 `apps/web/lib/guidance/guidance-engine.ts` 中的 `GUIDANCE_POOL`:

```typescript
export const GUIDANCE_POOL: GuidanceItem[] = [
  {
    featureName: 'YourFeature_Name',           // 唯一識別符
    triggerID: 'T02_InefficientRepetition',  // 觸發情境
    priority: 2,                              // 0-3，0 最高
    presentationLevel: 2,                     // 1: Halo, 2: Tooltip, 3: Modal
    copy: '批次操作更快!',                    // < 8 字文案
    condition: 'User repeats action 3+ times', // 條件說明（可選）
    targetElement: '[data-action="batch"]',   // CSS 選擇器
    position: 'bottom',                       // top|bottom|left|right
    dismissalOption: 'permanent',             // permanent|session|none
  },
  // ... 更多引導
]
```

### 🎯 文案撰寫原則

#### ❌ 避免

- "點擊這裡進行分類" （平鋪直敘，無吸引力）
- "您可以使用批次功能來提高效率" （太長，超過 8 字）
- "請試試我們的新功能" （不夠具體）

#### ✅ 使用

- "一鍵分類!" （強調效益）
- "批次整理更快!" （突出速度優勢）
- "省下 5 分鐘" （量化價值）
- "試試摘要模式!" （行動導向）

---

## 觸發機制

### T04: Post-Onboarding First Run

**自動觸發條件**:
1. URL 包含 `?from=onboarding`，或
2. `sessionStorage.getItem('first_run_after_onboarding') === 'true'`

**使用方式**:

```tsx
// 在 onboarding 完成後設置標記
sessionStorage.setItem('first_run_after_onboarding', 'true')
router.push('/play?from=onboarding')

// 在目標頁面啟用自動檢測
useGuidance({
  autoDetectT04: true,
  page: 'play',
})
```

**限制**:
- 最多顯示 **3 個引導**
- 每個引導間隔 **30 分鐘** 或 **5 個操作行為**

---

### T03: Minor Error Correction

**手動觸發**:

```tsx
import { useErrorCorrection } from '@/lib/guidance/useGuidance'

const { trackError } = useErrorCorrection('error-type-name', 2)

// 在錯誤發生時追蹤
if (error) {
  trackError({ errorDetails: '...' })
}
```

**常見應用場景**:
- 文件上傳大小超限
- 表單驗證失敗
- API 請求失敗

---

### T02: Inefficient Repetition

**手動觸發**:

```tsx
import { useInefficientRepetition } from '@/lib/guidance/useGuidance'

const { trackAction } = useInefficientRepetition('action-name', 3)

// 在用戶執行操作時追蹤
const handleAction = () => {
  trackAction() // 自動計數，達到閾值後觸發
  // ... 執行操作
}
```

**常見應用場景**:
- 手動逐個整理檔案（有批次功能可用）
- 手動配置設定（有快速預設可用）
- 重複執行低效操作

---

### T01: Exploration Stall

**自動觸發條件**:
- 用戶在頁面停留 ≥10 秒
- 無任何交互（mousedown、keydown、scroll、touchstart）

**使用方式**:

```tsx
useGuidance({
  autoDetectT01: {
    enabled: true,
    delayMs: 10000, // 10 秒（可自定義）
  },
  page: 'play',
})
```

**常見應用場景**:
- 用戶在設定頁面停滯
- 用戶瀏覽但未發現隱藏功能
- 用戶在選擇頁面猶豫不決

---

## 自定義引導

### 完整範例：添加「快速配對」引導

#### 1. 添加引導定義

編輯 `apps/web/lib/guidance/guidance-engine.ts`:

```typescript
export const GUIDANCE_POOL: GuidanceItem[] = [
  // ... 其他引導

  {
    featureName: 'Play_QuickMatch',
    triggerID: 'T02_InefficientRepetition',
    priority: 2,
    presentationLevel: 2,
    copy: '快速配對省時間',
    condition: 'User manually selects settings 3+ times',
    targetElement: '[data-quick-match="true"]',
    position: 'top',
    dismissalOption: 'permanent',
  },
]
```

#### 2. 添加目標元素標記

編輯 `apps/web/app/(app)/play/page.tsx`:

```tsx
<Button
  data-quick-match="true"  {/* 🎯 添加 data 屬性 */}
  onClick={handleQuickMatch}
>
  快速配對
</Button>
```

#### 3. 追蹤用戶操作

```tsx
import { useInefficientRepetition } from '@/lib/guidance/useGuidance'

const { trackAction } = useInefficientRepetition('manual-settings', 3)

const handleManualSettings = () => {
  trackAction() // 達到 3 次後自動觸發引導
  // ... 手動設定邏輯
}
```

---

## 測試與調試

### 🧪 測試 T04 引導

1. 完成 Onboarding 流程
2. 確認 URL 包含 `?from=onboarding`
3. 檢查是否顯示引導（1 秒延遲後）
4. 驗證冷卻機制（30 分鐘內不重複顯示）

### 🧪 測試 T01 引導

1. 進入任意頁面
2. 停留 10 秒不動（不要點擊、滾動）
3. 檢查是否顯示引導

### 🧪 測試 T02 引導

1. 重複執行同一操作 3 次
2. 檢查是否顯示引導

### 🧪 測試 T03 引導

1. 故意觸發錯誤 2 次（例如上傳超大檔案）
2. 檢查是否顯示引導

### 🔍 調試工具

在瀏覽器 Console 中執行:

```javascript
// 查看引導統計
const stats = guidanceEngine.getStats()
console.log(stats)

// 重置所有引導狀態（測試用）
guidanceEngine.resetAll()

// 手動觸發引導（測試用）
guidanceEngine.shouldShowGuidance('T04_PostOnboardingFirstRun')
```

### 📊 監控引導效果

編輯 `apps/web/lib/guidance/guidance-engine.ts`，添加 telemetry:

```typescript
markAsShown(featureName: string): void {
  // ... 現有邏輯

  // 🎯 發送到分析系統
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'guidance_shown', {
      feature_name: featureName,
      trigger_id: item.triggerID,
      presentation_level: item.presentationLevel,
    })
  }
}
```

---

## 🎓 最佳實踐

### ✅ 應該做的

1. **保持文案簡短** (<8 字)
2. **強調用戶獲得的好處** ("省時間"、"更快")
3. **提供永久關閉選項** (尊重用戶自主權)
4. **測試所有觸發情境** (避免誤觸發)
5. **監控引導完成率** (優化文案和時機)

### ❌ 不應該做的

1. **連續顯示多個引導** (遵守冷卻期)
2. **強制用戶看完引導** (必須可關閉)
3. **文案過長或複雜** (增加認知負荷)
4. **在關鍵操作時顯示** (干擾主流程)
5. **忽略移動端適配** (確保在小屏幕可見)

---

## 📈 預期效果

### 指標預測

| 指標 | 當前 | 目標 | 改善 |
|------|------|------|------|
| 核心功能發現率 | 40% | 75% | +88% |
| 高級功能使用率 | 15% | 45% | +200% |
| 用戶滿意度 (NPS) | 35 | 55 | +57% |
| 引導完成率 | - | >70% | - |

### 數據驗證計劃

- **Week 1**: 監控引導顯示率和關閉率
- **Week 2**: A/B 測試不同的文案和時機
- **Week 4**: 分析功能使用率提升情況
- **Month 2**: 評估留存率和用戶反饋

---

## 🚀 Roadmap

### Phase 1: 核心實現 (✅ 已完成)
- [x] 引導引擎核心邏輯
- [x] 三個呈現層級組件
- [x] React Hooks 封裝
- [x] 自動觸發機制

### Phase 2: 整合應用 (進行中)
- [ ] Play 頁面整合
- [ ] Ask 頁面整合
- [ ] Backpack 頁面整合
- [ ] 添加 data 屬性標記

### Phase 3: 優化迭代
- [ ] 添加動畫效果
- [ ] 多語言支持
- [ ] 引導序列（多步引導）
- [ ] 智能推薦（基於用戶行為）

### Phase 4: 數據驅動
- [ ] 引導效果分析儀表板
- [ ] A/B 測試框架
- [ ] 自動優化文案和時機

---

## 📚 參考資料

### 心理學理論

- **Fogg Behavior Model** (B=MAT): Motivation × Ability × Trigger
- **Self-Determination Theory (SDT)**: 自主權、勝任感、歸屬感
- **Cognitive Load Theory**: 減少外在認知負荷
- **Progressive Disclosure** (Jakob Nielsen): 漸進式揭露資訊

### 最佳案例

- **Duolingo**: 情境化提示 + 遊戲化引導
- **Notion**: 低侵入性工具提示
- **Linear**: 鍵盤快捷鍵引導
- **Superhuman**: 漸進式功能揭露

---

**實施完成日期**: 2025-11-28
**設計者**: Claude (頂尖 UX 設計師)
**版本**: v1.0
