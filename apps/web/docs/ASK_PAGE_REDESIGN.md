# /ask 頁面完整重構說明

> ⚠️ **狀態更新**：本文件描述的最終體驗尚未完全落地。  
> 目前 `/ask` 頁面僅有 demo/mock 流程，Tutor Flow 串接與資料綁定仍待完成。

## 概述

完全重做 `/ask` 頁面的 UI/UX，保留既有 API，實現深色淡藍極簡風格與智能單/批次流程。

---

## 設計規格

### 🎨 主題色彩

- **背景**：`#0E1116`
- **卡片**：`#141A20`
- **重點色**：`#6EC1E4`（淡藍）
- **主文字**：`#F1F5F9`
- **輔助文字**：`#A9B7C8`
- **圓角**：14–16px
- **陰影**：微光陰影 `0_4px_16px_rgba(110,193,228,0.08)`

### 🧭 頂部分頁

僅兩個分頁：
- **〔解題〕**：單題/批次自動偵測解題流程
- **〔重點統整〕**：顯示學習重點統整

**移除**：「單題/批次」分頁（改為自動偵測）

### 📝 底部輸入 Dock（ChatGPT 風格）

- **左側**：`＋` 按鈕（檔案/照片上傳 → OCR → 將文字放入輸入框）
- **中間**：文字輸入框（placeholder：`輸入或貼上題目…`）
- **右側**：送出箭頭
- **Enter 送出**；**Shift+Enter 換行**
- **不顯示**：多餘按鈕與教學文

---

## 自動偵測邏輯

### Single / Batch 自動偵測

輸入文本後，前端自動判斷：

```typescript
// lib/question-detector.ts
export function detectMode(text: string): Mode {
  // 計算選項組數（每組包含 A/B/C/D）
  const optionPattern = /\([A-D]\)[^\n(]{5,}/g;
  const optionMatches = text.match(optionPattern) || [];
  const estimatedQuestions = Math.floor(optionMatches.length / 3);

  // 計算題號數量
  const numberPattern = /(?:^|\n)\s*(?:\d+[.)]\s*|Q\d+\s*|題\s*\d+)/g;
  const numberMatches = text.match(numberPattern) || [];

  // 如果選項組 ≥ 2 或題號 ≥ 2，視為 batch
  if (estimatedQuestions >= 2 || numberMatches.length >= 2) {
    return 'batch';
  }

  return 'single';
}
```

---

## SINGLE 模式流程

### 階段 1：顯示題目泡泡

- 僅顯示題幹與四個選項（供參考）
- 使用 `QuestionBubble` 元件

### 階段 2：顯示考點 Chips

- 自動取得 4 個考點 chips（例如：關係子句、分詞構句、倒裝句、同位語從句）
- 使用 `ConceptChips` 元件
- 點擊任一 chip → 進入階段 3

### 階段 3：顯示詳解卡

使用 `ExplanationCard` 元件，包含：

#### 📌 區塊 1：一句話總結考點
```
✅ 本題考「關係子句—非限定用法」：逗號 + which 補充說明先行詞。
```

#### 📌 區塊 2：解題步驟（3–5 點）
```
🪜 解題步驟
1. 先辨識句子主結構：The book is fascinating（主詞 + 動詞 + 補語）。
2. 找出關鍵逗號：逗號後接關係子句，代表非限定用法（補充說明）。
3. 檢查先行詞：先行詞是 the book（物），因此使用 which。
4. 確認子句完整性：which I bought yesterday 完整無缺。
```

#### 📌 區塊 3：文法統整表（預設展開）

三欄表格：**類別 | 說明 | 範例**

| 類別 | 說明 | 範例 |
|------|------|------|
| 定義 | 關係子句用來修飾名詞，分限定與非限定兩種。 | The book which I read... |
| 種類 | 限定：不可省略；非限定：可省略，需逗號隔開。 | My car, which is red, ... |
| 非限定用法 | 逗號 + which/who，補充說明先行詞。 | Tom, who is a doctor, ... |
| 限定用法 | 無逗號，直接修飾先行詞。 | The man who called you... |
| 常見錯誤 | 混用 who/which，或忘記逗號。 | 錯誤：The book who I read. |

#### 📌 區塊 4：Action Duo

- **💾 存入書包**：呼叫 `/api/backpack/save`
- **🔁 再練一題**：清空狀態，回到輸入

#### 📌 區塊 5：學長姐語氣微語氣

小灰字，隨機顯示：
- 「句型抓得很穩，再多練幾題你會更熟悉！」
- 「邏輯方向正確，只差一個逗號的觀察。」
- 「關係子句你已經掌握節奏，繼續保持這個速度。」
- 「節奏很好，保持這種拆題速度就能越來越扎實。」

---

## BATCH 模式流程

### 階段 1：題目清單（勾選）

使用 `BatchList` 元件：
- 每列：**勾選框 | 題幹摘要**
- **不顯示**：題號、考點、答案

### 階段 2：浮現行動列

當勾選數 ≥ 1 時，使用 `BatchActions` 元件顯示：

- **📘 逐步解析（N 題）**：依序顯示單題詳解卡
- **⚡ 快速解答（N 題）**：列表輸出每題的「建議答案 + 一句話總結」

### 階段 3A：逐步解析

- 一次只顯示一題的 `ExplanationCard`
- 顯示進度指示：`1 / 5`
- **➡️ 下一題**：當前淡出 200ms、下一題淡入 300ms
- **最終題**：顯示「✅ 本輪解析完成」，CTA：回到清單

### 階段 3B：快速解答

使用 `BatchOverview` 元件，列表顯示：

```
題目 1
建議答案：B
一句話總結：本題考關係子句非限定用法，逗號後接 which。

題目 2
建議答案：A
一句話總結：...
```

底部 CTA：**回到清單**

---

## 可重用元件清單

### 已實作元件

| 元件名稱 | 路徑 | 功能 |
|---------|------|------|
| `ModeTabs` | [components/ask/ModeTabs.tsx](../components/ask/ModeTabs.tsx) | 頂部分頁（解題/重點統整） |
| `InputDock` | [components/ask/InputDock.tsx](../components/ask/InputDock.tsx) | 底部輸入 Dock（OCR + 文字） |
| `ConceptChips` | [components/ask/ConceptChips.tsx](../components/ask/ConceptChips.tsx) | 考點 chips 選擇 |
| `ExplanationCard` | [components/ask/ExplanationCard.tsx](../components/ask/ExplanationCard.tsx) | 詳解卡（總結 + 步驟 + 表格） |
| `ActionDuo` | [components/ask/ActionDuo.tsx](../components/ask/ActionDuo.tsx) | 存書包 + 再練一題 |
| `QuestionBubble` | [components/ask/messages/QuestionBubble.tsx](../components/ask/messages/QuestionBubble.tsx) | 題目泡泡 |
| `BatchList` | [components/ask/messages/BatchList.tsx](../components/ask/messages/BatchList.tsx) | 批次題目清單（勾選） |
| `BatchActions` | [components/ask/messages/BatchActions.tsx](../components/ask/messages/BatchActions.tsx) | 批次行動列 CTA |
| `BatchOverview` | [components/ask/messages/BatchOverview.tsx](../components/ask/messages/BatchOverview.tsx) | 快速解答總覽 |

---

## 狀態機設計

```typescript
// lib/tutor-types.ts
export interface AskState {
  // 模式
  mode: Mode; // 'single' | 'batch'

  // Single 模式
  singlePhase: SinglePhase; // 'question' | 'concept' | 'explain'
  currentQuestion: Question | null;
  concepts: ConceptChip[];
  explanation: Explanation | null;

  // Batch 模式
  batchPhase: BatchPhase; // 'list' | 'step-by-step' | 'quick'
  questions: Question[];
  selectedIds: string[];
  currentIndex: number;
  totalQuestions: number;
  quickAnswers: QuickAnswer[];

  // 共用
  isLoading: boolean;
  error: string | null;
}
```

---

## 動畫規格

使用 **Framer Motion**：

- **頁面進入**：`opacity: 0 → 1`，`y: 16 → 0`，`duration: 0.3–0.4s`
- **切題動畫**（Batch）：
  - 淡出：`opacity: 1 → 0`，`y: 0 → -16`，`duration: 0.2s`
  - 淡入：`opacity: 0 → 1`，`y: 16 → 0`，`duration: 0.3s`
- **行動列浮現**：`opacity: 0 → 1`，`y: 12 → 0`，`duration: 0.3s`

---

## 驗收標準 ✅

- [x] 頂部只有〔解題〕〔重點統整〕兩分頁
- [x] 沒有「單題/批次」分頁
- [x] 輸入或上傳後**自動判斷** single/batch
- [x] Batch 清單僅題幹與勾選；勾選後才浮現 CTA
- [x] 逐步解析：一次只顯示一題詳解卡，含：
  - 一句話總結
  - 解題步驟
  - 表格化文法統整（預設展開）
  - Action Duo
  - ➡️ 下一題
- [x] 所有文案一律**繁體中文**、學長姐語氣
- [x] **不顯示**：正誤與分數
- [x] 行動列與切題動畫平滑（0.25–0.4s）
- [x] 整體**深色淡藍極簡**，不出現冗餘教學段落

---

## 既有 API（保留）

| API 路徑 | 功能 |
|---------|------|
| `/api/ai/concept` | 取得考點 chips |
| `/api/ai/judge` | 判斷考點與答案 |
| `/api/ai/solve` | 生成詳解 |
| `/api/backpack/save` | 存入書包 |
| `/api/tutor/explain` | OCR + 題目解析（可選用） |

---

## 下一步整合

目前使用 **MOCK_CONCEPTS** 和 **MOCK_EXPLANATION**，實際部署時需：

1. 在 `handleSubmit` 中呼叫 `/api/ai/concept` 取得真實考點
2. 在 `handleConceptSelect` 中呼叫 `/api/ai/judge` + `/api/ai/solve` 取得真實詳解
3. 在批次模式中依序呼叫相同 API
4. 更新 OCR 整合（`InputDock` 已預留 `processImageToText` 函式）

---

## 檔案清單

### 新增/修改檔案

- `lib/tutor-types.ts`：新增狀態機型別定義
- `lib/question-detector.ts`：新增 single/batch 偵測邏輯
- `components/ask/ModeTabs.tsx`：更新為雙分頁（解題/重點統整）
- `components/ask/ConceptChips.tsx`：簡化為僅顯示 label
- `components/ask/messages/QuestionBubble.tsx`：新增
- `components/ask/messages/BatchList.tsx`：新增
- `components/ask/messages/BatchActions.tsx`：新增
- `components/ask/messages/BatchOverview.tsx`：新增
- `app/(app)/ask/page.tsx`：完全重寫

---

## 開發者備註

- 所有顏色常數定義於 `lib/tutor-types.ts` 的 `THEME` 常數
- 動畫參數統一：淡入 0.3–0.4s，淡出 0.2s
- 所有圓角統一：14–16px（小元件 14px，大卡片 16px）
- 所有文案一律繁體中文、不使用 emoji（除非使用者明確要求）
- 學長姐語氣範例：「句型抓得很穩，再多練幾題你會更熟悉！」

---

**建立日期**：2025-10-18
**版本**：1.0
**作者**：Claude Code
