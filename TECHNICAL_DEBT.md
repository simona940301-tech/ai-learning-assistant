# 🔧 技術債追蹤文件

> **最後更新**: 2025-01-XX  
> **狀態**: 持續追蹤中

---

## 📋 技術債清單

### 🔴 高優先度（影響核心功能）

#### 1. RAG 題目生成未實作 ✅ 已完成
- **位置**: 
  - `apps/web/app/api/error-book/practice/route.ts` (第 150, 230 行)
- **問題**: 錯題本練習功能中，當概念標籤不足時，應該使用 RAG 生成題目，但目前只有 TODO 註解
- **影響**: 錯題本練習功能不完整，無法為用戶生成個性化練習題
- **優先級**: P0
- **狀態**: ✅ 已整合 RAG 題目生成服務 (`generateFromErrorBook`)
- **完成日期**: 2025-01-XX

#### 2. Analytics Batch Endpoint 未實作 ✅ 已完成
- **位置**: 前端呼叫 `/api/analytics/batch`，但後端未實作
- **問題**: Console 會顯示 404 錯誤（不影響功能，但影響數據收集）
- **影響**: Analytics 事件無法批次上傳，可能影響數據完整性
- **優先級**: P1
- **狀態**: ✅ 已實作 (`apps/web/app/api/analytics/batch/route.ts`)
- **完成日期**: 已存在

#### 3. Proficiency Calculation API 未實作 ✅ 已完成
- **位置**: `apps/web/lib/proficiency-calculator.ts` 已實作，但未暴露為 API
- **問題**: 缺少 `/api/proficiency/calculate` 端點
- **影響**: 個人化系統無法即時計算用戶能力值
- **優先級**: P1
- **狀態**: ✅ 已實作 (`apps/web/app/api/proficiency/calculate/route.ts`)
- **完成日期**: 已存在

#### 4. 管理員權限檢查未實作 ✅ 已完成
- **位置**: 
  - `apps/web/app/api/admin/universities/ocr/route.ts` (第 26 行)
  - `apps/web/app/api/admin/universities/route.ts` (第 23, 62 行)
- **問題**: 管理員 API 缺少權限檢查，存在安全風險
- **影響**: 任何用戶都可能調用管理員 API
- **優先級**: P0
- **狀態**: ✅ 已實作權限檢查（檢查 `profiles.role` 是否為 `admin` 或 `teacher`）
- **完成日期**: 2025-01-XX

---

### 🟡 中優先度（影響功能完整性）

#### 5. Deprecated 代碼清理 ⚠️ 待確認觀察期
- **位置**: 
  - `legacy/types-deprecated.ts` - 標記為 deprecated 的型別
  - `apps/web/app/api/warmup/keypoint-mcq-simple/route.ts` - 已標記為 410 Gone
- **問題**: 舊代碼仍存在，可能造成混淆
- **影響**: 代碼庫冗餘，維護成本增加
- **優先級**: P2
- **狀態**: ⚠️ 需確認 14 天觀察期已過（參考 `DEPRECATED.md`）
- **注意**: 
  - `keypoint-mcq-simple` API 已返回 410，但仍被部分文件引用（`lib/use-tutor-flow.ts`, `lib/heartbeat.ts`）
  - `types-deprecated.ts` 仍被部分文件 re-export（`lib/tutor-strategies.ts`, `lib/tutor-detector.ts`）
  - 建議：確認觀察期後，先更新引用處，再刪除 deprecated 文件

#### 6. 題型配額機制未實作
- **位置**: Micro-Mission 抽題系統
- **問題**: 沒有「60% 選擇題 + 40% 填充題」的配額邏輯
- **影響**: 任務可能全是選擇題或全是填充題，缺乏多樣性
- **優先級**: P2
- **預計工時**: 1 天
- **參考**: `docs/HOTFIX_BATCH1_SUMMARY.md` (第 303-310 行)

#### 7. CTA 近難度定義不明確
- **位置**: Micro-Mission 詳解卡 CTA
- **問題**: 「再練一題」應該明確指定「同技能 + ±1 難度」，但目前由 Sampler 自動決定
- **影響**: 用戶體驗不一致
- **優先級**: P2
- **預計工時**: 1 天
- **參考**: `docs/HOTFIX_BATCH1_SUMMARY.md` (第 314-328 行)

---

### 🟢 低優先度（優化與工具）

#### 8. Deprecated npm 套件
- **位置**: `pnpm-lock.yaml`
- **問題**: 多個 deprecated 套件（Babel plugins, ESLint configs 等）
- **影響**: 可能影響未來維護，但當前不影響功能
- **優先級**: P3
- **預計工時**: 2-3 天（需測試）

#### 9. KPI 追蹤系統視覺化
- **位置**: Micro-Mission 系統
- **問題**: 缺少視覺化儀表板和自動化每日報告
- **影響**: 營運團隊無法即時監控關鍵指標
- **優先級**: P3
- **預計工時**: 3 天
- **參考**: `docs/reports/03-micro-missions-v2.md` (第 204-220 行)

#### 10. A/B 測試基礎建設
- **位置**: Micro-Mission 詳解卡 CTA
- **問題**: 缺少 A/B 測試機制（CTA 文案/排序測試）
- **影響**: 無法數據驅動優化
- **優先級**: P3
- **預計工時**: 2-3 天
- **參考**: `docs/reports/03-micro-missions-v2.md` (第 222-236 行)

#### 11. 抽題效能優化
- **位置**: Micro-Mission 抽題系統
- **問題**: P95 抽題耗時 120-150ms，未達標（目標 < 80ms）
- **影響**: 用戶體驗略受影響
- **優先級**: P3
- **預計工時**: 1-2 天
- **參考**: `docs/reports/03-micro-missions-v2.md` (第 295-306 行)

---

## 📊 技術債統計

| 優先級 | 數量 | 預計總工時 |
|--------|------|-----------|
| P0 (高) | 2 | 3.5-5.5 天 |
| P1 (中高) | 2 | 2-4 天 |
| P2 (中) | 3 | 3 天 |
| P3 (低) | 4 | 8-11 天 |
| **總計** | **11** | **16.5-23.5 天** |

---

## 🎯 建議處理順序

### 第一階段（本週）
1. ✅ 管理員權限檢查（P0, 0.5 天）
2. ✅ Analytics Batch Endpoint（P1, 1-2 天）

### 第二階段（下週）
3. ✅ RAG 題目生成（P0, 3-5 天）
4. ✅ Proficiency Calculation API（P1, 1-2 天）

### 第三階段（本月）
5. ✅ Deprecated 代碼清理（P2, 1 天）
6. ✅ 題型配額機制（P2, 1 天）
7. ✅ CTA 近難度定義（P2, 1 天）

### 第四階段（未來）
8. ✅ KPI 追蹤系統（P3）
9. ✅ A/B 測試基礎建設（P3）
10. ✅ 抽題效能優化（P3）
11. ✅ Deprecated npm 套件更新（P3）

---

## 📝 更新記錄

- **2025-01-XX**: 初始建立技術債追蹤文件

---

## 🔗 相關文件

- `DEPRECATED.md` - 已棄用 API 清單
- `ARCHITECTURE.md` - 架構規範
- `PERSONALIZATION_SYSTEM_PROGRESS_REPORT.md` - 個人化系統進度
- `docs/HOTFIX_BATCH1_SUMMARY.md` - Hotfix 批次 1 摘要
- `docs/reports/03-micro-missions-v2.md` - Micro-Mission 系統報告

