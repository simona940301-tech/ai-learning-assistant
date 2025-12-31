# 詳解格式修正總結

## 📋 修正完成時間
2025-01-27

## ✅ 已完成的修正項目

### 1. `/api/explain/route.ts` - 答案與 briefReason 抽取邏輯優化

#### 1-1. 答案抽取 regex 強化
**檔案**：`apps/web/app/api/explain/route.ts` (155-165 行)

**修改內容**：
- 優先尋找「## ✅ 正確答案」標題後 0-3 行內的「正確答案：(X)」格式
- 保留對其他格式的相容性（直接尋找「正確答案：(X)」或「答案：(X)」）
- 只提取 A-E 字母，維持原有 API 回傳格式

**修改前**：
```typescript
const answerMatch = universal.markdown.match(/正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
                  universal.markdown.match(/答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
                  // ... 其他格式
```

**修改後**：
```typescript
const answerMatch = 
  // 優先：在「## ✅ 正確答案」標題後 0-3 行內尋找「正確答案：(X)」格式
  universal.markdown.match(/##\s*✅\s*正確答案\s*\n+(?:\s*\n){0,2}\s*正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/im) ||
  // 次優先：直接尋找「正確答案：(X)」格式
  universal.markdown.match(/正確答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
  // Fallback：尋找「答案：(X)」格式
  universal.markdown.match(/答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i)
```

#### 1-2. briefReason 抽取優先順序調整
**檔案**：`apps/web/app/api/explain/route.ts` (178-194 行)

**修改內容**：
- 調整優先順序：小結與記憶 > 錯誤選項解析 > 解題步驟/題意說明 > 其他
- 新規格中「小結與記憶」和「錯誤選項解析」是必填的，優先從這些區塊提取
- 調整字元範圍從 20-100 改為 15-80，更符合實際內容長度

**修改前**：
```typescript
const reasoningMatch = universal.markdown.match(/##\s*解題步驟\s*\n\n([^\n]{20,100})/i) ||
                      universal.markdown.match(/##\s*題意說明\s*\n\n([^\n]{20,100})/i) ||
                      // ... 其他
```

**修改後**：
```typescript
const reasoningMatch = 
  // 優先 1：從「小結與記憶」區塊提取（必填，1-3 句總結）
  universal.markdown.match(/##\s*小結與記憶\s*\n+([^\n]{15,80})/i) ||
  // 優先 2：從「錯誤選項解析」區塊提取（必填，條列說明）
  universal.markdown.match(/##\s*錯誤選項解析\s*\n+([^\n]{15,80})/i) ||
  // Fallback 1：從「解題步驟」區塊提取（可能不存在）
  universal.markdown.match(/##\s*解題步驟\s*\n+([^\n]{15,80})/i) ||
  // Fallback 2：從「題意說明」區塊提取（可能不存在）
  universal.markdown.match(/##\s*題意說明\s*\n+([^\n]{15,80})/i) ||
  // Fallback 3：其他可能的標題
  universal.markdown.match(/##\s*詳解\s*\n+([^\n]{15,80})/i) ||
  universal.markdown.match(/##\s*解析\s*\n+([^\n]{15,80})/i)
```

---

### 2. `BackpackContent.tsx` - 改用 Markdown 渲染詳解

**檔案**：`apps/web/app/(app)/backpack/BackpackContent.tsx`

**修改內容**：
- 新增 `ReactMarkdown` import
- 將原本的 `<p>{question.explanation}</p>` 改為使用 `ReactMarkdown` 渲染
- 自訂 components 以保持簡潔的 UI（限制字元長度、調整樣式）
- 保留 `line-clamp-2` 效果，但不會破壞 Markdown 結構

**修改前**：
```typescript
{question?.explanation && (
  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
    {question.explanation}
  </p>
)}
```

**修改後**：
```typescript
{question?.explanation && (
  <div className="text-sm text-muted-foreground mb-3 prose prose-sm max-w-none dark:prose-invert">
    <ReactMarkdown
      components={{
        // 自訂渲染組件，保持簡潔 UI
        p: ({ children }) => { /* ... */ },
        h2: ({ children }) => { /* ... */ },
        // ... 其他組件
      }}
    >
      {question.explanation.length > 300 
        ? question.explanation.substring(0, 300) + '...' 
        : question.explanation}
    </ReactMarkdown>
  </div>
)}
```

---

### 3. 移除硬編碼「解題步驟」標題

#### 3-1. `ExplainCardV2.tsx`
**檔案**：`apps/web/components/solve/ExplainCardV2.tsx` (498-500 行)

**修改內容**：
- 將硬編碼的 `title: '解題步驟'` 改為 `title: '詳解'`
- 新增註解說明原因

**修改前**：
```typescript
steps: vm.fullExplanation
  ? [{ title: '解題步驟', detail: vm.fullExplanation }]
  : [{ title: '解析', detail: vm.briefReason }],
```

**修改後**：
```typescript
// 使用通用標題「詳解」，避免硬編碼「解題步驟」（新格式可能只有「題意說明」而沒有「解題步驟」）
steps: vm.fullExplanation
  ? [{ title: '詳解', detail: vm.fullExplanation }]
  : [{ title: '解析', detail: vm.briefReason }],
```

#### 3-2. `ExplainCard.tsx`
**檔案**：`apps/web/components/solve/ExplainCard.tsx` (361-363 行)

**修改內容**：
- 將硬編碼的 `title: '解題步驟'` 改為 `title: '詳解'`
- 新增註解說明原因

**修改前**：
```typescript
steps: vm.fullExplanation
  ? [{ title: '解題步驟', detail: safeText(vm.fullExplanation, '') }]
  : [{ title: '解析', detail: safeText(vm.briefReason, '') }],
```

**修改後**：
```typescript
// 使用通用標題「詳解」，避免硬編碼「解題步驟」（新格式可能只有「題意說明」而沒有「解題步驟」）
steps: vm.fullExplanation
  ? [{ title: '詳解', detail: safeText(vm.fullExplanation, '') }]
  : [{ title: '解析', detail: safeText(vm.briefReason, '') }],
```

#### 3-3. `ExplanationCard.tsx`
**檔案**：`apps/web/components/ask/ExplanationCard.tsx` (133 行)

**修改內容**：
- 將硬編碼的「🔍 解題步驟」改為「🔍 詳解」
- 新增註解說明原因

**修改前**：
```typescript
<h3 className="text-xs uppercase tracking-[0.3em] text-white/40">🔍 解題步驟</h3>
```

**修改後**：
```typescript
{/* 使用通用標題「詳解」，避免硬編碼「解題步驟」（新格式可能只有「題意說明」而沒有「解題步驟」） */}
<h3 className="text-xs uppercase tracking-[0.3em] text-white/40">🔍 詳解</h3>
```

#### 3-4. `ExplanationCardV2.tsx`
**檔案**：`apps/web/components/ask/ExplanationCardV2.tsx` (235 行)

**修改內容**：
- 將硬編碼的「🔍 解題步驟」改為「🔍 詳解」

#### 3-5. `PastPaperMiniCard.tsx`
**檔案**：`apps/web/components/ask/PastPaperMiniCard.tsx` (232 行)

**修改內容**：
- 將硬編碼的「解題步驟」改為「詳解」

---

## 📊 修改檔案清單

| 檔案路徑 | 主要修改內容 | 行數 |
|---------|------------|------|
| `apps/web/app/api/explain/route.ts` | 答案抽取 regex 強化、briefReason 優先順序調整 | 155-194 |
| `apps/web/app/(app)/backpack/BackpackContent.tsx` | 改用 ReactMarkdown 渲染詳解 | 1, 586-621 |
| `apps/web/components/solve/ExplainCardV2.tsx` | 移除硬編碼「解題步驟」標題 | 498-500 |
| `apps/web/components/solve/ExplainCard.tsx` | 移除硬編碼「解題步驟」標題 | 361-363 |
| `apps/web/components/ask/ExplanationCard.tsx` | 移除硬編碼「解題步驟」標題 | 133 |
| `apps/web/components/ask/ExplanationCardV2.tsx` | 移除硬編碼「解題步驟」標題 | 235 |
| `apps/web/components/ask/PastPaperMiniCard.tsx` | 移除硬編碼「解題步驟」標題 | 232 |

---

## ✅ 驗證檢查

### Lint 檢查
- ✅ 所有修改的檔案通過 lint 檢查，無錯誤

### 相容性確認
- ✅ 答案抽取邏輯：優先支援新格式「## ✅ 正確答案」標題後的「正確答案：(X)」格式，同時保留對舊格式的相容性
- ✅ briefReason 抽取：優先從必填區塊（小結與記憶、錯誤選項解析）提取，符合新規格
- ✅ UI 組件：所有硬編碼「解題步驟」的標題已改為通用的「詳解」，避免與新格式衝突
- ✅ Markdown 渲染：BackpackContent 現在正確渲染 Markdown，不會顯示原始 Markdown 文字

---

## 🔍 未修改的項目（依要求保留）

以下項目依要求**未修改**，維持原有邏輯：

1. ✅ `buildSimpleMarkdownPrompt()` 的內容與結構（未修改 prompt 文案）
2. ✅ `universalExplainer()` 的輸入/輸出型別（未修改）
3. ✅ `/api/explain/route.ts` 的 API 路徑、request/response 結構（只修改內部邏輯）
4. ✅ 資料表結構（未新增 migration）

---

## 📝 注意事項

1. **答案抽取**：新的 regex 優先尋找「## ✅ 正確答案」標題後的格式，但如果 LLM 輸出格式稍有變化（例如多空行），仍會 fallback 到其他格式
2. **briefReason 抽取**：優先從必填區塊提取，但如果這些區塊內容過短或格式不符，仍會 fallback 到其他標題
3. **Markdown 渲染**：BackpackContent 中的 Markdown 渲染會限制顯示長度（300 字元），如需完整顯示，可能需要點擊進入詳情頁面
4. **硬編碼標題**：所有「解題步驟」標題已改為「詳解」，但這些組件仍使用結構化的 props（例如 `steps: string[]`），如果未來需要完全支援新 Markdown 格式，可能需要進一步重構

---

## 🎯 下一步建議

1. **測試驗證**：建議實際測試幾題，確認答案和 briefReason 提取正確
2. **UI 測試**：在錯題本/Backpack 中開啟有 explanation 的項目，確認 Markdown 渲染正常
3. **監控**：觀察是否有邊緣情況導致答案或 briefReason 提取失敗

---

**修正完成時間**：2025-01-27  
**修正範圍**：7 個檔案，主要修正答案抽取、briefReason 抽取、Markdown 渲染、硬編碼標題

