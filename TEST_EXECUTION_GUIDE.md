# 🧪 完整 User Flow 測試執行指南

## 📋 概述

此測試套件包含完整的用戶旅程測試和性能審查，採用**方案一（完整流程測試）+ 方案二（核心性能指標）**的組合。

## 🚀 執行測試

### 前置要求

1. **確保開發服務器運行**
   ```bash
   pnpm run dev:web
   ```

2. **確保測試環境準備就緒**
   - 本地數據庫連接正常
   - 環境變數配置正確

### 執行測試

```bash
# 執行完整 UX 審查測試
npx playwright test tests/e2e/complete-user-flow-ux-audit.spec.ts

# 或者使用專案配置的測試命令
pnpm test:e2e:ux-audit
```

### 測試範圍

測試將涵蓋以下完整流程：

#### 階段 1: Onboarding Flow
1. Goal 設定 (`/onboarding/goal`)
2. Avatar 選擇 (`/onboarding/avatar`)
3. Challenge 測驗 (`/onboarding/challenge`)
4. Reward 查看 (`/onboarding/reward`)
5. Habits 設定 (`/onboarding/habits`)
6. Complete 完成 (`/onboarding/complete`)

#### 階段 2: 核心功能
1. Home 首頁 (`/home`)
2. Community 社群 (`/community`)
3. Play 練習 (`/play`)
4. Ask 提問 (`/ask`)
5. Backpack 書包 (`/backpack`)
6. Store 商店 (`/store`)
7. Profile 個人資料 (`/profile`)

## 📊 測試指標

### Core Web Vitals
- **FCP (First Contentful Paint)**: < 1800ms (良好)
- **LCP (Largest Contentful Paint)**: < 2500ms (良好)
- **CLS (Cumulative Layout Shift)**: < 0.1 (良好)
- **TTI (Time to Interactive)**: < 3500ms (良好)

### 其他性能指標
- **頁面載入時間**: < 2000ms (良好)
- **API 響應時間 (P95)**: < 500ms (良好)
- **互動響應時間**: < 100ms (良好)

## 📄 測試報告

測試完成後，會在 `test-reports/` 目錄生成以下文件：

### JSON 報告
- `ux-audit-report-{timestamp}.json`
- 包含完整的測試數據，可用於進一步分析

### 生成 Markdown 報告

從 JSON 報告生成可讀的 Markdown 報告：

```bash
# 使用生成的 JSON 報告路徑
tsx scripts/generate-ux-report.ts test-reports/ux-audit-report-{timestamp}.json
```

Markdown 報告將包含：
- 📊 執行摘要
- 🎯 性能評分總覽
- ⚠️ 性能問題清單（按嚴重程度分類）
- 📡 API 性能分析
- 📋 詳細步驟結果
- 💡 優化建議
- 📝 總結

## 🔍 報告解讀

### 性能評分
- ✅ **良好 (Good)**: 所有指標都在標準範圍內
- ⚠️ **需改善 (Needs Improvement)**: 部分指標超過標準但未達嚴重程度
- 🔴 **差 (Poor)**: 有嚴重性能問題需要立即處理

### 問題嚴重程度
- 🔴 **High**: 嚴重問題，立即處理
- 🟡 **Medium**: 中等問題，近期處理
- 🟢 **Low**: 輕微問題，可排期處理

## 🛠️ 故障排除

### 測試失敗
如果測試失敗，檢查：
1. 開發服務器是否正常運行（`http://localhost:3000`）
2. 網絡連接是否正常
3. 數據庫連接是否正常
4. 檢查測試日誌中的錯誤訊息

### 性能指標異常
如果性能指標異常，檢查：
1. 開發環境的網絡狀況
2. 數據庫查詢是否優化
3. API 響應時間是否正常
4. 是否有大量資源載入

### 報告生成失敗
如果報告生成失敗：
1. 確認 JSON 報告文件存在
2. 檢查文件格式是否正確
3. 查看錯誤訊息獲取詳細信息

## 📈 持續改進

### 定期執行
建議每週執行一次完整測試，追蹤性能變化。

### 性能基準
建立性能基準線，當指標超過基準時立即處理。

### 優化優先級
根據報告中的問題嚴重程度和影響範圍，制定優化計劃。

## 🔗 相關文檔

- [完整測試提案](./COMPLETE_UX_AUDIT_PROPOSAL.md)
- [Playwright 配置](./playwright.config.ts)
- [性能收集工具](./tests/utils/performance-collector.ts)

---

**最後更新**: 2025-01-30