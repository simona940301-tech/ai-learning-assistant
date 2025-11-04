# Debug Pipeline - 詳解卡無法顯示問題排查

**時間**: 2025-10-28  
**問題**: 詳解卡無法顯示（UI 卡在 Skeleton 或空白）

---

## 🔍 已添加 Debug Logs

### 1. API Route (`apps/web/app/api/ai/route-solver/route.ts`)

```typescript
console.log('[route-solver] Using English explanation pipeline...')
console.log('[route-solver] Parsed options:', options)
console.log('[route-solver] Calling orchestrateEnglishExplanation...')
console.log('[route-solver] English result received:', { cardId, kind, routing })
console.log('[route-solver] Converted to legacy format:', { focus, summary, stepsCount, detailsCount })
```

### 2. Frontend Component (`apps/web/components/ask/AnySubjectSolver.tsx`)

```typescript
console.log('[AnySubjectSolver] API Response received:', { subject, hasExplainCard, explainCardKeys })
console.log('[AnySubjectSolver] Normalizing result...')
console.log('[AnySubjectSolver] Normalized card:', { exists, focus, summary, stepsLength, detailsLength })
```

### 3. ExplainCard Component (`apps/web/components/solve/ExplainCard.tsx`)

```typescript
console.log('[ExplainCard] Received props:', { cardExists, focus, summary, stepsLength, detailsLength })
console.warn('[ExplainCard] card is null/undefined, showing skeleton')
console.log('[ExplainCard] Rendering AnimatedCard...')
```

---

## 🧪 測試步驟

### Step 1: 在瀏覽器打開 Console

1. 訪問 `http://localhost:3000/ask`
2. 按 `Cmd + Option + I` (Mac) 或 `F12` (Windows) 打開 DevTools
3. 切換到 **Console** 標籤

### Step 2: 輸入測試題目

```
There are reports coming in that a number of people have been injured in a terrorist ____.
(A) access (B) supply (C) attack (D) burden
```

### Step 3: 觀察 Console 輸出

**預期看到的日誌順序**:

```javascript
// 1. Options Parsing
[parseOptionsFromText] Matched pattern: ...
[parseOptionsFromText] Found 4 options

// 2. English Router Pipeline
[route-solver] Using English explanation pipeline...
[route-solver] Parsed options: [{key: 'A', text: 'access'}, ...]
[route-solver] Calling orchestrateEnglishExplanation...
[explain_pipeline] Starting English type classification...
[explain_pipeline] Type classified: { type: 'E1', confidence: 0.8, ... }

// 3. Template Generation
[explain_pipeline] Generating template card for type: E1
[explain_pipeline] Extracting vocabulary hints...

// 4. Validation
[explain_pipeline] Validating card...
[explain_pipeline] ✅ Card validated successfully
[event] explain_card_generated

// 5. API Response
[route-solver] English result received: { cardId: '...', kind: 'E1', routing: 'E1' }
[route-solver] Converted to legacy format: { focus: '...', summary: '...', stepsCount: 4, detailsCount: 4 }

// 6. Frontend Reception
[AnySubjectSolver] API Response received: { subject: 'english', hasExplainCard: true, ... }
[AnySubjectSolver] Normalizing result...
[AnySubjectSolver] Normalized card: { exists: true, focus: '...', stepsLength: 4, ... }

// 7. Render
[ExplainCard] Received props: { cardExists: true, focus: '...', ... }
[ExplainCard] Rendering AnimatedCard...
```

---

## 🐛 可能的錯誤場景

### Scenario A: 選項解析失敗

**Console 顯示**:
```javascript
[parseOptionsFromText] No options found in text
[route-solver] No options found for English question, falling back to hybrid solve
```

**原因**: 選項格式不匹配  
**解決**: 檢查題目格式，`parseOptionsFromText` 已支援多種格式

---

### Scenario B: English Router 未觸發

**Console 顯示**:
```javascript
（沒有 [route-solver] Using English explanation pipeline...）
✅ Guard: hard=none, experts=[english:1.00,...]
```

**原因**: 環境變數或科目判斷失敗  
**檢查**:
```bash
# 確認環境變數
echo $EN_EXPLAIN_ROUTER_V1
# 應該是 'true' 或未設定
```

---

### Scenario C: LLM Template 失敗

**Console 顯示**:
```javascript
[explain_pipeline] Critical error: ...
[event] explain_pipeline_fallback { reason: 'critical_error' }
```

**原因**: LLM API 調用失敗或返回格式錯誤  
**檢查**:
- `OPENAI_API_KEY` 是否正確
- Network 標籤是否有 500 錯誤
- Server logs 是否有詳細錯誤

---

### Scenario D: 驗證失敗

**Console 顯示**:
```javascript
[explain_pipeline] Validation failed, falling back to minimal template
[event] explain_pipeline_fallback { reason: 'validation_failed', issues: [...] }
```

**原因**: Schema 驗證不通過  
**檢查**: `issues` 陣列中的具體問題

---

### Scenario E: 前端 Normalize 失敗

**Console 顯示**:
```javascript
[AnySubjectSolver] API Response received: { hasExplainCard: false }
[AnySubjectSolver] Normalized card: { exists: false }
```

**原因**: API 返回格式與預期不符  
**檢查**: `solverJson.explainCard` 是否存在

---

### Scenario F: ExplainCard Props 為空

**Console 顯示**:
```javascript
[ExplainCard] Received props: { cardExists: false }
[ExplainCard] card is null/undefined, showing skeleton
```

**原因**: Props 傳遞斷層  
**檢查**: `AnySubjectSolver.tsx` 中 `setCard(normalizedCard)` 是否執行

---

## 📝 回報格式

測試後，請複製完整的 Console 輸出並回報：

```
========== Console Output ==========
[貼上所有 console.log 內容]
===================================
```

---

## 🔧 快速修復（如果問題出現在特定階段）

### 修復選項解析
```bash
# 直接在 route.ts 中測試
console.log('Test parse:', parseOptionsFromText('...(A) text (B) text...'))
```

### 停用 English Router（回退舊流程）
```bash
# apps/web/.env.local
EN_EXPLAIN_ROUTER_V1=false
```

### 強制返回 Mock 資料
```typescript
// 在 route.ts 中
return NextResponse.json({
  subject: 'english',
  explainCard: {
    focus: '考點測試',
    summary: '解析測試',
    steps: ['步驟1', '步驟2'],
    details: ['詳解1', '詳解2'],
  },
})
```

---

## ✅ 成功標準

測試成功後應該看到：

1. **Console**: 完整的日誌鏈（router → template → validate → API → frontend → render）
2. **UI**: ExplainCard 顯示 4 個區塊（考點、解析、步驟、詳解）
3. **無錯誤**: 無 React errors、無 Zod errors、無 Runtime errors

---

**請在瀏覽器測試並回報 Console 輸出！** 🧪

