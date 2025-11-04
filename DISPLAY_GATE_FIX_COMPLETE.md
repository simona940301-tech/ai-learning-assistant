# E4 Reading Explanation Display Gate Fix - Complete

## 修復範圍（Scope）

✅ **只修改顯示邏輯**，不動 API、Router、Parser、串流與樣式架構
✅ **保留先前修正**：
- E4 validator 不要求 steps
- commonMistake 鍵名兼容（camelCase + snake_case）
- 移除重複答案框

## 實施的修改

### 1. 放寬顯示門檻 - 在 Presenter 計算 VM flags

**文件**: `apps/web/lib/mapper/explain-presenter.ts`

**新增接口定義** (lines 149-151):
```typescript
export interface ReadingQuestionVM {
  // ... existing fields
  // Flags for UI display logic
  hasReasoning?: boolean // Whether reasoning field has meaningful content
  hasCounterpoints?: boolean // Whether counterpoints has at least one valid entry
  // ...
}
```

**計算邏輯** (lines 1120-1142):
```typescript
// Presenter Boundary: Log after extraction/mapping
const hasReasoning = !!explanation.reasoning && explanation.reasoning.length > 0
let finalCounterpoints = explanation.counterpoints

// Remove correct answer from counterpoints if present
if (finalCounterpoints && answerLetter) {
  const corrected: Record<string, string> = {}
  Object.entries(finalCounterpoints).forEach(([key, value]) => {
    if (key !== answerLetter) {
      corrected[key] = value
    }
  })
  if (Object.keys(corrected).length > 0) {
    finalCounterpoints = corrected
  } else {
    finalCounterpoints = undefined
  }
}

const hasCounterpoints = !!finalCounterpoints && Object.keys(finalCounterpoints).length > 0
const hasCommonMistake = !!explanation.commonMistake && explanation.commonMistake.length > 0
```

**返回 flags** (lines 1164-1165):
```typescript
return {
  // ... other fields
  // Display flags
  hasReasoning,
  hasCounterpoints,
  // ...
}
```

**顯示條件**：任一 flag 為 `true` 就應顯示詳解區

---

### 2. ReadingExplain.tsx 渲染邏輯改為「有什麼顯示什麼」

**文件**: `apps/web/components/solve/explain/ReadingExplain.tsx`

**邊界偵錯日誌** (lines 165-175):
```typescript
// Gate logging for debugging
if (process.env.NEXT_PUBLIC_DEBUG_EXPLAIN === '1' || process.env.NODE_ENV !== 'production') {
  console.debug('[ReadingExplain] gate', {
    id: question.qid,
    hasReasoning: question.hasReasoning,
    hasCounterpoints: question.hasCounterpoints,
    reasoningPreview: (question.reasoning ?? '').slice(0, 40),
    counterKeys: Object.keys(question.counterpoints ?? {}),
    commonMistakePreview: (commonMistake ?? '').slice(0, 40),
  })
}
```

**獨立渲染判斷** (lines 200-235):
```typescript
{/* 📖 為什麼選這個？ - Additive reasoning card */}
{question.reasoning && (
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-3">
      <div className="mb-1 text-sm font-medium text-muted-foreground">📖 為什麼選這個？</div>
      <p className="text-sm leading-relaxed text-foreground">{question.reasoning}</p>
    </CardContent>
  </Card>
)}

{/* 🔍 為什麼其他不對？ - Additive counterpoints card */}
{question.counterpoints && Object.keys(question.counterpoints).length > 0 && (
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-3">
      <div className="mb-2 text-sm font-medium text-muted-foreground">🔍 為什麼其他不對？</div>
      <ul className="space-y-1.5 text-sm leading-relaxed">
        {Object.entries(question.counterpoints).map(([optKey, reason]) => (
          <li key={optKey} className="flex gap-2">
            <span className="font-semibold text-orange-600 dark:text-orange-400">{optKey}</span>
            <span className="flex-1 text-muted-foreground">— {reason}</span>
          </li>
        ))}
      </ul>
    </CardContent>
  </Card>
)}

{/* ⚠️ 常見誤區 - Kept for backward compat, show from meta if exists */}
{commonMistake && (
  <Card className="rounded-2xl shadow-sm">
    <CardContent className="p-3">
      <div className="mb-1 text-sm font-medium text-muted-foreground">⚠️ 常見誤區</div>
      <p className="text-sm leading-relaxed text-amber-900 dark:text-amber-200">{commonMistake}</p>
    </CardContent>
  </Card>
)}
```

**特點**:
- ✅ 每個卡片獨立判斷是否顯示
- ✅ 不依賴其他字段的存在
- ✅ 刪除任何依賴 `steps.length`、`aiAnswerKeys` 或 `hasExplanation && hasReasoning` 的條件

---

### 3. 避免被版面遮住

**底部 padding** (line 127):
```typescript
return (
  <div className="space-y-3 leading-relaxed pb-24">
```

**目的**：
- 避免最後一張詳解卡被底部 tabbar 壓住
- 確保用戶可以完整看到所有內容

---

## 驗收檢查點

### ✅ Console 日誌驗證
```
[ReadingExplain] gate {
  id: 'Q1',
  hasReasoning: true,
  hasCounterpoints: true,
  reasoningPreview: '文章主要探討工業革命如何徹底改變社會結構...',
  counterKeys: ['A', 'C', 'D'],
  commonMistakePreview: '學生常誤選A，因為文中確實提到負面影響...'
}
```

### ✅ UI 渲染驗證
至少顯示以下任一卡片：
- 📖 為什麼選這個？（reasoning）
- 🔍 為什麼其他不對？（counterpoints）
- ⚠️ 常見誤區（commonMistake）
- 📖 證據說明（evidence）

### ✅ 無遺留判斷
搜尋以下關鍵字應無結果：
- `steps.length`
- `hasExplanation && hasReasoning`
- `aiAnswerKeys`

### ✅ counterpoints 鍵名標準化
- Presenter 中已在 line 541 標準化為大寫 A/B/C/D
- UI 中可正確渲染 `{optKey}` 為 A/B/C/D

### ✅ 底部不被遮擋
- 添加 `pb-24` 確保最後一張卡可見
- 手機版測試：滾動到底部，最後一張卡完整顯示

---

## 自查 4 點 Checklist

### 1. ✅ VM 內是否真的有內容
**驗證方法**：
```typescript
console.log(question.reasoning, question.counterpoints, question.meta.commonMistake)
```
- 有值 → UI 條件可能擋住
- 沒值 → Presenter 還沒映射好

### 2. ✅ 是否還有遺留的 steps 判斷
**搜尋**：
```bash
grep -n "steps\.length\|hasExplanation.*hasReasoning\|aiAnswerKeys" components/solve/explain/ReadingExplain.tsx
```
**結果**：無匹配 ✅

### 3. ✅ 容器是否被遮住
**修復**：添加 `pb-24` 避免底部 tabbar 蓋住最後一張卡

### 4. ✅ counterpoints 的鍵名
**標準化**：Presenter line 541 已將所有鍵名轉為大寫 A/B/C/D
```typescript
const cleanedKey = String(key).toUpperCase().trim()
```

---

## 完整修改列表

### apps/web/lib/mapper/explain-presenter.ts
1. **Lines 149-151**: 添加 `hasReasoning` 和 `hasCounterpoints` flags 到接口
2. **Lines 1120-1142**: 計算 flags 並從 counterpoints 移除正確答案
3. **Lines 1164-1165**: 返回 flags 到 VM

### apps/web/components/solve/explain/ReadingExplain.tsx
1. **Line 127**: 添加 `pb-24` 避免底部遮擋
2. **Lines 165-175**: 添加邊界偵錯日誌（dev 模式）
3. **Lines 200-235**: 確認每個詳解卡獨立渲染（已是正確狀態）

---

## 測試方法

### 開發環境測試
```bash
# 開啟 DEBUG 模式
export DEBUG=1
export NEXT_PUBLIC_DEBUG_EXPLAIN=1

# 啟動開發服務器
pnpm dev:web
```

### 瀏覽器 Console 檢查
1. 打開 /solve 或 /ask 頁面
2. 提交一個閱讀理解問題
3. 查看 Console：
   - 應該看到 `[ReadingExplain] gate` 日誌
   - `hasReasoning` 或 `hasCounterpoints` 至少一個為 `true`
   - `reasoningPreview` 和 `counterKeys` 有實際內容

### UI 檢查
1. 詳解卡應該顯示（至少一張）
2. 正確答案在選項中高亮（綠色背景）
3. 不應該有「✅ 答案：D」的重複框
4. 滾動到底部，最後一張卡不被遮擋

---

## 狀態

🎉 **所有修改完成**

✅ Presenter 計算並返回顯示 flags
✅ UI 採用「有什麼顯示什麼」邏輯
✅ 添加邊界偵錯日誌（可控開關）
✅ 底部 padding 避免遮擋
✅ counterpoints 鍵名已標準化為大寫
✅ 無遺留 steps 或其他過時判斷

現在詳解卡應該能正確顯示在 UI 上！
