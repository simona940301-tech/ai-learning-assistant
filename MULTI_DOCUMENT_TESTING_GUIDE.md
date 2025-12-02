# 多文件重點統整測試指南

## 當前狀態分析

從你的 console logs 來看:
```
documentId: 1e09e2b6-01e7-4b82-9622-1fa2456e6d40
relatedDocIds: []  ❌ 空的
selectedDocIds: ['1e09e2b6-01e7-4b82-9622-1fa2456e6d40']  只有1個文件
```

**問題:** 你只上傳了 **1個文件**,所以系統正常運作,沒有多文件統整的功能。

## 如何測試多文件統整

### 方法 1: 上傳多個文件 (推薦)

1. **清除當前分析**
   - 點擊頁面底部的「分析新文件」按鈕
   - 這會重置所有狀態

2. **上傳 3 個同科目的 PDF**
   - 例如: 國文2.pdf, 國學常識.pdf, 國文文法.pdf
   - 或任何其他科目的多個文件

3. **點擊「開始分析」**
   - 系統會自動上傳並分類這3個文件
   - 你應該看到:
     ```
     當前上傳: 3 個文件 | 正在分析: 3 個文件 | 已選擇: 3 個文件
     ```

4. **觀察分析結果**
   - Console 應該顯示:
     ```
     relatedDocIds: [id2, id3]  ✅ 有其他文件
     selectedDocIds: [id1, id2, id3]  ✅ 所有文件
     ```
   - 考題應該顯示來源標籤

### 方法 2: 使用歷史文件

如果你之前上傳過文件(24小時內):

1. **查看 FileSelectionChips**
   - 應該會看到當前上傳的文件 (亮色)
   - 以及歷史文件 (暗色)

2. **選擇多個文件**
   - 點擊歷史文件的 chip 來選擇
   - 取消選擇某些文件

3. **觀察確認 Toast**
   - 當選擇改變時,應該出現藍色 Toast:
     ```
     已選擇 X 個文件
     點擊「重新統整」以分析 X 個文件 (當前分析 Y 個)
     [重新統整按鈕]
     ```

4. **點擊重新統整**
   - 系統會根據新選擇重新分析

## Debug 信息說明

在分析頁面頂部,你現在會看到:
```
當前上傳: X 個文件 | 正在分析: Y 個文件 | 已選擇: Z 個文件
```

- **當前上傳** = 本次上傳的文件數量
- **正在分析** = 實際正在分析的文件數量 (pendingAnalysisIds)
- **已選擇** = 用戶選擇的文件數量 (selectedFileIds)

### 正常情況:
- 剛上傳3個文件: `3 | 3 | 3`
- 取消選擇1個: `3 | 3 | 2` (Toast 會出現)
- 點擊重新統整: `3 | 2 | 2` (重新分析)

## Console Logs 說明

### FileSelectionChips Logs
```javascript
[FileSelectionChips] Fetched documents: {...}
[FileSelectionChips] Total documents: 5  // 24小時內所有文件
[FileSelectionChips] Current uploads: 3   // 本次上傳
[FileSelectionChips] History documents: 2 // 歷史文件
```

### SummaryWorkbench Logs
```javascript
[SummaryWorkbench] File selection changed: [id1, id2, id3]
[SummaryWorkbench] Current pendingAnalysisIds: [id1, id2, id3]
[SummaryWorkbench] Starting re-analysis with: [id1, id2]  // 用戶改變選擇
```

### ProgressiveAnalysisCard Logs
```javascript
[ProgressiveAnalysisCard] 🚀 Starting analysis...
  documentId: id1
  relatedDocIds: [id2, id3]  // ✅ 應該有值
  selectedDocIds: [id1, id2, id3]  // ✅ 所有選中的
  subject: 國文
```

## 常見問題

### Q1: 為什麼看不到歷史文件?
**A:** FileSelectionChips 只顯示 24 小時內上傳的文件。如果沒有歷史文件,只會顯示當前上傳的文件。

### Q2: Toast 沒有出現?
**A:** Toast 只在以下情況出現:
- 選擇的文件數量改變
- 選擇的文件 ID 改變
檢查 console 是否有 "File selection changed" log

### Q3: relatedDocIds 總是空的?
**A:** 檢查:
- 是否真的上傳了多個文件? (看 Debug 信息)
- Console 是否顯示 `selectedDocIds` 有多個 ID?
- 是否點擊了「重新統整」按鈕?

### Q4: 考題沒有來源標籤?
**A:** 這是正常的,因為:
- AI 需要在生成考題時填入 `sourceDocId`
- 目前的 prompt 可能還沒有明確要求標記來源
- 這是下一步優化的內容 (見下方)

## 下一步: Prompt 優化

要讓考題顯示來源,需要修改 AI prompt:

### 位置
[apps/web/lib/services/elite-rag-analyzer.ts](apps/web/lib/services/elite-rag-analyzer.ts)

### 需要添加的指示
在生成考題的 prompt 中添加:
```
對於每道考題,請在 sourceDocId 欄位中填入該題主要基於的文件 ID。

可用的文件 IDs:
- {documentId}: {filename1}
- {relatedDocId1}: {filename2}
- {relatedDocId2}: {filename3}

請確保每道題都標記來源,這樣學生可以知道該題來自哪個文件。
```

## 完整測試流程

### 準備測試文件
準備 3 個同科目的 PDF 文件,例如:
1. 國文-字音字形.pdf
2. 國文-文意理解.pdf
3. 國文-國學常識.pdf

### 測試步驟

#### Step 1: 單文件測試 (基線)
1. 上傳 1 個 PDF
2. 點擊「開始分析」
3. 確認分析正常完成
4. Debug 應顯示: `1 | 1 | 1`
5. Console 應顯示: `relatedDocIds: []`

#### Step 2: 多文件測試
1. 點擊「分析新文件」重置
2. 上傳 3 個 PDF
3. 點擊「開始分析」
4. Debug 應顯示: `3 | 3 | 3`
5. Console 應顯示: `relatedDocIds: [id2, id3]`
6. 確認考題數量增加 (整合了3個文件的內容)

#### Step 3: 重新選擇測試
1. 取消選擇 1 個文件 chip
2. 觀察 Toast 出現
3. Debug 應顯示: `3 | 3 | 2`
4. 點擊「重新統整」按鈕
5. Debug 應顯示: `3 | 2 | 2`
6. Console 應顯示: `relatedDocIds: [id2]` (只有1個相關文件)
7. 確認重新分析完成

#### Step 4: 來源標籤測試
1. 檢查每道考題
2. 如果看到「來源: xxx.pdf」標籤 = ✅ 成功
3. 如果沒看到 = AI 沒有填入 sourceDocId (需要優化 prompt)

## 預期結果

### 單文件分析
```
📄 國文-字音字形.pdf

核心摘要:
- 字音字形...

考題預測:
題目 1 [中等]
...答案: A

題目 2 [困難]
...答案: C
```

### 多文件分析
```
📄 國文-字音字形.pdf
📄 國文-文意理解.pdf
📄 國文-國學常識.pdf

核心摘要:
- 字音字形...
- 文意理解...
- 國學常識...

考題預測:
題目 1 [中等] [來源: 國文-字音字形.pdf]
...答案: A

題目 2 [困難] [來源: 國文-文意理解.pdf]
...答案: C

題目 3 [簡單] [來源: 國文-國學常識.pdf]
...答案: B
```

## 故障排除

### 如果 FileSelectionChips 不顯示
1. 檢查 Network tab 是否有 `/api/rag/upload?hours=24` 請求
2. 檢查回應是否包含 documents 數組
3. 檢查 Console 是否有錯誤

### 如果 Toast 不出現
1. 檢查是否真的改變了選擇
2. 檢查 Console 是否有 "File selection changed" log
3. 檢查 `selectionChanged` 條件是否滿足

### 如果重新分析沒有觸發
1. 檢查是否點擊了「重新統整」按鈕
2. 檢查 Console 是否有 "Starting re-analysis" log
3. 檢查 `pendingAnalysisIds` 是否更新
4. 檢查 component key 是否改變 (應該觸發重新掛載)

## 技術細節

### Key 的作用
```tsx
<ProgressiveAnalysisCard
    key={pendingAnalysisIds.join(',')}  // "id1,id2,id3"
    // 當 pendingAnalysisIds 改變時, key 改變
    // React 會卸載舊組件,掛載新組件
    // 這會觸發 useEffect 重新執行分析
/>
```

### State 流程
```
用戶改變選擇
↓
setSelectedFileIds([id1, id2])  // 更新選擇
↓
selectionChanged = true  // 檢測到改變
↓
setShowConfirmToast(true)  // 顯示 Toast
↓
用戶點擊「重新統整」
↓
setPendingAnalysisIds([id1, id2])  // 更新分析列表
↓
key 改變: "id1,id2,id3" → "id1,id2"
↓
ProgressiveAnalysisCard 重新掛載
↓
useEffect 觸發分析
```
