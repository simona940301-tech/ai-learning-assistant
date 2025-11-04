# Batch 1 Hotfix Implementation Guide
# 必要 UI 微調（小改、卻關鍵）

**Date**: 2025-10-26
**Status**: ✅ Implementation Complete
**Version**: 1.0.0

---

## 🎯 Overview / 總覽

Batch 1 hotfix 包含 4 項關鍵 UI 改進，專注於提升轉化率和使用者體驗，**不改動任何後端 API 或資料庫 schema**。

### Implemented Features / 已實作功能

1. ✅ **QR 一步流** - 安裝並開始練習（一鍵完成）
2. ✅ **首頁 Micro-Mission 卡片** - 顯示剩餘題數、預估時間、連續天數
3. ✅ **事件上報視覺提示** - 「已儲存」徽章 + 關頁自動 flush
4. ✅ **詳解卡 CTA 優化** - 三個明確的練習按鈕

---

## 📁 File Structure / 檔案結構

### New Files Created (13 files) / 新增檔案

```
apps/web/
├── i18n/
│   └── zh-TW.json                              # 中文翻譯
├── lib/
│   ├── i18n.ts                                 # i18n 工具函式
│   └── feature-flags.ts                        # Feature flag 系統
├── components/
│   ├── common/
│   │   ├── SavedBadge.tsx                      # 「已儲存」徽章
│   │   └── Confetti.tsx                        # 完成任務動畫
│   ├── qr/
│   │   └── QrResultCard.tsx                    # QR 結果卡片（一步流）
│   ├── micro/
│   │   └── MicroMissionCard.tsx                # 首頁任務卡片
│   └── explain/
│       └── ExplanationCard.tsx                 # 詳解卡（優化 CTA）
├── app/
│   ├── qr/[alias]/
│   │   └── page.tsx                            # QR 頁面
│   └── (app)/home/
│       └── page.tsx                            # 首頁
└── tests/e2e/
    ├── qr-flow.spec.ts                         # QR 流程測試
    ├── micro-card.spec.ts                      # Micro-Mission 測試
    ├── explain-cta.spec.ts                     # CTA 測試
    └── flush.spec.ts                           # Analytics flush 測試
```

### Modified Files (1 file) / 修改檔案

```
packages/shared/analytics/
└── index.ts                                    # 新增事件 + beforeunload flush
```

---

## 🚀 Quick Start / 快速開始

### 1. Feature Flags / 功能開關

所有功能預設開啟，可透過環境變數控制：

```bash
# .env.local
NEXT_PUBLIC_HOTFIX_BATCH1=true          # 總開關
NEXT_PUBLIC_HOTFIX_QR_ONE_STEP=true     # QR 一步流
NEXT_PUBLIC_HOTFIX_MICRO_CARD=true      # Micro-Mission 卡片
NEXT_PUBLIC_HOTFIX_SAVED_BADGE=true     # 已儲存徽章
NEXT_PUBLIC_HOTFIX_CTA_TEXT=true        # 詳解卡 CTA
```

要關閉某功能，設為 `false`：

```bash
NEXT_PUBLIC_HOTFIX_QR_ONE_STEP=false
```

### 2. Installation / 安裝

```bash
# No additional dependencies required
# 所有實作使用現有依賴

# Just rebuild the app
npm run build
```

### 3. Development / 開發

```bash
# Start dev server
npm run dev

# Run E2E tests
npm run test:e2e

# Run specific test suite
npx playwright test qr-flow
```

---

## 📋 Feature Details / 功能詳情

### 1️⃣ QR One-Step Flow / QR 一步流

**路徑**: `/qr/[alias]`

**使用者流程**:
1. 掃描 QR code → 進入 `/qr/pack-alias`
2. 點擊「安裝並開始練習」按鈕
3. 自動安裝題包 → 自動開始任務 → 進入第一題

**關鍵功能**:
- ✅ 一鍵完成安裝 + 開始（2 點內到首題，P95）
- ✅ Loading 狀態防止重複點擊
- ✅ 失敗時顯示錯誤 + 重試按鈕
- ✅ Fallback: 顯示推薦題包（過期/下架/找不到）
- ✅ 已安裝題包直接顯示「開始練習」

**Analytics 事件**:
```typescript
track('qr_page_view', { alias, resolvedPackId, hasInstalled, found });
track('pack_install_click', { source: 'qr', packId });
track('pack_install_success', { packId, source: 'qr' });
track('pack_install_failed', { packId, errorCode });
track('mission_start_auto', { source: 'qr', packId });
```

**測試**:
```bash
npx playwright test qr-flow
```

---

### 2️⃣ Micro-Mission Card / 每日微任務卡片

**路徑**: `/home`

**顯示資訊**:
- 📊 **今日剩餘題數** - 從 API 取得（`questionCount - totalAnswered`）
- ⏱️ **預估時間** - 固定顯示「預估 3-4 分鐘」
- 🔥 **連續天數** - 從 API 取得 `streak` 數值
- ✅ **完成狀態** - 顯示答對題數、進度條

**互動效果**:
- Confetti 動畫（完成任務時）
- Streak +1 徽章（完成後短暫顯示 2 秒）
- 進度條動畫（答題進度）
- 按鈕狀態：「開始練習」/「繼續練習」/「明天再來」（已完成）

**無障礙**:
- Confetti 動畫遵守 `prefers-reduced-motion`（< 2.5s）
- ARIA labels 正確設定
- 鍵盤可操作

**Analytics 事件**:
```typescript
track('micro_card_viewed', { missionId, status, streak });
track('micro_start_click', { missionId, status });
track('micro_completed_today', {
  streakBefore,
  streakAfter,
  remainingBefore,
  remainingAfter
});
```

**測試**:
```bash
npx playwright test micro-card
```

---

### 3️⃣ Event Tracking Visual Feedback / 事件上報視覺提示

#### A) "已儲存" Badge / Saved Badge

**位置**: 右上角（不遮擋操作）

**行為**:
- 答題後顯示 1.2 秒
- 自動淡出（無需手動關閉）
- 不阻擋使用者操作（`pointer-events: none`）

**無障礙**:
- `role="status"` + `aria-live="polite"`
- 遵守 `prefers-reduced-motion`（只淡入淡出，不移動）

#### B) BeforeUnload Flush / 關頁自動上傳

**觸發時機**:
1. 頁面關閉（`beforeunload`）
2. 切換分頁（`visibilitychange` → hidden）
3. 重新整理頁面

**實作策略**:
```typescript
// 優先使用 sendBeacon（更可靠）
if (navigator.sendBeacon) {
  navigator.sendBeacon('/api/analytics/batch', blob);
} else {
  // Fallback: fetch with keepalive
  fetch('/api/analytics/batch', {
    method: 'POST',
    body: payload,
    keepalive: true,
  });
}
```

**成功率要求**: ≥ 99.5%

**測試**:
```bash
npx playwright test flush
```

---

### 4️⃣ Explanation Card CTA / 詳解卡 CTA 優化

**三個 CTA 按鈕**:
1. **主按鈕（Primary）**: 「再練一題」
   - 同技能、相近難度（±1 level）
   - 寬度 100%、藍色背景

2. **次按鈕 1（Secondary）**: 「換一題類似的」
   - 相鄰技能或相同題型
   - 50% 寬度、灰色邊框

3. **次按鈕 2（Secondary）**: 「再挑一題」
   - 完全隨機但避免重複
   - 50% 寬度、灰色邊框

**互動要求**:
- ✅ 點擊後 2 秒內進入下一題（P95）
- ✅ Loading 狀態防止重複點擊
- ✅ 所有 CTA 皆呼叫 `POST /api/missions/start`（Sampler 決定題目）
- ✅ API 失敗時 graceful fallback（直接導向 /play）

**Analytics 事件**:
```typescript
track('explain_card_viewed', { questionId, skillId, difficulty });
track('cta_practice_again_click', { skillId, difficultyBand });
track('cta_practice_similar_click', { neighborSkillId, typeGroup });
track('cta_practice_another_click', { avoidDuplicates: true });
```

**測試**:
```bash
npx playwright test explain-cta
```

---

## 🧪 Testing / 測試

### Manual Testing Checklist / 手動測試清單

#### QR One-Step Flow
- [ ] 未安裝題包 → 點擊「安裝並開始練習」→ 2 秒內到首題
- [ ] 安裝中按鈕顯示 loading，無法重複點擊
- [ ] 安裝失敗顯示錯誤訊息 + 重試按鈕
- [ ] 已安裝題包顯示「開始練習」按鈕
- [ ] 過期題包顯示 fallback 推薦

#### Micro-Mission Card
- [ ] 顯示今日剩餘題數（正確）
- [ ] 顯示「預估 3-4 分鐘」
- [ ] 顯示連續天數（正確）
- [ ] 進行中任務顯示進度條
- [ ] 完成任務顯示 Confetti + Streak +1（2 秒）
- [ ] 已完成任務按鈕 disabled

#### Saved Badge + Flush
- [ ] 答題後右上角顯示「已儲存」1.2 秒
- [ ] 徽章不遮擋操作
- [ ] 關閉頁面時 console 顯示「Beacon sent」
- [ ] 切換分頁時觸發 flush

#### Explanation Card CTA
- [ ] 三個 CTA 按鈕正確顯示
- [ ] 點擊「再練一題」→ 2 秒內進入下一題
- [ ] Loading 狀態正確顯示
- [ ] API 失敗時仍能導航到 /play

### Automated E2E Tests / 自動化測試

```bash
# Run all Batch 1 tests
npm run test:e2e

# Run specific suite
npx playwright test qr-flow          # QR flow tests
npx playwright test micro-card       # Micro-mission card tests
npx playwright test explain-cta      # CTA tests
npx playwright test flush            # Analytics flush tests

# Run with UI (debug mode)
npx playwright test --ui

# Generate HTML report
npx playwright test --reporter=html
```

---

## 📊 Performance Metrics / 效能指標

### Success Criteria / 成功標準

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| QR → 首題時間 (P95) | < 2 clicks, < 5s | TBD | 🟡 待測 |
| CTA → 下一題 (P95) | < 2s | TBD | 🟡 待測 |
| Flush 成功率 | ≥ 99.5% | TBD | 🟡 待測 |
| Saved badge 延遲 | 1.2s ± 0.1s | ✅ 1.2s | ✅ 達標 |
| Confetti 動畫時長 | < 2.5s | ✅ 2.0s | ✅ 達標 |

### Load Testing / 負載測試

```bash
# TBD: Add load testing commands
# 使用 Artillery or k6
```

---

## 🔧 Troubleshooting / 疑難排解

### Issue: QR flow 安裝失敗

**症狀**: 點擊「安裝並開始練習」後顯示錯誤

**檢查項目**:
1. 檢查 `/api/pack/install` API 是否正常
2. 檢查使用者是否已登入
3. 檢查題包 ID 是否正確
4. 檢查 console 錯誤訊息

**解決方式**:
```typescript
// Check API response
fetch('/api/pack/install', {
  method: 'POST',
  body: JSON.stringify({ packId: 'xxx' }),
}).then(res => res.json()).then(console.log);
```

---

### Issue: Micro-Mission card 不顯示

**症狀**: 首頁空白或只顯示 loading

**檢查項目**:
1. Feature flag 是否開啟：`NEXT_PUBLIC_HOTFIX_MICRO_CARD=true`
2. `/api/missions` API 是否回傳資料
3. 使用者是否有今日任務

**解決方式**:
```bash
# Check API response
curl http://localhost:3000/api/missions \
  -H "Cookie: your-auth-cookie"
```

---

### Issue: Analytics 沒有 flush

**症狀**: 關閉頁面後 console 沒有「Beacon sent」訊息

**檢查項目**:
1. 是否呼叫 `setupBeforeUnloadFlush()`（在 app 初始化）
2. 瀏覽器是否支援 `sendBeacon`
3. Analytics buffer 是否有資料

**解決方式**:
```typescript
// In app root component
useEffect(() => {
  setupBeforeUnloadFlush();
}, []);
```

---

### Issue: CTA 按鈕點擊沒反應

**症狀**: 點擊「再練一題」沒有導航

**檢查項目**:
1. Feature flag 是否開啟：`NEXT_PUBLIC_HOTFIX_CTA_TEXT=true`
2. `/api/missions/start` API 是否正常
3. Console 是否有錯誤

**解決方式**:
```typescript
// Check if feature flag is enabled
import { useFeatureFlag } from '@/lib/feature-flags';

const isEnabled = useFeatureFlag('HOTFIX_CTA_TEXT');
console.log('CTA enabled:', isEnabled);
```

---

## 🚨 Rollback Plan / 回滾計畫

### Quick Rollback / 快速回滾

關閉所有功能：

```bash
# .env.local
NEXT_PUBLIC_HOTFIX_BATCH1=false
```

重新部署：

```bash
npm run build
npm run start
```

### Selective Rollback / 選擇性回滾

只關閉特定功能：

```bash
# 只關閉 QR 一步流
NEXT_PUBLIC_HOTFIX_QR_ONE_STEP=false

# 其他功能保持開啟
NEXT_PUBLIC_HOTFIX_MICRO_CARD=true
NEXT_PUBLIC_HOTFIX_SAVED_BADGE=true
NEXT_PUBLIC_HOTFIX_CTA_TEXT=true
```

---

## 📝 Deployment Checklist / 部署檢查清單

### Pre-Deployment / 部署前

- [ ] 所有 E2E 測試通過
- [ ] 手動測試清單完成
- [ ] Feature flags 設定正確
- [ ] i18n 翻譯正確
- [ ] 無障礙檢查通過（ARIA labels, keyboard navigation）
- [ ] Performance metrics 符合標準

### Deployment / 部署

- [ ] Build 成功
- [ ] 部署到 staging 環境
- [ ] Staging 測試通過
- [ ] 部署到 production
- [ ] Production smoke test

### Post-Deployment / 部署後

- [ ] 監控 error rate（應 < 0.1%）
- [ ] 監控 performance metrics
- [ ] 檢查 analytics 事件是否正常上報
- [ ] 收集使用者回饋

---

## 📞 Support / 支援

### Contact / 聯絡方式

- **開發團隊**: dev@plms.com
- **PM (Simona)**: simona@plms.com

### Issue Reporting / 問題回報

在 GitHub 開 issue，使用以下模板：

```markdown
## Issue Description
[描述問題]

## Steps to Reproduce
1. [步驟 1]
2. [步驟 2]
3. [步驟 3]

## Expected Behavior
[預期行為]

## Actual Behavior
[實際行為]

## Screenshots
[截圖]

## Environment
- Browser: [Chrome 120]
- Device: [iPhone 15]
- Feature Flag: [HOTFIX_BATCH1=true]
```

---

## 🎉 Success Metrics / 成功指標

### Week 1 Goals / 第一週目標

- [ ] QR → 首題轉換率 > 95%
- [ ] Micro-Mission 卡片點擊率 > 60%
- [ ] CTA 點擊率 > 40%
- [ ] Analytics flush 成功率 > 99.5%

### Long-term Goals / 長期目標

- [ ] D1 Retention +5%
- [ ] D7 Retention +3%
- [ ] 平均每日練習題數 +2 題

---

## 📚 References / 參考資料

- [Original Requirements (Chinese)](./HOTFIX_BATCH1_REQUIREMENTS.md)
- [Module 3 Enhancement v2 Report](./docs/reports/03-micro-missions-v2.md)
- [Playwright Documentation](https://playwright.dev/)
- [Feature Flag Best Practices](https://martinfowler.com/articles/feature-toggles.html)

---

**Last Updated**: 2025-10-26
**Version**: 1.0.0
**Status**: ✅ Ready for Deployment
