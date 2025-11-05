# Conservative Mode Implementation ✅

## 🎯 Overview

保守模式（Conservative Mode）是一個完全自診斷的題型判斷和詳解生成系統，不依賴外部 TARS 分類，直接從題目樣貌自行判斷題型並生成結構化、逐格、可驗證的 JSON 格式詳解。

---

## ✅ Implementation Complete

### 1. **類型定義** (`apps/web/lib/ai/conservative-types.ts`)
- ✅ `ConservativeQuestionType`: 7 種題型（E1_VOCAB, E2_CLOZE, E3_FILL_IN_CLOZE, E4_READING, E5_DISCOURSE, E5_TRANSLATION, E6_WRITING）
- ✅ `DistractorReject`: 選項分析結構
- ✅ `ClozeSlot`: 多格題型的空格結構
- ✅ `ReadingQuestion`: 閱讀測驗題目結構
- ✅ `MAWSScores`: 作文評分結構
- ✅ 完整的答案類型定義

### 2. **保守模式檢測器** (`apps/web/lib/ai/conservative-detector.ts`)
- ✅ 自行判斷題型（不依賴 TARS）
- ✅ 根據題目樣貌推斷（單句+選項 → E1_VOCAB，短文+空格 → E2_CLOZE，長文+字庫 → E3_FILL_IN_CLOZE，文章+問題 → E4_READING）
- ✅ 預設回退到 E2_CLOZE

### 3. **保守模式解釋器** (`apps/web/lib/ai/conservative-explainer.ts`)
- ✅ 根據題型生成結構化 JSON
- ✅ **E1_VOCAB**: 單格答案 + 理由 + 所有選項分析
- ✅ **E2_CLOZE/E3_FILL_IN_CLOZE/E5_DISCOURSE**: 逐格答案 + 理由 + 選項分析
- ✅ **E4_READING**: 逐題答案 + 證據句 + 選項分析
- ✅ **E5_TRANSLATION**: 參考翻譯 + 語法重點 + 道地表達
- ✅ **E6_WRITING**: MAWS 評分 + 質化評論 + 範文

### 4. **保守模式協調器** (`apps/web/lib/ai/conservative.ts`)
- ✅ 整合檢測和解釋流程
- ✅ 自動判斷信心度（high/medium/low）
- ✅ 返回完整的 `ConservativeResult`

### 5. **API 端點更新** (`apps/web/app/api/explain/route.ts`)
- ✅ 添加 `conservative` 布林參數
- ✅ 當 `conservative: true` 時使用保守模式
- ✅ 保持向後兼容（預設使用 TARS+KCE）

### 6. **UI 組件** (`apps/web/components/solve/explain/ConservativePresenter.tsx`)
- ✅ 支援所有 7 種題型的渲染
- ✅ 逐格顯示答案和理由
- ✅ 顯示信心度標籤
- ✅ 整合 Typewriter 動畫
- ✅ 極簡設計，符合 UI/UX 要求

### 7. **ExplainCardV2 整合**
- ✅ 添加 `conservative` prop
- ✅ 處理保守模式響應
- ✅ 渲染 `ConservativePresenter`
- ✅ 保留正常 TARS+KCE 流程

---

## 🚀 Usage

### API 呼叫

```bash
POST /api/explain
Content-Type: application/json

{
  "input": {
    "text": "(1) ... since the 1970s. (A) grew (B) has grown (C) was growing (D) grow"
  },
  "mode": "deep",
  "conservative": true
}
```

### 組件使用

```tsx
<ExplainCardV2
  inputText="Your question text"
  mode="deep"
  conservative={true}
  onModeChange={(mode) => {/* handle change */}}
/>
```

---

## 📊 Output Format Examples

### E1_VOCAB (文意字彙)

```json
{
  "type": "E1_VOCAB",
  "question_text": "(1) ... since the 1970s.",
  "answer": "B",
  "one_line_reason": "since 表示起點，用現在完成式。",
  "distractor_rejects": [
    {"option": "A", "reason": "過去式不搭配 since"},
    {"option": "C", "reason": "進行式時間線錯"},
    {"option": "D", "reason": "原形動詞錯誤"}
  ]
}
```

### E2_CLOZE (綜合測驗)

```json
{
  "type": "E2_CLOZE",
  "passage_summary": "本文描述城市咖啡文化的興起。",
  "slots": [
    {
      "slot": 1,
      "answer": "B",
      "one_line_reason": "since 1970s → 用現在完成式",
      "distractor_rejects": [
        {"option": "A", "reason": "過去式與 since 不合"},
        {"option": "C", "reason": "時態錯誤"},
        {"option": "D", "reason": "語意不通"}
      ]
    }
  ]
}
```

### E4_READING (閱讀測驗)

```json
{
  "type": "E4_READING",
  "title": "Deer Collisions in Japan",
  "questions": [
    {
      "qid": 1,
      "answer": "C",
      "one_line_reason": "第三段提到鹿習慣進入都市造成事故。",
      "evidence_sentence": "Deer have adapted to urban environments...",
      "distractor_rejects": [
        {"option": "A", "reason": "未提及"},
        {"option": "B", "reason": "與主題無關"},
        {"option": "D", "reason": "無貿易內容"}
      ]
    }
  ]
}
```

---

## ✅ Validation Rules

- ✅ JSON 必須有效且完整
- ✅ 每一格都必須有 `answer`、`one_line_reason`、`distractor_rejects`
- ✅ `distractor_rejects` 必須列出所有其他選項
- ✅ `one_line_reason` 必須≤30字
- ✅ 不得生成自由文字段落
- ✅ 不可出現 Markdown 或其他非 JSON 內容

---

## 🎨 UI Features

- ✅ 題型標籤顯示
- ✅ 信心度標籤（高/中/低）
- ✅ 逐格答案顯示（綠色高亮）
- ✅ 選項分析（所有選項）
- ✅ 證據句高亮（閱讀測驗）
- ✅ Typewriter 動畫
- ✅ 極簡設計，空氣感間距

---

## 📝 Next Steps

1. ✅ 基本功能已實現
2. ⚠️ 可選：在 ExplainCardV2 中添加模式切換按鈕（保守模式 / TARS+KCE）
3. ⚠️ 可選：優化保守模式的 prompt 以提高準確度
4. ⚠️ 可選：添加更多驗證規則確保 JSON 完整性

---

## ✨ Result

保守模式已完全實現，可以：
- ✅ 自行判斷題型（不依賴 TARS）
- ✅ 生成結構化、逐格、可驗證的 JSON 格式詳解
- ✅ 支援所有 7 種題型
- ✅ 提供完整的選項分析
- ✅ 輸出合法的 JSON 物件
- ✅ 整合到現有的 UI 流程

所有變更已推送到 Vercel，約 2-3 分鐘後可在生產環境使用。🚀

