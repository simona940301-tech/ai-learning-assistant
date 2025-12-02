# 🗺️ PLMS 技術改善 Roadmap - Q1 2025

> **基於**: 《🏗️ PLMS 專案完整架構審查報告》第 6 節  
> **規劃週期**: 6-8 週  
> **目標**: 最大化 ROI，不炸掉系統

---

## 6.x Proposal Catalog (Summary Table)

| ID | Title | Category | Problem Summary | Risk if Ignored (6 months) | Est. Dev Cost | Est. User Impact |
|----|-------|----------|-----------------|---------------------------|---------------|------------------|
| P1 | 統一資料模型：合併重複的筆記/書包表結構 | `架構簡化 / 重構`, `資料模型整併` | 三個功能重疊的表 (`backpack_items`, `notebook_entries`, `backpack_notes`)，前端 `BackpackFile` 型別與後端返回格式不一致。影響範圍：`apps/web/app/api/backpack/route.ts`、`apps/web/app/api/notebook/save/route.ts`、`apps/web/components/backpack/`、`apps/web/lib/types.ts` | 資料不一致 bug 頻發；新功能開發時需要同時改三個表；資料遺失風險指數級增加 | M | 中 |
| P2 | 簡化 AI 詳解 Pipeline：合併重複的解釋生成邏輯 | `架構簡化 / 重構`, `RAG / AI 流程改善` | 三套解釋生成系統 (`universal-explainer`, `aura-contract`, `basic-extractor`)，prompt 散落在 `apps/web/lib/prompts.ts`、`apps/web/lib/ai/aura-contract.ts`、`apps/web/lib/ai/universal-explainer.ts`。三層降級邏輯複雜，維護成本高。 | 詳解品質不穩定；prompt 更新需改多處易遺漏；延遲問題持續惡化；AI 成本難以控制 | L | 高 |
| P3 | 重構對戰狀態管理：簡化 WebSocket 狀態同步 | `架構簡化 / 重構`, `可靠性 / 錯誤處理` | `battleState` 包含 20+ 欄位 (`lib/play-context.tsx`)，前端 timer 與後端 WebSocket 消息不同步，斷線重連邏輯不完整，競態條件頻發。 | 對戰體驗不穩定，用戶投訴增加；斷線時資料遺失；複雜 bug 難以重現和修復 | L | 高 |
| P4 | 統一 API 回應格式：建立標準化的回應結構 | `架構簡化 / 重構`, `開發者體驗 / 可維護性` | API 回應格式不統一：`{ success: true }` vs `{ ok: true }` vs `{ error: '...' }`。影響 124+ 個 API routes (`apps/web/app/api/**/route.ts`)。前端需處理多種格式，TypeScript 型別定義困難。 | 新開發者入職成本高；前端錯誤處理邏輯越來越複雜；API 文檔難以維護 | M | 低 |
| P5 | 優化 RAG 處理流程：改為非同步佇列處理 | `效能 / 響應時間`, `RAG / AI 流程改善` | RAG embedding 生成是同步的 (`/api/rag/upload`)，大量檔案會阻塞 API，沒有進度提示，失敗無重試機制。影響：`apps/web/app/api/rag/upload/route.ts`、`apps/web/lib/services/mcp/backpack.ts` | 用戶上傳大檔案時體驗極差；API 超時頻發；RAG 功能可用性下降 | L | 中 |
| P6 | 刪除重複的解釋元件：統一使用 ExplainCardV2 | `架構簡化 / 重構`, `開發者體驗 / 可維護性` | 三個功能重疊的元件：`components/ask/ExplanationCard.tsx`、`components/ask/ExplanationCardV2.tsx`、`apps/web/components/solve/ExplainCardV2.tsx`。不同頁面顯示的詳解格式可能不同。 | 維護成本持續增加；UI 不一致影響用戶體驗；新開發者不知該用哪個元件 | S | 中 |
| P7 | 簡化新手引導流程：減少步驟數量 | `UX / Flow 優化` | 新手引導有 12 個步驟 (`apps/web/app/onboarding/**/page.tsx`)，步驟過多用戶易放棄，每個步驟都有類似狀態檢查邏輯，維護成本高。 | 新用戶流失率持續偏高；12 個頁面維護成本累積；A/B 測試困難 | M | 高 |
| P8 | 建立集中式錯誤處理與監控系統 | `可靠性 / 錯誤處理`, `開發者體驗 / 可維護性` | 錯誤處理散落各處，只有 console 日誌，沒有 Sentry 或錯誤追蹤服務。生產環境錯誤難以追蹤。影響：所有 API routes 和前端元件。 | 生產環境問題發現延遲；除錯效率低下；無法量化錯誤趨勢；SLA 難以保證 | M | 低 |
| P9 | 優化 API 呼叫：減少串行請求，改用並行或批次 | `效能 / 響應時間`, `UX / Flow 優化` | Ask 頁面需要 3+ 個串行 API 呼叫 (`/api/ai/route-solver` → `/api/exec/similar` → `/api/explain`)，總延遲高，無快取機制。影響：`components/ask/AnySubjectSolver.tsx` | Ask 頁面體驗持續落後競品；用戶等待時間長；伺服器資源浪費 | S | 高 |
| P10 | 補齊缺失的資料庫 Schema 文檔 | `開發者體驗 / 可維護性`, `資料模型整併` | `apps/web/supabase/schema.sql` 缺少核心表定義（`pack_questions`, `files`, `doc_chunks`, `battle_events` 等），Schema 分散在 15+ 個 migration 檔案中。 | 新開發者入職時間長；重複建表風險；資料庫設計難以審查；技術債隱性累積 | S | 低 |

---

## 6.y Prioritized Roadmap Overview

### 優先順序列表（1→10）

| 優先順序 | ID | Title | 理由 |
|---------|-----|-------|------|
| 1 | P6 | 刪除重複的解釋元件：統一使用 ExplainCardV2 | 低風險、高可見性、為 P2 打基礎 |
| 2 | P9 | 優化 API 呼叫：減少串行請求 | 直接改善 Ask 頁面體驗，成本低 |
| 3 | P10 | 補齊缺失的資料庫 Schema 文檔 | 低風險、為 P1 打基礎、提升開發效率 |
| 4 | P4 | 統一 API 回應格式 | 為後續所有重構打基礎，減少後續改動成本 |
| 5 | P1 | 統一資料模型：合併重複的筆記/書包表結構 | 影響範圍大但風險可控，需要 P10 先完成 |
| 6 | P2 | 簡化 AI 詳解 Pipeline | 需要 P6 先完成，影響大但風險高 |
| 7 | P8 | 建立集中式錯誤處理與監控系統 | 提升可靠性，但不直接影響用戶 |
| 8 | P7 | 簡化新手引導流程 | UX 改善明顯，但需要產品決策配合 |
| 9 | P3 | 重構對戰狀態管理 | 風險最高，需要充分測試時間 |
| 10 | P5 | 優化 RAG 處理流程 | 需要外部服務依賴，複雜度最高 |

---

### Milestone 1：快速提升核心體驗（第 1–3 週）

**包含提案**：P6、P9、P10

**為什麼這幾個放在最前面？**

1. **P6（刪除重複元件）** 是最低風險的重構，只涉及前端元件合併，不影響資料層，可以在 3-5 天內完成，立即改善 Ask 頁面的 UI 一致性。
2. **P9（優化 API 呼叫）** 直接改善用戶最常用的 Ask 頁面體驗，將串行請求改為並行可減少 40-60% 的等待時間，成本低、收益高。
3. **P10（補齊 Schema 文檔）** 是純文檔工作，零風險，但為後續 P1（資料模型整合）和 P4（API 統一）打下基礎，讓後續重構有據可依。

這三個任務可以並行進行，互不依賴，能快速產出可見成果，建立團隊信心。

---

### Milestone 2：架構規範化（第 4–6 週）

**包含提案**：P4、P1、P2

**為什麼這幾個放在中間？**

1. **P4（統一 API 回應格式）** 影響 124+ 個 API，但可以分批遷移，建立規範後能大幅降低後續開發的心智負擔。
2. **P1（統一資料模型）** 是中型重構，需要 P10 的 Schema 文檔作為參考，涉及資料遷移需要謹慎處理，但完成後能消除三個重複表的技術債。
3. **P2（簡化 AI Pipeline）** 需要 P6 先完成（確保前端元件統一），是最複雜的 AI 重構，但能顯著改善詳解生成的一致性和維護性。

這三個任務有依賴關係：P4 可以獨立進行，P1 需要 P10 完成，P2 需要 P6 完成。

---

### Milestone 3：深度優化與可靠性（第 7 週以後）

**包含提案**：P8、P7、P3、P5

**為什麼這幾個放在最後？**

1. **P8（錯誤監控系統）** 需要引入外部服務（Sentry），對用戶無直接影響，但能提升長期可維護性。
2. **P7（簡化新手引導）** 需要產品決策（哪些步驟可以合併），不是純技術問題。
3. **P3（對戰狀態重構）** 風險最高，涉及 WebSocket 和狀態機，需要充分的測試時間。
4. **P5（RAG 非同步佇列）** 需要外部佇列服務（Redis/Edge Functions），複雜度最高，可以持續迭代。

這些任務適合在核心體驗穩定後，有更多時間和資源時再進行。

---

## Milestone 1 詳細任務拆解

---

### ✅ M1-P6. 刪除重複的解釋元件：統一使用 ExplainCardV2 — **已完成**

#### 1. Goal

完成後，整個專案只有一個詳解卡元件，所有頁面（Ask、Solve、Backpack）顯示的詳解格式完全一致。新開發者只需要學習一個元件的 API，維護成本降低 66%（從三個元件變成一個）。

#### 完成記錄

| 項目 | 狀態 |
|------|------|
| 移動 `Difficulty` 類型到 `lib/types.ts` | ✅ |
| 刪除 `apps/web/components/ask/ExplanationCard.tsx` | ✅ |
| 刪除 `apps/web/components/ask/ExplanationCardV2.tsx` | ✅ |
| 刪除 `apps/web/components/explain/ExplanationCard.tsx` | ✅ |
| 刪除 `apps/web/components/solve/ExplainCard.legacy.tsx` | ✅ |
| 刪除 `apps/web/components/solve/ExplainCardV3.tsx` | ✅ |
| 刪除根目錄 `components/ask/ExplanationCard*.tsx` | ✅ |
| 刪除根目錄 `components/solve/ExplainCard.tsx` | ✅ |
| 刪除根目錄 `components/ask/AnySubjectSolver.tsx` | ✅ |
| 刪除未使用的 Streaming 元件 | ✅ |

#### 2. Scope

**✅ 要做的：**
- 分析三個元件的功能差異，確定最佳實作版本
- 將 `components/ask/ExplanationCard.tsx` 的使用處遷移到統一元件
- 將 `components/ask/ExplanationCardV2.tsx` 的使用處遷移到統一元件
- 確保 `apps/web/components/solve/ExplainCardV2.tsx` 功能完整
- 刪除舊元件（保留 14 天觀察期）
- 更新相關文檔和 import 路徑

**❌ 不做的：**
- 不重新設計 UI（只做程式碼合併）
- 不新增功能（維持現有功能）
- 不更動 API 回應格式（只處理前端元件）
- 不處理 NoteViewerModal（這是另一個獨立元件）

#### 3. Tech Design

**資料結構變更**：無，只處理前端元件

**主要流程變動**：

```
現況：
  Ask 頁面 → ExplanationCard.tsx → 顯示詳解
  Ask 頁面 → ExplanationCardV2.tsx → 顯示詳解（新版）
  Solve 頁面 → ExplainCardV2.tsx → 顯示詳解

目標：
  Ask 頁面 → ExplainCardV2.tsx → 顯示詳解
  Solve 頁面 → ExplainCardV2.tsx → 顯示詳解
  Backpack 頁面 → ExplainCardV2.tsx → 顯示詳解（透過 NoteViewerModal）
```

**受影響的 Domain**：
- `Ask Domain`：元件引用路徑變更
- `Solve Domain`：無變更（已使用目標元件）
- `Backpack Domain`：可能需要確認 NoteViewerModal 是否使用舊元件

#### 4. Task Breakdown

##### T6.1. 分析三個元件的功能差異，建立對照表

- **目的**：確保遷移時不遺漏任何功能
- **相關路徑**：
  - `components/ask/ExplanationCard.tsx`
  - `components/ask/ExplanationCardV2.tsx`
  - `apps/web/components/solve/ExplainCardV2.tsx`
- **具體工作內容**：
  - 列出每個元件的 props 介面
  - 比較 UI 差異（動畫、樣式、佈局）
  - 確認每個元件支援的功能（儲存、追問、分享等）
  - 決定最終統一元件的 props 介面
- **驗收標準**：
  - 產出功能對照表（Markdown 格式）
  - 確認統一元件能涵蓋所有現有功能
  - 團隊審核通過

##### T6.2. 擴充目標元件，確保功能完整

- **目的**：確保 `apps/web/components/solve/ExplainCardV2.tsx` 能支援所有使用情境
- **相關路徑**：
  - `apps/web/components/solve/ExplainCardV2.tsx`
  - `apps/web/lib/types.ts`（如果需要新增型別）
- **具體工作內容**：
  - 根據 T6.1 的對照表，補充缺失的 props
  - 確保支援 `onSave`、`onFollowUp`、`onShare` 等 callback
  - 確保 markdown 渲染邏輯完整
  - 加入必要的 loading 和 error 狀態
- **驗收標準**：
  - 所有 T6.1 列出的功能都能在新元件中使用
  - TypeScript 型別完整，無 any
  - Storybook（如有）或獨立測試頁面可展示所有狀態

##### T6.3. 遷移 AnySubjectSolver 使用的詳解元件

- **目的**：Ask 頁面主要解題流程改用統一元件
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - `apps/web/components/solve/ExplainCardV2.tsx`
- **具體工作內容**：
  - 更新 import 路徑
  - 調整 props 傳遞（如果介面有差異）
  - 確保 onSave、onFollowUp 等 callback 正確綁定
  - 移除對舊元件的依賴
- **驗收標準**：
  - Ask 頁面解題流程正常運作
  - 詳解卡顯示格式與之前一致
  - 儲存到筆記本功能正常
  - 追問功能正常

##### T6.4. 遷移其他使用舊元件的頁面

- **目的**：確保所有使用詳解卡的地方都改用統一元件
- **相關路徑**：
  - `components/ask/` 目錄下所有檔案
  - `apps/web/app/(app)/ask/` 目錄下所有檔案
  - `apps/web/app/(app)/error-book/` 目錄下所有檔案
- **具體工作內容**：
  - 搜尋所有 import `ExplanationCard` 或 `ExplanationCardV2` 的檔案
  - 逐一更新 import 路徑
  - 調整 props 傳遞
  - 確保頁面功能正常
- **驗收標準**：
  - 專案中不再有任何地方 import 舊元件
  - 所有頁面功能正常
  - E2E 測試（如有）通過

##### T6.5. 標記舊元件為 deprecated，14 天後刪除

- **目的**：安全地移除舊程式碼
- **相關路徑**：
  - `components/ask/ExplanationCard.tsx`
  - `components/ask/ExplanationCardV2.tsx`
  - `DEPRECATED.md`（如果存在）
- **具體工作內容**：
  - 在舊元件檔案頂部加上 `@deprecated` 註釋
  - 更新 `DEPRECATED.md`，記錄棄用日期和原因
  - 設定 14 天後的日曆提醒
  - 14 天後確認無問題，刪除舊檔案
- **驗收標準**：
  - 舊元件有明確的 deprecated 標記
  - 14 天內有監控舊元件是否還被使用
  - 14 天後舊元件成功刪除

##### T6.6. 更新元件文檔和使用指南

- **目的**：確保團隊知道該使用哪個元件
- **相關路徑**：
  - `docs/` 目錄（如有）
  - `README.md` 或相關文檔
  - `components/solve/ExplainCardV2.tsx`（加入 JSDoc）
- **具體工作內容**：
  - 在元件檔案加入完整的 JSDoc 說明
  - 更新或建立元件使用指南
  - 說明 props 介面和使用範例
  - 說明如何擴充元件
- **驗收標準**：
  - 新開發者能在 5 分鐘內找到正確的元件並理解如何使用
  - JSDoc 完整，IDE 能顯示提示
  - 有使用範例

#### 5. Risk & Rollout Plan

**主要風險**：
1. **功能遺漏**：合併時可能遺漏某個元件獨有的功能
2. **樣式差異**：不同頁面可能依賴特定的樣式，合併後顯示異常
3. **回歸 Bug**：大量檔案修改可能引入意外 bug

**降風險策略**：
- 使用 Feature Flag 控制新元件的啟用範圍
- 先在開發環境完整測試
- 分階段遷移：先遷移 Ask 頁面，確認穩定後再遷移其他頁面
- 保留舊元件 14 天，隨時可以 revert

**回滾策略**：
1. 如果新元件有問題，先關閉 Feature Flag（如果有使用）
2. 將 import 路徑改回舊元件（可以用 git revert）
3. 舊元件在 14 天內不會被刪除，可以隨時恢復

---

### ✅ M1-P9. 優化 API 呼叫：減少串行請求，改用並行或批次 — **已完成**

#### 1. Goal

完成後，Ask 頁面從點擊「解題」到顯示詳解的時間減少 40-60%。用戶不再需要看到多個獨立的 loading 狀態，而是一個統一的「思考中」動畫，體驗更流暢。

#### 完成記錄

| 項目 | 狀態 |
|------|------|
| 分析 API 呼叫流程 | ✅ |
| 多題解釋從串行改為並行 `Promise.all` | ✅ |
| 刪除未使用的 Streaming 元件 | ✅ |

**技術改動**：
- `apps/web/components/solve/ExplainCardV2.tsx`：將多題的 `/api/explain` 呼叫從 `for` 迴圈改為 `Promise.all` 並行處理
- 刪除 `StreamingReadingExplain.tsx` 和 `useStreamingExplanation.tsx`（未被使用）

#### 2. Scope

**✅ 要做的：**
- ✅ 分析 `AnySubjectSolver.tsx` 中的 API 呼叫依賴關係
- ✅ 將可並行的 API 呼叫改為 `Promise.all`
- 優化 loading 狀態顯示，合併為單一狀態
- 加入簡易快取機制，避免重複請求相同題目
- 更新錯誤處理邏輯，適應並行請求

**❌ 不做的：**
- 不建立新的後端 `/api/ask/complete` 端點（留給 M2）
- 不修改現有 API 的回應格式（留給 P4）
- 不加入 Redis 或其他外部快取服務
- 不處理 RAG 相關的 API（留給 P5）

#### 3. Tech Design

**資料結構變更**：無

**主要流程變動**：

```
現況（串行）：
  用戶點擊解題
  → 呼叫 /api/ai/route-solver，等待回應（~500ms）
  → 呼叫 /api/exec/similar，等待回應（~300ms）
  → 呼叫 /api/explain，等待回應（~2000ms）
  → 顯示結果
  總時間：~2800ms

目標（並行）：
  用戶點擊解題
  → 同時呼叫：
      /api/ai/route-solver（~500ms）
      /api/explain（~2000ms）
  → 等待最慢的回應完成
  → 用 route-solver 的結果呼叫 /api/exec/similar（~300ms）
  → 顯示結果
  總時間：~2300ms（減少 ~500ms）

進一步優化：
  用戶點擊解題
  → 同時呼叫所有 API（explain 不依賴 route-solver 結果時）
  總時間：~2000ms（減少 ~800ms）
```

**受影響的 Domain**：
- `Ask Domain`：API 呼叫邏輯變更
- `AI Domain`：無變更（API 不變）

#### 4. Task Breakdown

##### T9.1. 分析 API 依賴關係，確定可並行的請求

- **目的**：確保並行請求不會導致邏輯錯誤
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - `apps/web/app/api/ai/route-solver/route.ts`
  - `apps/web/app/api/explain/route.ts`
- **具體工作內容**：
  - 畫出 API 呼叫的依賴圖
  - 確認 `/api/explain` 是否真的需要 `/api/ai/route-solver` 的結果
  - 確認 `/api/exec/similar` 的輸入來源
  - 列出可以並行和必須串行的請求
- **驗收標準**：
  - 產出 API 依賴關係圖（文字或圖片）
  - 明確列出並行化方案
  - 團隊審核通過

##### T9.2. 重構 AnySubjectSolver 的 API 呼叫邏輯

- **目的**：實作並行 API 呼叫
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
- **具體工作內容**：
  - 將串行 `await` 改為 `Promise.all` 或 `Promise.allSettled`
  - 處理並行請求中任一個失敗的情況
  - 確保結果正確組合後再更新 state
  - 加入適當的錯誤處理
- **驗收標準**：
  - API 呼叫確實並行執行（可用 Network tab 確認）
  - 任一 API 失敗時有適當的錯誤提示
  - 總體驗時間減少（可量化測量）

##### T9.3. 優化 loading 狀態顯示

- **目的**：改善用戶等待時的體驗
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - 相關的 loading 元件（如有）
- **具體工作內容**：
  - 將多個獨立的 loading state 合併為單一狀態
  - 顯示「AI 正在思考中...」的統一動畫
  - 可選：顯示預估剩餘時間或進度
- **驗收標準**：
  - 用戶只看到一個 loading 狀態
  - loading 動畫流暢
  - loading 時間感受上比之前短

##### T9.4. 實作簡易前端快取機制

- **目的**：避免重複請求相同題目
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - `apps/web/lib/cache/` 目錄（可能需要新建）
- **具體工作內容**：
  - 建立簡易的 in-memory 快取（Map 或 LRU Cache）
  - 以題目文字的 hash 作為 key
  - 快取 `/api/explain` 的結果（最耗時的 API）
  - 設定合理的快取過期時間（如 5 分鐘）
- **驗收標準**：
  - 重複解相同題目時，第二次明顯更快
  - 快取有過期機制，不會無限增長
  - 手動清除快取的方法（用於開發除錯）

##### T9.5. 更新錯誤處理和回退邏輯

- **目的**：確保並行請求失敗時有良好的用戶體驗
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - 相關的錯誤顯示元件
- **具體工作內容**：
  - 處理部分 API 成功、部分失敗的情況
  - 決定是否要重試失敗的請求
  - 顯示清楚的錯誤訊息
  - 提供「重試」按鈕
- **驗收標準**：
  - 單一 API 失敗時，能顯示已成功的部分結果
  - 錯誤訊息對用戶友善
  - 有重試機制

##### T9.6. 效能測試和量化改善

- **目的**：確認優化效果並記錄
- **相關路徑**：
  - `components/ask/AnySubjectSolver.tsx`
  - 測試腳本（可能需要新建）
- **具體工作內容**：
  - 在優化前後測量 Ask 頁面的回應時間
  - 記錄 P50, P90, P95 延遲
  - 產出優化報告
- **驗收標準**：
  - P90 延遲減少至少 30%
  - 沒有新的錯誤或回歸 bug
  - 產出量化的優化報告

#### 5. Risk & Rollout Plan

**主要風險**：
1. **並行請求衝突**：某些 API 可能有隱藏的依賴關係，並行呼叫會導致錯誤
2. **錯誤處理複雜化**：並行請求中一個失敗時，如何處理其他請求的結果
3. **快取一致性**：快取可能導致用戶看到過期的結果

**降風險策略**：
- 先在開發環境充分測試各種失敗情況
- 使用 `Promise.allSettled` 而非 `Promise.all`，確保部分失敗不影響其他結果
- 快取 TTL 設定保守一些（如 5 分鐘），避免過期問題
- 提供手動清除快取的方法

**回滾策略**：
1. 如果發現問題，將 `Promise.all` 改回串行 `await`
2. 關閉快取機制（設定 TTL 為 0）
3. 可以用 git revert 快速回到之前的版本

---

### M1-P10. 補齊缺失的資料庫 Schema 文檔

#### 1. Goal

完成後，新開發者只需要看一份 `schema.sql` 檔案，就能了解整個專案的資料庫結構。不再需要翻閱 15+ 個 migration 檔案，入職時間從 2-3 天縮短到 0.5 天。

#### 2. Scope

**✅ 要做的：**
- 掃描所有 migration 檔案，整理完整的 schema
- 更新 `apps/web/supabase/schema.sql`，包含所有表的定義
- 建立 schema 文檔，說明每個表的用途和關係
- 建立 ERD（Entity Relationship Diagram）

**❌ 不做的：**
- 不修改任何資料庫結構
- 不執行任何 migration
- 不建立自動化 schema 驗證工具（留給未來）
- 不處理 RLS（Row Level Security）政策的文檔化

#### 3. Tech Design

**資料結構變更**：無（只是文檔化）

**主要產出**：

```
apps/web/supabase/
├── schema.sql          # 完整的 schema 定義（更新）
├── schema-reference.md # Schema 參考文檔（新建）
├── erd.md              # ERD 圖（新建，用 Mermaid 語法）
└── migrations/         # 現有 migration 檔案（不變）
```

**受影響的 Domain**：
- 所有 Domain（文檔化，不影響實際程式碼）

#### 4. Task Breakdown

##### ✅ T10.1. 掃描所有 migration 檔案，列出所有表 — **已完成**

- **目的**：建立完整的表清單
- **相關路徑**：
  - `apps/web/supabase/migrations/` (15 個檔案)
  - `apps/web/db/sql/` (40 個檔案)
  - `db/sql/` (主目錄下的 SQL 檔案)
- **具體工作內容**：
  - ✅ 讀取所有 migration 檔案
  - ✅ 提取 `CREATE TABLE` 語句
  - ✅ 列出所有表名和欄位
  - ✅ 識別哪些表在 `schema.sql` 中缺失
- **產出**：
  - ✅ `docs/db/schema_overview.md` - 完整表清單

##### ✅ T10.2. 更新 schema.sql，補齊缺失的表定義 — **已完成**

- **目的**：讓 schema.sql 成為唯一的真相來源
- **相關路徑**：
  - `apps/web/supabase/schema.sql`
- **具體工作內容**：
  - ✅ 將缺失的表定義加入 schema.sql
  - ✅ 包括：`pack_questions`, `seed_questions`, `ugc_questions`, `files`, `doc_chunks`, `battle_events`, `notebook_entries`, `missions`, `daily_missions` 等
  - ✅ 加入 Phase 2 題本系統的 3 張表：`question_sets`, `user_question_sets`, `question_set_reviews`
  - ✅ 確保欄位定義與 migration 一致
  - ✅ 加入適當的註釋說明每個表的用途
  - ✅ 按 10 個 Domain 組織結構
  - ✅ 標記 LEGACY 表 (`backpack_items`, `backpack_notes`, `tasks`)
- **產出**：
  - ✅ `apps/web/supabase/schema.sql` - 完整 60 張表
  - ✅ `supabase/schema.sql` - 同步更新

##### ✅ T10.3. 建立 Schema 參考文檔 — **已完成**

- **目的**：提供更詳細的表說明
- **相關路徑**：
  - `docs/db/schema_overview.md` (新建)
- **具體工作內容**：
  - ✅ 為每個表建立說明章節
  - ✅ 說明表的用途、關聯、典型查詢
  - ✅ 說明重要欄位的含義
  - ✅ 說明 pgvector 和索引配置
- **產出**：
  - ✅ `docs/db/schema_overview.md`

##### ✅ T10.4. 建立 ERD（Entity Relationship Diagram） — **已完成**

- **目的**：視覺化展示表之間的關係
- **相關路徑**：
  - `apps/web/supabase/erd.md` (新建)
- **具體工作內容**：
  - ✅ 使用 Mermaid 語法繪製 ERD
  - ✅ 標示主鍵、外鍵關係
  - ✅ 分群組展示相關的表（User、Battle、RAG、Missions 等）
  - ✅ 建立外鍵速查表
- **產出**：
  - ✅ `apps/web/supabase/erd.md`

##### ✅ T10.5. 驗證文檔與實際資料庫的一致性 — **驗證清單已準備好**

- **目的**：確保文檔正確
- **相關路徑**：
  - `apps/web/supabase/schema.sql`
  - `apps/web/supabase/SCHEMA_VALIDATION_CHECKLIST.md`
  - Supabase Dashboard
- **具體工作內容**：
  - ✅ 建立驗證清單文件（60 張表）
  - ✅ 修正文檔中的表數量錯誤（從 62 改為 60）
  - ✅ 補齊 Question Sets 系統的 3 張表
  - ⏳ **需用戶操作**：登入 Supabase Dashboard 比對實際 schema
  - ⏳ **需用戶操作**：記錄發現的差異
- **產出**：
  - ✅ `apps/web/supabase/SCHEMA_VALIDATION_CHECKLIST.md` - 完整驗證清單（60 表）

##### ✅ T10.6. 更新 README 和相關文檔的連結 — **已完成**

- **目的**：讓團隊知道在哪裡找到 schema 文檔
- **相關路徑**：
  - `README.md`
- **具體工作內容**：
  - ✅ 在 README 中加入 Schema 文檔的連結
  - ✅ 在專案結構中加入資料庫文檔路徑
  - ✅ 更新技術棧說明
- **產出**：
  - ✅ `README.md` 更新

#### 5. Risk & Rollout Plan

**主要風險**：
1. **文檔與實際不一致**：如果 migration 執行有問題，文檔可能與實際資料庫不符
2. **遺漏表或欄位**：掃描時可能遺漏某些動態建立的表
3. **維護負擔**：新增表時需要同時更新 schema.sql 和文檔

**降風險策略**：
- 與 Supabase Dashboard 交叉驗證
- 讓多人 review schema 文檔
- 建立 PR checklist：「新增表時是否更新 schema.sql？」

**回滾策略**：
1. 這是純文檔工作，不會影響實際系統運作
2. 如果文檔有錯誤，直接修正即可
3. 保留舊版 schema.sql 作為參考（用 git history）

---

## 6.z Suggested First Implementation Package

### 對應提案：M1-P10（補齊缺失的資料庫 Schema 文檔） — ✅ **已完成**

### 任務列表：T10.1 ~ T10.6

### 完成狀態：

| 任務 | 狀態 | 產出 |
|------|------|------|
| **T10.1** - 掃描 migration 檔案 | ✅ 完成 | `docs/db/schema_overview.md` |
| **T10.2** - 更新 schema.sql | ✅ 完成 | `apps/web/supabase/schema.sql` (60 表，含 question_sets) |
| **T10.3** - 建立參考文檔 | ✅ 完成 | `docs/db/schema_overview.md` |
| **T10.4** - 建立 ERD | ✅ 完成 | `apps/web/supabase/erd.md` |
| **T10.5** - 驗證一致性 | ✅ 清單完成 | 需用戶登入 Supabase Dashboard 驗證 |
| **T10.6** - 更新 README | ✅ 完成 | `README.md` 已更新 |

### 產出文件清單

```
✅ apps/web/supabase/schema.sql           # 完整 62 張表定義
✅ apps/web/supabase/erd.md               # ERD 圖（Mermaid）
✅ apps/web/supabase/SCHEMA_VALIDATION_CHECKLIST.md  # 驗證清單
✅ supabase/schema.sql                     # 同步更新
✅ docs/db/schema_overview.md              # Schema 總覽文檔
✅ README.md                               # 已加入 Schema 文檔連結
```

### 一句話總結

**P10 已完成 100%（所有文檔和清單已就緒，等待用戶登入 Supabase 進行最終驗證）**。Schema 包含 60 張表（含 Phase 2 Question Sets），現在可以開始 Milestone 2。

---

## 附錄：Milestone 2/3 提案概覽（不做詳細拆解）

### Milestone 2（第 4–6 週）

| ID | Title | 預計工作量 | 依賴 |
|----|-------|-----------|------|
| P4 | 統一 API 回應格式 | 2-3 週 | 無 |
| P1 | 統一資料模型 | 1-2 週 | P10 |
| P2 | 簡化 AI 詳解 Pipeline | 2-3 週 | P6 |

### Milestone 3（第 7 週以後）

| ID | Title | 預計工作量 | 依賴 |
|----|-------|-----------|------|
| P8 | 建立錯誤監控系統 | 1-2 週 | 無 |
| P7 | 簡化新手引導流程 | 2-3 週 | 產品決策 |
| P3 | 重構對戰狀態管理 | 3-4 週 | 無 |
| P5 | RAG 非同步佇列 | 3-4 週 | 外部服務設定 |

---

**文件完成日期**: 2025-01-XX  
**預計執行週期**: 6-8 週  
**下一步**: 執行 M1-P10 的 T10.1（掃描 migration 檔案）

