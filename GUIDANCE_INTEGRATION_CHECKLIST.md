# ✅ 引導系統整合清單

## 🎯 快速開始 (5 分鐘)

### Step 1: 安裝依賴 (已完成)
- [x] `apps/web/lib/guidance/guidance-engine.ts` - 核心引擎
- [x] `apps/web/lib/guidance/useGuidance.tsx` - React Hooks
- [x] `apps/web/components/guidance/GuidanceTooltip.tsx` - UI 組件
- [x] `apps/web/components/guidance/GuidanceProvider.tsx` - Provider

### Step 2: 整合到根 Layout

```tsx
// apps/web/app/layout.tsx
import { GuidanceProvider } from '@/components/guidance/GuidanceProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <GuidanceProvider>  {/* 🎯 添加這行 */}
          {children}
        </GuidanceProvider>
      </body>
    </html>
  )
}
```

### Step 3: 在 Onboarding 完成時設置標記

```tsx
// apps/web/app/onboarding/reward/page.tsx
const handleComplete = () => {
  // 🎯 添加這行
  sessionStorage.setItem('first_run_after_onboarding', 'true')

  router.push('/play?from=onboarding')
}
```

---

## 📋 頁面整合清單

### Play 頁面

#### ✅ 需要完成的任務

1. **啟用自動檢測**

```tsx
// apps/web/app/(app)/play/page.tsx
import { useGuidance } from '@/lib/guidance/useGuidance'

const { recordOperation } = useGuidance({
  autoDetectT04: true,
  autoDetectT01: {
    enabled: true,
    delayMs: 10000,
  },
  page: 'play',
})
```

2. **添加 data 屬性**

```tsx
// 已存在的按鈕，添加 data 屬性
<button data-mode-card="system">系統對戰</button>
<button data-mode-card="custom">自訂對戰</button>
<button data-mode-card="ugc">內容貢獻</button>
<button data-mode-card="practice">無限練習</button>
<button data-mode-card="focus">專注修煉</button>

<div data-widget="daily-mission">
  <DailyMissionWidgetV2 />
</div>
```

3. **記錄操作**

```tsx
const handleModeClick = (mode: string) => {
  recordOperation() // 🎯 添加這行
  // ... 其他邏輯
}
```

#### 🎯 預期引導

- T04: "開始對戰!" (Level 1 Halo)
- T01: "無壓力練習" (Level 2 Tooltip)
- T01: "專注模式提升效率" (Level 2 Tooltip)

---

### Ask 頁面

#### ✅ 需要完成的任務

1. **啟用自動檢測**

```tsx
// apps/web/app/(app)/ask/page.tsx
import { useGuidance } from '@/lib/guidance/useGuidance'

const { recordOperation } = useGuidance({
  autoDetectT01: {
    enabled: true,
    delayMs: 10000,
  },
  page: 'ask',
})
```

2. **添加 data 屬性**

```tsx
// apps/web/components/ask/ModeTabs.tsx
<button data-tab="solve">解題</button>
<button data-tab="summary">摘要</button>
```

3. **檢測低效重複**

```tsx
import { useInefficientRepetition } from '@/lib/guidance/useGuidance'

const { trackAction } = useInefficientRepetition('manual-solve', 3)

const handleSolve = () => {
  trackAction() // 達到 3 次後自動觸發引導
  recordOperation()
  // ... 其他邏輯
}
```

#### 🎯 預期引導

- T04: "拍照解題!" (Level 1 Halo)
- T01: "試試摘要模式!" (Level 2 Tooltip)

---

### Backpack 頁面

#### ✅ 需要完成的任務

1. **啟用自動檢測**

```tsx
// apps/web/app/(app)/backpack/BackpackContentV3.tsx
import { useGuidance } from '@/lib/guidance/useGuidance'

const { recordOperation } = useGuidance({
  autoDetectT01: {
    enabled: true,
    delayMs: 10000,
  },
  page: 'backpack',
})
```

2. **添加 data 屬性**

```tsx
<button data-action="batch-organize">批次整理</button>
<button data-upload-type="link">使用雲端連結</button>
```

3. **檢測錯誤**

```tsx
import { useErrorCorrection } from '@/lib/guidance/useGuidance'

const { trackError } = useErrorCorrection('upload-file-size', 2)

const handleUpload = (file: File) => {
  if (file.size > 5MB) {
    trackError({ fileSize: file.size })
    // ... 錯誤處理
  }
}
```

#### 🎯 預期引導

- T04: "查看筆記" (Level 1 Halo)
- T02: "批次整理更快!" (Level 2 Tooltip)
- T03: "試試雲端連結" (Level 3 Modal)

---

## 🧪 測試清單

### 功能測試

- [ ] T04 引導在 Onboarding 完成後顯示
- [ ] T04 引導最多顯示 3 個
- [ ] T04 引導有 30 分鐘冷卻期
- [ ] T01 引導在停留 10 秒後顯示
- [ ] T02 引導在重複操作 3 次後顯示
- [ ] T03 引導在錯誤 2 次後顯示
- [ ] 引導可以永久關閉
- [ ] 引導在 7 秒後自動消失 (Level 2)

### 視覺測試

- [ ] Level 1 Halo 效果正確顯示
- [ ] Level 2 Tooltip 位置正確 (top/bottom/left/right)
- [ ] Level 3 Modal 居中顯示，有背景遮罩
- [ ] 引導在移動端正確顯示
- [ ] 引導動畫流暢（無抖動）

### 冷卻機制測試

- [ ] 顯示引導後進入冷卻期
- [ ] 冷卻期內不顯示新引導
- [ ] T04 階段完成後冷卻期變為 4 小時
- [ ] 操作計數正確累加
- [ ] 重置功能正常工作

---

## 📊 監控指標

### 需要追蹤的數據

1. **引導顯示率**
   - 每個引導的顯示次數
   - 每個引導的觸發條件命中率

2. **用戶互動率**
   - 引導關閉率（永久 vs Session）
   - 引導完成率（用戶實際使用功能）
   - 平均觀看時間

3. **功能使用率提升**
   - 引導前 vs 引導後的功能使用率
   - A/B 測試不同文案的效果

4. **用戶體驗指標**
   - 引導相關的負面反饋
   - NPS 分數變化
   - 留存率影響

### 埋點示例

```typescript
// apps/web/lib/guidance/guidance-engine.ts
markAsShown(featureName: string): void {
  // ... 現有邏輯

  // 發送到分析系統
  analytics.track('guidance_shown', {
    feature_name: featureName,
    trigger_id: item.triggerID,
    presentation_level: item.presentationLevel,
    timestamp: Date.now(),
  })
}

dismissGuidance(featureName: string, dismissalType: 'permanent' | 'session'): void {
  // ... 現有邏輯

  analytics.track('guidance_dismissed', {
    feature_name: featureName,
    dismissal_type: dismissalType,
    timestamp: Date.now(),
  })
}
```

---

## 🚀 部署清單

### Pre-deployment

- [ ] 所有功能測試通過
- [ ] 視覺測試通過（Desktop + Mobile）
- [ ] 冷卻機制測試通過
- [ ] Code Review 完成
- [ ] 文檔更新完成

### Deployment

- [ ] Staging 環境測試
- [ ] A/B 測試設置（可選）
- [ ] 監控儀表板設置
- [ ] 回滾方案準備

### Post-deployment

- [ ] 監控引導顯示率（前 24 小時）
- [ ] 收集用戶反饋
- [ ] 分析功能使用率變化
- [ ] 準備迭代計劃

---

## 🔧 故障排除

### 引導未顯示

1. 檢查是否在冷卻期內
2. 檢查 `data-*` 屬性是否正確
3. 檢查觸發條件是否滿足
4. 檢查瀏覽器 Console 是否有錯誤

### 引導位置錯誤

1. 確認目標元素已渲染
2. 檢查元素位置是否動態變化
3. 嘗試調整 `position` 參數

### 冷卻期異常

1. 清除 localStorage 測試
2. 檢查時間戳計算邏輯
3. 確認操作計數正確

---

## 📞 支援資源

- **完整文檔**: `GUIDANCE_SYSTEM_IMPLEMENTATION.md`
- **測試頁面**: `/dev-tools/guidance-demo`
- **核心代碼**: `apps/web/lib/guidance/`
- **組件代碼**: `apps/web/components/guidance/`

---

**建議整合順序**:
1. ✅ Play 頁面（核心功能，優先級最高）
2. ✅ Ask 頁面（高頻使用）
3. ✅ Backpack 頁面（錯誤糾正重要）
4. Community/Profile/Store 頁面（可延後）

**預計整合時間**: 2-3 小時
**預期上線日期**: 本週內
