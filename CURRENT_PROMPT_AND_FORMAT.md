# 目前的 Prompt 和輸出格式規定

## 當前使用的 Prompt

**位置：** `apps/web/lib/ai/universal-explainer.ts` → `buildSimpleMarkdownPrompt()`

```typescript
function buildSimpleMarkdownPrompt(inputText: string, isEnglish: boolean): string {
  const content = safeText(inputText, '')
  
  const subjectContext = isEnglish
    ? '這是英文題目，請提供專業的英文學習解釋。'
    : '這是題目，請提供專業的解釋。'

  return `你是專業的學測解題老師。請為以下題目生成完整詳解。

**題目：**
${content}

**要求：**
- 用繁體中文生成詳解
- 說明為什麼答案是正確的
- 說明其他選項為什麼不正確
- 內容要準確、清晰、有幫助

請直接開始生成詳解，不需要遵循特定格式，只要內容正確清楚即可。`
}
```

## 當前 API 參數設定

**位置：** `apps/web/lib/ai/universal-explainer.ts` → `universalExplainer()`

```typescript
const result = await chatCompletion(
  [{ role: 'user', content: prompt }],
  {
    model: 'gpt-4o-mini',
    temperature: 0.3, // ✅ 適中溫度：平衡創造力和準確性
    max_tokens: 2000, // ✅ 足夠的長度處理複雜題目
  }
)
```

## API Route 的答案提取邏輯

**位置：** `apps/web/app/api/explain/route.ts` → 第 148-188 行

```typescript
// ✅ 簡化：直接從 markdown 中提取答案，不需要結構化數據
// 嘗試從 markdown 中提取答案（例如：答案：(1) B 或 答案：C）
let answer = ''
let briefReason = '詳解已生成'
let kind: string = 'vocab'

// 從 markdown 中提取答案
const answerMatch = universal.markdown.match(/答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/i) ||
                  universal.markdown.match(/答案[：:]\s*([A-E])/i) ||
                  universal.markdown.match(/^##\s*✅?\s*答案[：:]\s*(?:\(?\d+\)?\s*)?([A-E])/im)

if (answerMatch) {
  answer = answerMatch[1].toUpperCase()
} else {
  // 如果找不到單一答案，嘗試找多個答案（例如：(1) B, (2) C）
  const multiAnswerMatch = universal.markdown.match(/(?:\(?\d+\)?\s*([A-E]))/gi)
  if (multiAnswerMatch && multiAnswerMatch.length > 0) {
    answer = multiAnswerMatch[0].match(/([A-E])/i)?.[1]?.toUpperCase() || ''
  }
}

// 從 markdown 中提取簡短理由（取前 100 字）
const reasoningMatch = universal.markdown.match(/詳解[：:]?\s*([^\n]{20,100})/i) ||
                      universal.markdown.match(/解析[：:]?\s*([^\n]{20,100})/i) ||
                      universal.markdown.match(/##\s*🧠\s*詳解\s*\n\n([^\n]{20,100})/i)

if (reasoningMatch) {
  briefReason = reasoningMatch[1].trim().substring(0, 50)
}

// 如果還是沒有答案，從 markdown 開頭提取（避免顯示 '-'）
if (!answer) {
  const fallbackMatch = universal.markdown.match(/([A-E])\s*[—–-]/i) ||
                       universal.markdown.match(/選項\s*([A-E])/i)
  if (fallbackMatch) {
    answer = fallbackMatch[1].toUpperCase()
  }
}
```

## 問題分析

### 當前 Prompt 的問題

1. **太簡化**：只有 4 行要求，沒有格式指引
2. **沒有結構要求**：AI 不知道應該如何組織內容
3. **沒有範例**：AI 不知道理想的輸出長什麼樣子
4. **沒有答案格式要求**：導致答案提取失敗

### 當前答案提取的問題

1. **依賴正則表達式**：如果 AI 沒有按照特定格式寫答案，就提取不到
2. **多個 fallback**：說明格式不一致
3. **沒有驗證**：提取到的答案可能不正確

### 預期的輸出格式（從文檔中）

根據 `docs/TUTOR_EXPLAIN_API.md`，理想的格式應該是：

```markdown
### 題意理解
- 題型：vocabulary
- 關鍵詞：bacteria, microscope
- 線索：需要配對的名詞

### 解題步驟
1. 看懂句子核心：Microscopes are used to see...
2. 檢查每個選項的意思與詞性
3. 選擇符合語境的詞

✅ 正確答案：(C) germs

### 為什麼
- "germs" 指微小的生物（病菌）
- 其他選項與「細菌」無關

### 教學化說明
顯微鏡用來看很小很小的東西，像是細菌（bacteria）或病菌（germs）。這兩個詞很接近，都是指會讓人生病的小生物。
```

## 建議

需要一個**結構清晰但不過度限制**的 prompt，讓 AI 能夠：
1. 生成結構化的 markdown
2. 明確標示答案
3. 提供清晰的解析
4. 說明其他選項為什麼不正確

