# Tutor Explain API 文檔

> ⚠️ **狀態更新**：此文檔描述的是規劃中（尚未實作）的 API。  
> 目前程式碼僅提供 demo/mock 端點，真實資料庫與推論流程仍待開發。

## 概述

Tutor Explain API 是一個世界級的多科目 AI 教師系統，專為台灣學測考題設計。它能夠：

1. **自動偵測題型**：不依賴主題詞，而是分析任務意圖
2. **精準分段**：自動識別多題（即使沒有題號）
3. **適應性策略**：針對不同科目與題型使用專家級解題邏輯
4. **ELI10 解釋**：用 10 歲小孩能懂的方式說明

## API 端點

### POST /api/tutor/explain

解釋學測考題，自動偵測科目與題型。

**請求體：**
```json
{
  "question": "題目內容...",
  "autoSegment": true  // 可選，預設 true
}
```

**回應（單題）：**
```json
{
  "subject": "English",
  "type": "vocabulary",
  "question": "Microscopes are used to see...",
  "answer": "(C) germs",
  "reasoning": "### 題意理解\n...\n### 解題步驟\n...",
  "explanation": "### 教學化說明\n...",
  "extras": {
    "translationPairs": ["consequently（因此，adv.）"],
    "formulas": ["F = ma"]
  },
  "meta": {
    "difficulty": "Medium",
    "level": "Basic",
    "tags": ["tutor", "ask", "quiz", "english"]
  }
}
```

**回應（多題）：**
```json
{
  "questions": [
    { /* 題 1 */ },
    { /* 題 2 */ }
  ],
  "count": 2
}
```

### POST /api/tutor/save-to-backpack

將解題結果儲存到書包，支持 Markdown 雙標籤渲染。

**請求體：**
```json
{
  "result": { /* TutorExplainResult */ },
  "userId": "user1"  // 可選
}
```

**回應：**
```json
{
  "success": true,
  "file": { /* backpack item */ },
  "message": "✓ 已存至書包",
  "metadata": { /* subject, type, tags */ }
}
```

## 科目與題型

### 國文科 (Chinese)

| 題型                         | 說明     | 策略重點         |
| -------------------------- | ------ | ------------ |
| modern_text_comprehension  | 現代文理解  | 找主旨句、轉折詞     |
| classical_text_comprehension | 文言文理解  | 翻譯關鍵句、解釋字義   |
| idiom_usage                | 成語/慣用語 | 字面意思 + 實際用途 |
| writing_analysis           | 文章分析   | 結構與寫作手法      |

### 英文科 (English)

| 題型                     | 說明   | 策略重點                 |
| ---------------------- | ---- | -------------------- |
| vocabulary             | 單字題  | 語境 + 詞性              |
| grammar                | 文法題  | 句子結構分析               |
| cloze                  | 克漏字  | **必須先列出選項總覽（中英對照）** |
| text_insertion         | 篇章結構 | **必須先翻譯選項句**        |
| reading_comprehension  | 閱讀理解 | 理解文章主旨               |
| translation            | 翻譯   | 標示文法結構               |

### 理科 (Science)

| 題型                      | 說明   | 策略重點          |
| ----------------------- | ---- | ------------- |
| concept_understanding   | 概念理解 | 定義 → 應用       |
| numerical_calculation   | 數值計算 | 公式 → 代入 → 驗算  |
| chart_interpretation    | 圖表判讀 | 標軸 → 找趨勢 → 推論 |
| experiment_design       | 實驗設計 | 自變因 / 依變因 / 控制 |

### 社會科 (Social)

| 題型                    | 說明   | 策略重點          |
| --------------------- | ---- | ------------- |
| historical_material   | 史料閱讀 | 辨時代 → 事件 → 對照 |
| chronological_order   | 時序排列 | 抓年代詞 → 建時間線   |
| map_interpretation    | 地圖判讀 | 讀座標 → 推論地理現象  |
| civic_law             | 公民法條 | 辨權力層級 → 制度運作  |

## 偵測邏輯

### 不依賴主題詞

❌ 錯誤：看到「microscope」就判斷為 Biology
✅ 正確：分析任務是「選擇符合語境的名詞」→ English Vocabulary

### 分段邏輯

1. **有題號**：`1. 2.` 或 `1) 2)` 自動分段
2. **無題號**：每 4 個選項 `(A)(B)(C)(D)` = 1 題
3. **完全無選項**：當作單題處理

## 輸出格式規範

### Markdown 結構

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

### 特殊格式要求

**英文克漏字：必須先列選項總覽**
```markdown
### 選項總覽
- consequently（因此，adv.）
- fragile（脆弱的，adj.）
- ...

### 逐格解析
#1 前後文：... / ...
需求：轉折副詞
選項：consequently ✅
理由：前後因果關係
```

**英文篇章結構：必須先翻譯選項句**
```markdown
### 選項句（英→中）
- (S1) However, ... → 然而，...
- (S2) This innovation ... → 這項創新...

### 逐格判斷
Slot A 前後文：... / ...
銜接：轉折
✅ Best: S1
理由：前面說好，後面說壞，需要「然而」
```

**理科：所有符號使用 Markdown 上標/下標**
- 正確：`x²`, `H₂O`, `m/s²`, `CO₂`, `Δv`
- 錯誤：`x^2`, `H2O`, `m/s2`

## 測試案例

### 案例 1：英文單字題（Microscope）

**輸入：**
```
Microscopes are used to see tiny organisms, such as bacteria or ____.
(A) mountains
(B) clouds
(C) germs
(D) oceans
```

**預期輸出：**
- `subject`: "English"
- `type`: "vocabulary"
- `answer`: "(C) germs"
- **不應該出現** "biology" 標籤

### 案例 2：多題自動分段

**輸入：**
```
下列何者正確？
(A) 甲
(B) 乙
(C) 丙
(D) 丁

關於光合作用，下列何者正確？
(A) 產生氧氣
(B) 消耗氧氣
(C) 不需要光
(D) 不需要水
```

**預期輸出：**
- `count`: 2
- 兩題分別解析

### 案例 3：英文克漏字（必須有選項總覽）

**輸入：**
```
... the material is __1__ fragile ...
Options: (A) consequently (B) fragile (C) however
```

**驗證點：**
- ✅ 必須包含「選項總覽」區段
- ✅ 每個選項有中譯 + 詞性

## 品質檢查清單

- [ ] 英文克漏字/篇章結構包含雙語翻譯列表
- [ ] 所有數學/科學符號正確渲染（`x²`, `CO₂`）
- [ ] 社會科題目的年代驗證（時序一致性）
- [ ] Microscope 案例返回 subject=English（非 Biology）
- [ ] 儲存的檔案可以在書包中打開並正確渲染 Markdown

## 儲存與渲染

### Backpack 儲存格式

```json
{
  "title": "Microscopes are used to see tiny organisms...",
  "type": "quiz_explanation",
  "content": {
    "core": "### 題意理解\n...",
    "reasoning": "### 解題步驟\n...",
    "explanation": "### 教學化說明\n..."
  },
  "metadata": {
    "subject": "English",
    "type": "vocabulary",
    "difficulty": "Medium",
    "tags": ["tutor", "ask", "quiz", "english"]
  },
  "render": "markdown_dual"
}
```

### 雙標籤渲染

前端應顯示兩個標籤：

1. **「理解」標籤**：顯示 `content.core`（題意理解 + 解題步驟）
2. **「解題」標籤**：顯示 `content.reasoning`（完整解題過程）

如果 `content` 缺失或空白：
```
此檔案內容尚未生成，請重新儲存。
```

## 使用範例

```typescript
// 1. 解釋題目
const response = await fetch('/api/tutor/explain', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: "Microscopes are used to see...",
    autoSegment: true
  })
})

const result = await response.json()
console.log(result.subject)  // "English"
console.log(result.answer)   // "(C) germs"

// 2. 儲存到書包
const saveResponse = await fetch('/api/tutor/save-to-backpack', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    result,
    userId: 'user123'
  })
})

const saved = await saveResponse.json()
console.log(saved.message)  // "✓ 已存至書包"
```

## 錯誤處理

```json
{
  "error": "請輸入題目"
}
```

可能的錯誤：
- `OpenAI API key not configured` (500)
- `請輸入題目` (400)
- `OpenAI API failed: ...` (500)
- `儲存失敗：...` (500)

## 最佳實踐

1. **不要依賴主題詞**：分析任務意圖而非關鍵字
2. **ELI10 原則**：一行一個概念，簡潔清晰
3. **雙語支援**：英文題用英文解釋，中文題用中文
4. **格式規範**：嚴格遵守 Markdown 標題與條列
5. **驗證答案**：確保 ✅ 符號與答案格式一致
