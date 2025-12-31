# 完整流程文檔：從輸入題目到產出詳解，再到加入錯題本

## 📋 總覽

本文檔說明從用戶在 `/ask` 頁面輸入題目，到系統產出詳解，再到用戶點擊儲存按鈕加入錯題本的完整邏輯流程。

---

## 🔄 完整流程圖

```
用戶輸入題目
    ↓
InputDock / AnySubjectSolver 接收輸入
    ↓
ExplainCardV2 組件監聽 inputText 變化
    ↓
發送 POST /api/explain 請求
    ↓
/api/explain 三層降級機制處理
    ├─ Layer 1: Universal Explainer (完整解釋)
    ├─ Layer 2: Basic Extractor (基本解釋)
    └─ Layer 3: Minimal Fallback (最小解釋)
    ↓
返回 ExplainViewModel 格式
    ↓
ExplainCardV2 接收並顯示 Markdown
    ↓
用戶點擊「存到筆記本」或「加入錯題本」
    ↓
調用 MCP finalize_explain_card
    ↓
決定儲存目標（error_book 或 backpack_notes）
    ├─ 有 questionId + source=battle/practice → error_book
    └─ 其他情況 → backpack_notes
    ↓
格式化詳解結果
    ↓
儲存到對應資料表
```

---

## 📝 詳細流程說明

### 階段 1：用戶輸入題目

**位置**：`/apps/web/app/(app)/ask/page.tsx`

1. **頁面結構**：
   - `ModeTabs`：頂部分頁（解題 / 重點統整）
   - `AnySubjectSolver`：主要解題組件
   - `InputDock`：底部輸入框

2. **輸入處理**：
   - 用戶在 `InputDock` 輸入題目文字
   - 支援 OCR（圖片上傳 → 文字提取）
   - Enter 鍵或點擊送出按鈕觸發提交

**代碼位置**：
- `components/ask/InputDock.tsx`：處理輸入和提交
- `components/ask/AnySubjectSolver.tsx`：接收輸入並傳遞給 ExplainCardV2

---

### 階段 2：ExplainCardV2 監聽並發送請求

**位置**：`apps/web/components/solve/ExplainCardV2.tsx`

1. **監聽機制**：
   ```typescript
   useEffect(() => {
     const trimmed = inputText.trim()
     if (!trimmed) return
     
     // Guard: 防止重複請求
     const key = `${trimmed}::${conservative ? '1' : '0'}`
     if (lastInputRef.current === key && hasResult) {
       return // 跳過重複請求
     }
     
     // 發送 API 請求
     fetch('/api/explain', {
       method: 'POST',
       body: JSON.stringify({
         input: { text: inputText },
         mode: 'deep',
         conservative,
       })
     })
   }, [inputText, conservative])
   ```

2. **請求參數**：
   - `input.text`：題目文字
   - `mode`：'deep'（完整模式）或 'fast'（快速模式）
   - `conservative`：是否使用保守模式

3. **狀態管理**：
   - `isLoading`：載入狀態
   - `vm`：單題詳解結果（ExplainViewModel）
   - `questionSetVM`：多題詳解結果（QuestionSetVM）
   - `error`：錯誤訊息

---

### 階段 3：API 處理（三層降級機制）

**位置**：`apps/web/app/api/explain/route.ts`

#### Layer 1: Universal Explainer（完整解釋）

**流程**：
1. 調用 `universalExplainer(inputText)`
2. 返回 `UniversalExplainResult` 格式：
   ```typescript
   {
     markdown: string,           // 完整的 Markdown 詳解
     questions?: Array<{         // 多題格式
       question: string,
       explanation: {
         answer: string,
         reasoning: string
       }
     }>,
     sharedPassage?: {           // 共享段落格式
       sharedPassage: string,
       questions: Array<...>
     },
     structured?: {              // 結構化格式
       question: string,
       answer: string,
       reasoning: string
     },
     status: 'full' | 'partial' | 'minimal',
     meta: { ... }
   }
   ```

3. **成功條件**：只要有 `markdown` 就返回成功

**失敗處理**：繼續到 Layer 2

#### Layer 2: Basic Extractor（基本解釋）

**流程**：
1. 調用 `basicExtractor(inputText)`
2. 使用規則提取 + 簡短 AI 生成基本解析
3. 轉換為 Markdown 格式

**失敗處理**：繼續到 Layer 3

#### Layer 3: Minimal Fallback（最小解釋）

**流程**：
1. 調用 `minimalFallback(inputText)`
2. 使用模板生成保底解析
3. **保證**：永遠有輸出，永遠不拋錯

**返回格式**：
```typescript
{
  kind: 'vocab',
  mode: 'deep',
  answer: string,
  briefReason: string,
  fullExplanation: string,  // Markdown 格式
  markdown: string,
  status: 'minimal',
  meta: { ... }
}
```

---

### 階段 4：ExplainCardV2 接收並顯示

**位置**：`apps/web/components/solve/ExplainCardV2.tsx`

1. **接收 API 回應**：
   ```typescript
   const data = await res.json()
   
   // 判斷是多題還是單題
   const isE0Response = data.type === 'E0_QUESTION_SET'
   const needsMultiDetection = detectMultipleQuestions(inputText)
   
   if (isE0Response || needsMultiDetection) {
     // 轉換為 QuestionSetVM
     const qset = toQuestionSetVM(data, inputText)
     setQuestionSetVM(qset)
   } else {
     // 單題格式
     setVm(data as ExplainViewModel)
   }
   ```

2. **生成 Markdown 內容**：
   ```typescript
   const markdownContent = useMemo(() => {
     // 優先使用 fullExplanation
     if (vm?.fullExplanation) {
       return vm.fullExplanation
     }
     
     // 多題格式
     if (questionSetVM) {
       return buildWrongbookNote()  // 從 questionSetVM 生成 Markdown
     }
     
     // 單題格式，從其他欄位生成
     if (vm) {
       const lines = []
       if (vm.answer) lines.push(`## 答案\n\n${vm.answer}\n`)
       if (vm.briefReason) lines.push(`## 解析\n\n${vm.briefReason}\n`)
       return lines.join('\n') || null
     }
     
     return null  // 沒有結果時不顯示題目內容
   }, [vm, questionSetVM, buildWrongbookNote])
   ```

3. **渲染 Markdown**：
   - 使用 `MarkdownRenderer` 組件
   - 支援基本 Markdown 格式（標題、粗體、列表）

---

### 階段 5：用戶點擊儲存按鈕

**位置**：`apps/web/components/solve/ExplainCardV2.tsx` → `handlePrimaryAction`

1. **按鈕顯示邏輯**：
   ```typescript
   const resolvedTarget = useMemo(() => {
     if (saveTarget === 'backpack') return 'backpack_notes'
     if (saveTarget === 'error_book') return 'error_book'
     return questionId ? 'error_book' : 'backpack_notes'
   }, [questionId, saveTarget])
   
   const primaryCtaLabel = resolvedTarget === 'error_book' 
     ? '加入錯題本' 
     : '存到筆記本'
   ```

2. **儲存流程**：
   ```typescript
   const handlePrimaryAction = async () => {
     // 1. 獲取用戶 ID
     const sessionData = await supabaseBrowserClient.auth.getSession()
     const userId = sessionData?.session?.user?.id || fallbackUserId
     
     // 2. 轉換為 UniversalExplainResult 格式
     const explainResult = vmToUniversalExplainResult(vm, questionSetVM, inputText)
     
     // 3. 準備 MCP 參數
     const mcpPayload = {
       cardId: `explain-${Date.now()}-${nanoid(8)}`,
       outputs: {
         explainResult,
         userId,
         ...(questionId && { questionId }),
         target: resolvedTarget,
         payload: {
           text: inputText,
           source: 'ask',
           target: resolvedTarget,
         }
       }
     }
     
     // 4. 調用 MCP finalize_explain_card
     const res = await fetch('/api/mcp/core', {
       method: 'POST',
       body: JSON.stringify({
         action: 'finalize_explain_card',
         args: mcpPayload
       })
     })
   }
   ```

---

### 階段 6：MCP finalize_explain_card 處理

**位置**：`apps/web/lib/services/mcp/explain.ts`

1. **驗證輸入**：
   - 檢查 `explainResult` 是否存在
   - 檢查 `userId` 是否存在

2. **格式化詳解結果**：
   ```typescript
   const formattedExplain = formatExplainResult(explainResult)
   // 返回：
   // {
   //   title: string,        // 標題（從第一題題幹或 meta.title 提取）
   //   markdown: string,     // 完整的 Markdown 內容
   //   metadata: { ... }     // 題數、是否有共享段落等
   // }
   ```

3. **決定儲存目標**（互斥邏輯）：
   ```typescript
   const questionId = args.outputs.questionId || args.outputs.payload?.questionId
   const requestedTarget = args.outputs.target || args.outputs.payload?.target
   const source = args.outputs.payload?.source || 'unknown'
   
   let target: 'error_book' | 'backpack_notes'
   
   // 優先順序：
   // 1. 明確指定 target
   // 2. 有 questionId → error_book
   // 3. 其他 → backpack_notes
   
   // 但有限制：
   // - error_book 只允許 source 為 'battle' 或 'practice'
   // - 如果 source 是 'ask'，會 fallback 到 backpack_notes
   ```

4. **路徑 A：儲存到 error_book**（錯題本）
   ```typescript
   if (target === 'error_book' && questionId) {
     const result = await create_wrongbook_entry({
       userId,
       questionId,
       explanation: formattedExplain
     })
     
     // create_wrongbook_entry 邏輯：
     // 1. 檢查是否已存在（user_id + question_id + status='active'）
     // 2. 如果存在 → 更新 last_attempted_at
     // 3. 如果不存在 → 插入新記錄
     // 4. 返回 entryId
   }
   ```

5. **路徑 B：儲存到 backpack_notes**（筆記本）
   ```typescript
   if (target === 'backpack_notes') {
     const result = await save_backpack_note({
       userId,
       formattedExplain,
       source: 'ask',
       originalPayload: { text: inputText }
     })
     
     // save_backpack_note 邏輯：
     // 1. 提取題目資訊（從 payload 或 formattedExplain.title）
     // 2. 確定技能分類（canonical_skill）
     // 3. 決定 folder（根據 source）
     // 4. 建構完整的 markdown 筆記
     // 5. 調用 saveBackpackNote 插入到 backpack_notes 表
   }
   ```

---

### 階段 7：資料庫儲存

#### error_book 表結構

**位置**：`apps/web/lib/services/mcp/wrongbook.ts`

**欄位**：
- `id`：主鍵
- `user_id`：用戶 ID
- `question_id`：題目 ID
- `status`：狀態（'active' | 'archived'）
- `last_attempted_at`：最後嘗試時間

**邏輯**：
- 如果已存在相同 `user_id` + `question_id` + `status='active'` 的記錄，只更新 `last_attempted_at`
- 否則插入新記錄

**注意**：`error_book` 表**不儲存詳解內容**，只追蹤錯題狀態。詳解內容需要從其他地方（如 `question_explanations` 表）查詢。

#### backpack_notes 表結構

**位置**：`apps/web/lib/services/mcp/backpackNotes.ts`

**欄位**：
- `id`：主鍵
- `user_id`：用戶 ID
- `question`：題目文字
- `canonical_skill`：技能分類（如 'english_vocab'）
- `note_md`：Markdown 格式的詳解內容
- `folder`：資料夾（如 'ask'）
- `created_at`：建立時間

**邏輯**：
- 每次儲存都會插入新記錄
- 詳解內容完整儲存在 `note_md` 欄位中

---

## 🔍 關鍵決策點

### 1. 儲存目標決定邏輯

```typescript
// 決策樹：
if (requestedTarget === 'backpack_notes') {
  target = 'backpack_notes'
} else if (requestedTarget === 'error_book') {
  target = 'error_book'
} else if (questionId) {
  target = 'error_book'  // 有 questionId 預設存錯題本
} else {
  target = 'backpack_notes'  // 沒有 questionId 存筆記本
}

// 但有限制：
if (target === 'error_book' && !allowedErrorBookSources.has(source)) {
  target = 'backpack_notes'  // source 不是 battle/practice 時 fallback
}

if (target === 'error_book' && !questionId) {
  target = 'backpack_notes'  // 沒有 questionId 時 fallback
}
```

### 2. 詳解格式轉換

**API 回應格式** → **UniversalExplainResult** → **FormattedExplain** → **資料庫格式**

- **API 回應**：`ExplainViewModel`（包含 `fullExplanation`, `markdown`, `structured` 等）
- **UniversalExplainResult**：統一的詳解結果格式（用於 MCP）
- **FormattedExplain**：格式化後的結果（包含 `title`, `markdown`, `metadata`）
- **資料庫格式**：根據目標表結構儲存

---

## 📊 資料流圖

```
用戶輸入
    ↓
ExplainCardV2 (前端)
    ↓
POST /api/explain
    ↓
Universal Explainer / Basic Extractor / Minimal Fallback
    ↓
返回 ExplainViewModel
    ↓
ExplainCardV2 顯示 Markdown
    ↓
用戶點擊儲存
    ↓
POST /api/mcp/core (action: finalize_explain_card)
    ↓
formatExplainResult (格式化)
    ↓
決定目標 (error_book 或 backpack_notes)
    ├─ error_book → create_wrongbook_entry
    └─ backpack_notes → save_backpack_note
    ↓
Supabase 資料庫
```

---

## ⚠️ 重要注意事項

1. **error_book vs backpack_notes**：
   - `error_book`：追蹤錯題狀態，**不儲存詳解內容**
   - `backpack_notes`：完整儲存詳解內容（Markdown 格式）

2. **source 限制**：
   - `error_book` 只接受 `source` 為 `'battle'` 或 `'practice'`
   - 從 `/ask` 頁面來的請求，`source` 是 `'ask'`，會自動 fallback 到 `backpack_notes`

3. **questionId 的作用**：
   - 有 `questionId`：通常表示來自題庫系統，可以存到 `error_book`
   - 沒有 `questionId`：通常是用戶直接輸入的題目，存到 `backpack_notes`

4. **詳解內容生成**：
   - 優先使用 `vm.fullExplanation`（完整的 Markdown）
   - 如果沒有，從 `vm.answer` 和 `vm.briefReason` 生成簡單格式
   - 多題格式使用 `buildWrongbookNote()` 生成

5. **防重複請求**：
   - 使用 `lastInputRef` 記錄上次請求的 key
   - 如果輸入相同且已有結果，跳過請求
   - 如果輸入相同但沒有結果，允許重試

---

## 🔧 相關檔案清單

### 前端組件
- `apps/web/app/(app)/ask/page.tsx`：Ask 頁面主體
- `components/ask/AnySubjectSolver.tsx`：解題組件
- `components/ask/InputDock.tsx`：輸入框組件
- `apps/web/components/solve/ExplainCardV2.tsx`：詳解卡片組件（核心）

### API 路由
- `apps/web/app/api/explain/route.ts`：詳解 API（三層降級）
- `apps/web/app/api/mcp/core/route.ts`：MCP 核心路由

### 服務層
- `apps/web/lib/services/mcp/explain.ts`：MCP explain 服務
- `apps/web/lib/services/mcp/formatters.ts`：詳解格式化器
- `apps/web/lib/services/mcp/wrongbook.ts`：錯題本服務
- `apps/web/lib/services/mcp/backpackNotes.ts`：筆記本服務

### AI 處理
- `lib/ai/universal-explainer.ts`：Universal Explainer
- `lib/ai/basic-extractor.ts`：Basic Extractor
- `lib/ai/minimal-fallback.ts`：Minimal Fallback

### 資料轉換
- `apps/web/lib/mapper/explain-presenter.ts`：詳解結果轉換器
- `apps/web/lib/mapper/vm/question-set.ts`：題組 ViewModel

---

## 📝 總結

完整流程從用戶輸入開始，經過 API 的三層降級機制生成詳解，前端顯示 Markdown 格式的解析，最後根據是否有 `questionId` 和 `source` 決定存到 `error_book`（錯題本）或 `backpack_notes`（筆記本）。

關鍵點：
1. **API 永遠有輸出**（三層降級保證）
2. **前端簡化顯示**（直接 Markdown，移除過度設計）
3. **儲存邏輯清晰**（根據 questionId 和 source 決定目標）
4. **資料分離**（error_book 追蹤狀態，backpack_notes 儲存內容）

