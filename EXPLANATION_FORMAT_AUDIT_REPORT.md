# 詳解格式全面檢查報告

## 📋 執行摘要

本報告針對新的詳解規格進行全專案掃描，檢查所有可能與新格式衝突的程式邏輯、驗證規則、UI 組件和技術債。

**新規格重點回顧：**
- 思路說明區塊：**二選一**（## 題意說明 或 ## 解題步驟），不保證同時存在
- 正確答案格式：固定為 `正確答案：(B) hatch`（A–E 大寫字母 + 空格 + 單字）
- 錯誤選項解析：條列說明 (A)~(E)
- 小結與記憶：1–3 句總結

---

## 一、Explain 流程現況總結

### 1.1 完整流程圖

```
用戶輸入題目
    ↓
/api/explain/route.ts
    ↓
universalExplainer() → buildSimpleMarkdownPrompt()
    ↓
LLM 生成 Markdown（新格式）
    ↓
route.ts 提取答案（正則表達式）
    ↓
返回 { markdown, answer, briefReason, fullExplanation }
    ↓
前端組件接收並顯示
    ↓
（可選）存到錯題本 / backpack_notes
```

### 1.2 關鍵檔案位置

- **LLM Prompt 生成**：`apps/web/lib/ai/universal-explainer.ts` (buildSimpleMarkdownPrompt)
- **API 路由**：`apps/web/app/api/explain/route.ts`
- **答案提取**：`apps/web/app/api/explain/route.ts` (156-191 行)
- **格式化器**：`apps/web/lib/services/mcp/formatters.ts`
- **儲存邏輯**：`apps/web/lib/services/mcp/backpackNotes.ts`

---

## 二、與新規格可能衝突的地方

### 2.1 Explain API 相關

#### ⚠️ **衝突 1：答案提取正則表達式假設特定格式**

**檔案**：`apps/web/app/api/explain/route.ts` (156-191 行)

**問題**：
```typescript
// 第 156 行：假設「正確答案：(B) hatch」格式
const answerMatch = universal.markdown.match(/正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
                    universal.markdown.match(/答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
                    universal.markdown.match(/^##\s*✅?\s*正確答案\s*\n\n正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/im) ||
                    universal.markdown.match(/^##\s*✅?\s*正確答案\s*\n正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/im)
```

**分析**：
- ✅ 正則表達式**已經支援**新格式 `正確答案：(B) hatch`
- ⚠️ 但假設標題和答案在同一行或下一行，如果 LLM 輸出格式稍有變化（例如多空行），可能抓不到
- ⚠️ 沒有處理「正確答案：(B) hatch」這種「字母 + 空格 + 單字」的完整格式，只提取了字母

**建議**：正則表達式應該更寬鬆，支援多種可能的格式變體。

---

#### ⚠️ **衝突 2：briefReason 提取假設「解題步驟」或「題意說明」一定存在**

**檔案**：`apps/web/app/api/explain/route.ts` (172-181 行)

**問題**：
```typescript
// 第 172-177 行：優先從「解題步驟」或「題意說明」提取
const reasoningMatch = universal.markdown.match(/##\s*解題步驟\s*\n\n([^\n]{20,100})/i) ||
                        universal.markdown.match(/##\s*題意說明\s*\n\n([^\n]{20,100})/i) ||
                        universal.markdown.match(/錯誤選項解析[：:]?\s*([^\n]{20,100})/i) ||
                        universal.markdown.match(/詳解[：:]?\s*([^\n]{20,100})/i) ||
                        universal.markdown.match(/解析[：:]?\s*([^\n]{20,100})/i)
```

**分析**：
- ✅ 有 fallback 機制（如果找不到「解題步驟」或「題意說明」，會嘗試其他標題）
- ⚠️ 但假設這兩個標題後面**一定有內容**，如果 LLM 只輸出了「錯誤選項解析」和「小結與記憶」，可能會提取到錯誤的內容
- ⚠️ 正則表達式限制在 20-100 字元，可能截斷重要內容

**建議**：應該優先從「錯誤選項解析」或「小結與記憶」提取，因為這兩個區塊在新格式中是必填的。

---

#### ⚠️ **衝突 3：ExplainCardV2 硬編碼「解題步驟」標題**

**檔案**：`apps/web/components/solve/ExplainCardV2.tsx` (499 行)

**問題**：
```typescript
steps: vm.fullExplanation
  ? [{ title: '解題步驟', detail: vm.fullExplanation }]
  : [{ title: '解析', detail: vm.briefReason }],
```

**分析**：
- ⚠️ 硬編碼標題為「解題步驟」，但新格式可能只有「題意說明」而沒有「解題步驟」
- ⚠️ 如果 `vm.fullExplanation` 包含的是「題意說明」內容，標題會顯示錯誤

**建議**：應該從 markdown 中動態提取實際的標題名稱，或使用更通用的標題（例如「詳解」）。

---

### 2.2 錯題本相關的規則與限制

#### ✅ **Schema 檢查：error_book 表結構**

**檔案**：`supabase/migrations/SAFE_20251026_NEW_TABLES_ONLY.sql` (223-232 行)

**Schema**：
```sql
CREATE TABLE IF NOT EXISTS error_book (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  question_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes JSONB DEFAULT '{}'::JSONB,  -- ⚠️ 這裡存的是 JSONB，不是純文字
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**分析**：
- ✅ `notes` 欄位是 JSONB，可以存任何結構，**完全相容**新 Markdown 格式
- ⚠️ 但 `create_wrongbook_entry()` 函數（`apps/web/lib/services/mcp/wrongbook.ts`）**沒有實際儲存 explanation 參數**
- ⚠️ 錯題本目前只存 `question_id`，詳解內容是從 `pack_questions.explanation` 欄位讀取的

**建議**：檢查 `pack_questions.explanation` 欄位的資料類型和長度限制。

---

#### ⚠️ **衝突 4：pack_questions.explanation 欄位可能有限制**

**檔案**：需要檢查 `pack_questions` 表的 schema

**問題**：
- 錯題本顯示的詳解是從 `pack_questions.explanation` 讀取的（見 `BackpackContent.tsx` 585-589 行）
- 如果這個欄位是 `TEXT` 類型，應該沒有長度限制
- 但如果有限制（例如 `VARCHAR(500)`），可能會截斷新格式的 Markdown

**建議**：確認 `pack_questions.explanation` 的資料類型，確保可以存完整的 Markdown。

---

#### ⚠️ **衝突 5：BackpackContent.tsx 顯示詳解時沒有處理 Markdown**

**檔案**：`apps/web/app/(app)/backpack/BackpackContent.tsx` (585-589 行)

**問題**：
```typescript
{question?.explanation && (
  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
    {question.explanation}
  </p>
)}
```

**分析**：
- ⚠️ 直接顯示 `question.explanation` 為純文字，**沒有渲染 Markdown**
- ⚠️ 如果詳解是新格式的 Markdown（包含 `## 題意說明`、`## ✅ 正確答案` 等），會顯示為原始 Markdown 文字，用戶體驗不佳
- ⚠️ `line-clamp-2` 會截斷內容，可能導致 Markdown 格式混亂

**建議**：應該使用 `MarkdownExplain` 或 `ReactMarkdown` 組件來渲染詳解。

---

### 2.3 前端顯示詳解的 UI / 組件

#### ⚠️ **衝突 6：ExplainCard.tsx 硬編碼「解題步驟」區塊**

**檔案**：`apps/web/components/solve/ExplainCard.tsx` (87-92 行)

**問題**：
```typescript
const sections = [
  { icon: '📘', title: '考點', content: card.focus || '' },
  { icon: '💡', title: '一句話解析', content: card.summary || '' },
  { icon: '🧩', title: '解題步驟', content: (card.steps || []).join('\n') },  // ⚠️ 硬編碼
  { icon: '📖', title: '詳細說明', content: (card.details || []).join('\n\n') },
].filter((s) => s.content.trim())
```

**分析**：
- ⚠️ 這個組件使用的是**舊的結構化格式**（`ExplainCardModel`），不是新格式的 Markdown
- ⚠️ 如果新格式只有「題意說明」而沒有「解題步驟」，這個組件無法正確顯示
- ⚠️ 這個組件可能已經被 `ExplainCardV2` 或 `MarkdownExplain` 取代，需要確認是否還在用

**建議**：確認這個組件是否還在生產環境使用，如果不用可以標記為 deprecated。

---

#### ✅ **MarkdownExplain.tsx 已經支援新格式**

**檔案**：`apps/web/components/solve/MarkdownExplain.tsx`

**分析**：
- ✅ 這個組件使用 `ReactMarkdown` 渲染，**完全相容**新格式的 Markdown
- ✅ 沒有硬編碼特定標題名稱，會自動渲染所有 `##` 標題
- ✅ 已經有處理「✅ 答案」區塊的特殊樣式（77-85 行）
- ⚠️ 但沒有特別處理「題意說明」和「解題步驟」的差異，這其實是**優點**（更靈活）

**建議**：確認所有顯示詳解的地方都使用 `MarkdownExplain` 組件。

---

#### ⚠️ **衝突 7：ExplanationCard.tsx 和 ExplanationCardV2.tsx 使用舊的結構化格式**

**檔案**：
- `apps/web/components/ask/ExplanationCard.tsx`
- `apps/web/components/ask/ExplanationCardV2.tsx`

**問題**：
- 這兩個組件接收的是結構化的 props（`summary`, `steps`, `grammarRows`），不是 Markdown 字串
- 硬編碼顯示「🔍 解題步驟」標題（`ExplanationCard.tsx` 132 行）
- 如果新格式只有「題意說明」，這些組件無法正確顯示

**分析**：
- ⚠️ 需要確認這些組件是否還在生產環境使用
- ⚠️ 如果使用，需要修改為接收 Markdown 並使用 `MarkdownExplain` 渲染

**建議**：檢查這些組件的使用情況，如果不用可以標記為 deprecated，或修改為支援 Markdown。

---

### 2.4 舊程式 / 技術債清單

#### 🗑️ **技術債 1：舊版結構化詳解型別定義**

**檔案**：
- `apps/web/lib/ai/universal-explainer.ts` (41-47 行) - `ExplainCardContentData` interface
- `lib/tutor-types.ts` (84-90 行) - `Explanation` interface
- `apps/web/lib/solve-types.ts` (202 行) - `steps: z.array(z.string())`

**問題**：
- 這些型別定義描述的是**舊的結構化格式**（有 `steps`, `summary`, `reasoning` 等欄位）
- 但新格式是純 Markdown 字串，不再使用這些結構化欄位

**建議**：
- 如果這些型別已經不再使用，可以標記為 `@deprecated`
- 如果還在用（例如向後兼容），需要確認是否會與新格式衝突

---

#### 🗑️ **技術債 2：舊版 explainer prompt 片段**

**檔案**：
- `apps/web/lib/mapper/explain-presenter.ts` (1854-1862 行) - 提到「解題步驟」標記
- `apps/web/lib/english/templates-streaming.ts` (124, 131 行) - 禁止使用「解題步驟」格式

**問題**：
- 這些檔案可能還在使用舊的 prompt 邏輯
- 需要確認是否與新的 `buildSimpleMarkdownPrompt()` 衝突

**建議**：檢查這些檔案是否還在生產環境使用，如果不用可以移除。

---

#### 🗑️ **技術債 3：舊版文檔和範例**

**檔案**：
- `apps/web/docs/TUTOR_EXPLAIN_API.md` - 包含舊格式範例
- `apps/web/legacy/types-deprecated.ts` - 包含舊格式範例

**問題**：
- 文檔中的範例可能還是舊格式（例如「### 題意理解」、「### 解題步驟」）
- 可能誤導開發者

**建議**：更新文檔，或標記為「已過時」。

---

#### 🗑️ **技術債 4：formatters.ts 的 fallback 邏輯使用舊格式**

**檔案**：`apps/web/lib/services/mcp/formatters.ts` (47-68 行)

**問題**：
```typescript
function generateMarkdown(result: UniversalExplainResult): string {
  // 簡化：直接使用 markdown，如果沒有則生成簡單格式
  if (result.markdown && result.markdown.trim().length > 0) {
    return result.markdown
  }

  // 簡單 fallback：從 questions 生成基本格式
  let md = '# 解題詳解\n\n'
  // ... 使用舊格式生成
}
```

**分析**：
- ✅ 優先使用 `result.markdown`，這是正確的
- ⚠️ fallback 邏輯使用舊格式（`**答案**:`, `**解析**:`），但這只在 `result.markdown` 為空時才會觸發
- ⚠️ 如果 `universalExplainer()` 正常運作，這個 fallback 應該不會被觸發

**建議**：確認這個 fallback 是否還會被觸發，如果不會可以簡化或移除。

---

## 三、語法錯誤檢查

### 3.1 BackpackContent.tsx 語法錯誤

**檔案**：`apps/web/app/(app)/backpack/BackpackContent.tsx`

**錯誤訊息**：
```
Error: 
  × Unexpected token `div`. Expected jsx identifier
     ╭─[/Users/simonac/Desktop/moonshot-idea/apps/web/app/(app)/backpack/BackpackContent.tsx:279:1]
 279 │   }, [handleFileSelect])
 280 │ 
 281 │   return (
 282 │     <div className="mx-auto max-w-lg pb-4">
     ·      ───
```

**分析**：
- 從讀取的檔案內容來看，第 281-282 行的語法**看起來是正常的**
- Linter 也沒有報告錯誤
- 可能是以下原因：
  1. **編譯器快取問題**：嘗試清除 `.next` 目錄和 `node_modules/.cache`
  2. **隱藏字元**：檔案可能有不可見的 Unicode 字元
  3. **TypeScript 編譯問題**：可能是 TypeScript 編譯器的暫時性錯誤

**建議**：
1. 嘗試重新啟動開發伺服器
2. 檢查檔案編碼（應該是 UTF-8）
3. 如果問題持續，可以嘗試重新格式化檔案

---

## 四、建議的調整方向

### 4.1 高優先級（可能導致功能錯誤）

1. **更新答案提取正則表達式**
   - 檔案：`apps/web/app/api/explain/route.ts` (156-191 行)
   - 類型：更新 regex
   - 目標：確保能正確提取「正確答案：(B) hatch」格式中的字母和單字

2. **更新 briefReason 提取邏輯**
   - 檔案：`apps/web/app/api/explain/route.ts` (172-181 行)
   - 類型：調整提取優先順序
   - 目標：優先從「錯誤選項解析」或「小結與記憶」提取，因為這兩個區塊是必填的

3. **修正 BackpackContent.tsx 顯示詳解**
   - 檔案：`apps/web/app/(app)/backpack/BackpackContent.tsx` (585-589 行)
   - 類型：改用 Markdown 渲染組件
   - 目標：使用 `MarkdownExplain` 或 `ReactMarkdown` 渲染詳解，而不是純文字

4. **確認 pack_questions.explanation 欄位類型**
   - 檔案：需要檢查資料庫 schema
   - 類型：確認資料類型
   - 目標：確保可以存完整的 Markdown（應該是 `TEXT` 類型）

---

### 4.2 中優先級（可能影響用戶體驗）

5. **更新 ExplainCardV2 標題邏輯**
   - 檔案：`apps/web/components/solve/ExplainCardV2.tsx` (499 行)
   - 類型：動態提取標題
   - 目標：從 markdown 中提取實際標題，或使用更通用的標題

6. **檢查 ExplanationCard 組件使用情況**
   - 檔案：`apps/web/components/ask/ExplanationCard.tsx` 和 `ExplanationCardV2.tsx`
   - 類型：確認是否還在用，或修改為支援 Markdown
   - 目標：如果不用可以標記為 deprecated，或修改為支援新格式

---

### 4.3 低優先級（清理技術債）

7. **標記舊型別為 deprecated**
   - 檔案：`apps/web/lib/ai/universal-explainer.ts`, `lib/tutor-types.ts`, `apps/web/lib/solve-types.ts`
   - 類型：添加 `@deprecated` 註解
   - 目標：標記不再使用的型別定義

8. **更新文檔和範例**
   - 檔案：`apps/web/docs/TUTOR_EXPLAIN_API.md`, `apps/web/legacy/types-deprecated.ts`
   - 類型：更新文檔
   - 目標：確保文檔反映新格式

9. **簡化 formatters.ts fallback 邏輯**
   - 檔案：`apps/web/lib/services/mcp/formatters.ts` (47-68 行)
   - 類型：簡化或移除 fallback
   - 目標：如果 fallback 不會被觸發，可以簡化或移除

---

## 五、總結

### 5.1 相容性評估

| 項目 | 狀態 | 說明 |
|------|------|------|
| LLM Prompt 生成 | ✅ 完全相容 | `buildSimpleMarkdownPrompt()` 已更新為新格式 |
| 答案提取邏輯 | ⚠️ 部分相容 | 正則表達式需要微調以確保穩定提取 |
| briefReason 提取 | ⚠️ 部分相容 | 需要調整優先順序，優先從必填區塊提取 |
| 錯題本 Schema | ✅ 完全相容 | `error_book.notes` 是 JSONB，可以存任何格式 |
| pack_questions.explanation | ⚠️ 需確認 | 需要確認資料類型和長度限制 |
| MarkdownExplain 組件 | ✅ 完全相容 | 使用 ReactMarkdown，自動支援新格式 |
| ExplainCard 組件 | ⚠️ 不相容 | 使用舊的結構化格式，需要確認是否還在用 |
| ExplanationCard 組件 | ⚠️ 不相容 | 使用舊的結構化格式，需要確認是否還在用 |
| BackpackContent 顯示 | ⚠️ 不相容 | 直接顯示純文字，沒有渲染 Markdown |

### 5.2 風險評估

- **高風險**：BackpackContent.tsx 顯示詳解時沒有渲染 Markdown，用戶會看到原始 Markdown 文字
- **中風險**：答案提取正則表達式可能在某些邊緣情況下失敗
- **低風險**：舊組件和型別定義如果不再使用，不會影響功能

### 5.3 下一步行動

1. **立即處理**：修正 BackpackContent.tsx 的 Markdown 渲染問題
2. **優先處理**：更新答案提取和 briefReason 提取邏輯
3. **後續清理**：標記舊組件和型別為 deprecated，更新文檔

---

**報告生成時間**：2025-01-27  
**檢查範圍**：全專案掃描  
**檢查重點**：Explain API、錯題本、前端 UI 組件、技術債

