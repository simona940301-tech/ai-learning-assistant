# 🚨 Critical Streaming Debug

## 問題現象

Console 顯示：
```
✅ Analysis completed
```

**但沒有**：
```
📦 Received chunk  ← 缺失！
```

**結論**：Stream 根本沒有被解析，所有數據都被跳過。

---

## 新增 Debug Logging

### 現在會顯示

1. **Stream 開始**
```
📡 Starting stream read...
```

2. **每個 chunk**
```
📥 Raw chunk received: { length: 1234, preview: "0:{\"subject\"..." }
```

3. **處理行數**
```
📋 Processing lines: 5
```

4. **每行解析**
```
🔍 Parsing line: 0:{"subject":"國文"}
✅ Matched Vercel AI format
```
或
```
❌ No format match for line
```

5. **Stream 結束**
```
🏁 Stream ended, total chunks: 15
```

---

## 預期 Console 輸出

### 正常情況
```
[ProgressiveAnalysisCard] 📡 Starting stream read...
[ProgressiveAnalysisCard] 📥 Raw chunk received: { length: 234, preview: "0:{\"subject\":..." }
[ProgressiveAnalysisCard] 📋 Processing lines: 3
[ProgressiveAnalysisCard] 🔍 Parsing line: 0:{"subject":"國文"}
[ProgressiveAnalysisCard] ✅ Matched Vercel AI format
[ProgressiveAnalysisCard] 📦 Received chunk: { hasSubject: true, ... }
[ProgressiveAnalysisCard] 📥 Raw chunk received: { length: 456, preview: "0:{\"topics\":..." }
[ProgressiveAnalysisCard] 📋 Processing lines: 2
[ProgressiveAnalysisCard] 🔍 Parsing line: 0:{"topics":["國學常識"]}
[ProgressiveAnalysisCard] ✅ Matched Vercel AI format
[ProgressiveAnalysisCard] 📦 Received chunk: { hasTopics: true, ... }
...
[ProgressiveAnalysisCard] 🏁 Stream ended, total chunks: 15
[ProgressiveAnalysisCard] ✅ Analysis completed
```

### 異常情況 A: 格式不匹配
```
[ProgressiveAnalysisCard] 📡 Starting stream read...
[ProgressiveAnalysisCard] 📥 Raw chunk received: { length: 234, preview: "..." }
[ProgressiveAnalysisCard] 📋 Processing lines: 3
[ProgressiveAnalysisCard] 🔍 Parsing line: some weird format
[ProgressiveAnalysisCard] ❌ No format match for line  ← 問題！
[ProgressiveAnalysisCard] 🏁 Stream ended, total chunks: 0  ← 沒有成功解析！
[ProgressiveAnalysisCard] ✅ Analysis completed
```

### 異常情況 B: 沒有收到 stream
```
[ProgressiveAnalysisCard] 📡 Starting stream read...
[ProgressiveAnalysisCard] 🏁 Stream ended, total chunks: 0  ← 立即結束！
[ProgressiveAnalysisCard] ✅ Analysis completed
```

---

## 可能的問題

### 1. API 返回空 stream
**檢查**：
- `/api/rag/analyze-object` 是否正確調用 `generateStreamedAnalysis`
- `streamObject` 是否正確配置
- Gemini API 是否正常返回

### 2. Response body 為空
**檢查**：
- `response.body` 是否為 null
- `reader` 是否成功創建

### 3. 格式完全不匹配
**檢查**：
- Raw chunk 的實際內容
- 是否有其他未知格式

---

## 測試步驟

### Step 1: 刷新頁面並重新上傳
觀察 console 是否出現：
```
📡 Starting stream read...
📥 Raw chunk received: ...
```

### Step 2: 檢查 Raw chunk
查看 `preview` 的內容，確定實際格式

### Step 3: 對比格式
- 如果是 `0:{...}` → Vercel AI format ✅
- 如果是 `data: {...}` → SSE format ✅
- 如果都不是 → 需要更新解析邏輯

---

## 快速修復檢查表

- [ ] Console 出現 `📡 Starting stream read...`
- [ ] Console 出現 `📥 Raw chunk received`
- [ ] Console 出現 `✅ Matched Vercel AI format` 或 `✅ Matched SSE format`
- [ ] Console 出現 `📦 Received chunk`
- [ ] Console 出現 `🏁 Stream ended, total chunks: > 0`
- [ ] UI 顯示分析結果

如果任何一項失敗，對應的 log 會指出問題所在。














