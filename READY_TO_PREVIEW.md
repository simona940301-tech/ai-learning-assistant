# ✅ 準備好預覽了！

## 🚀 Dev Server 狀態

**Port:** 3000 ✅
**狀態:** Running
**URL:** http://localhost:3000

---

## 🧪 立即測試

### 1. 打開瀏覽器
```
http://localhost:3000/ask
```

### 2. 在瀏覽器 Console 測試 API
打開 Chrome DevTools (F12 或 Cmd+Option+I)，執行：

```javascript
await fetch('/api/ai/route-solver', {
  method: 'POST',
  headers: {'Content-Type':'application/json'},
  body: JSON.stringify({
    questionText: "There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden"
  })
}).then(r=>r.json()).then(j => {
  console.log('RAW:', j);
  const card = j?.explanation?.card ?? j?.card ?? j;
  console.log('kind:', card?.kind, 'options.len:', card?.options?.length, 'vocab.len:', card?.vocab?.length);
});
```

**預期輸出：**
```
RAW: { subject: "english", explanation: { card: {...} }, ... }
kind: E1 options.len: 4 vocab.len: 5
```

### 3. 在 UI 測試
在輸入框貼上：
```
There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden
```

**預期行為：**
1. 提交後出現 **StreamingExplainPlaceholder**
   - 逐步狀態流動畫
   - 打字機閃爍效果

2. 完成後顯示 **全新 ExplainCard**
   - ✅ 無內部 chips
   - ✅ 題幹顯示
   - ✅ 📋 選項分析（每行 inline 顯示理由）
   - ✅ 🟦 正確答案（藍色區塊）
   - ✅ 💡 學習要點（便條紙風格，如果有資料）
   - ✅ ⚠️ 解題線索（紅框，如果有資料）
   - ✅ 📚 重點詞彙（如果有資料）
   - ✅ 🔄 相似題（底部，如果有資料）

---

## 📋 檢查清單

### Console Logs 應該顯示：
```
✅ [AnySubjectSolver] request.start { reqId: '...', question: '...' }
✅ [AnySubjectSolver] RAW API Response: { hasExplanation: true, hasCard: true }
✅ [AnySubjectSolver] ✅ Card normalized: { status: "kind:E1 options:4 vocab:5 ..." }
✅ [ExplainCard] render { hasCard: true, kind: "E1", optionsCount: 4, vocabCount: 5 }
✅ ✅ Solve preview updated
```

### UI 檢查：
- [ ] Loading 時顯示 streaming placeholder（不是舊的旋轉圖示）
- [ ] 卡片內沒有「詳解 / 相似題」chips
- [ ] 選項分析每行格式：`(A) word (中文) — 理由 ✗/✓`
- [ ] 正確答案有藍色背景
- [ ] 分隔線清晰但不突兀
- [ ] 行動端（375px）文字可讀、無橫向滾動

---

## 🎨 新 UI 預覽

### 深色主題（當前）
- 卡片底：`#1E1E1E`
- 邊框：`#2C2C2C`
- 正確答案區：`#263238` (藍灰色)
- 學習要點：`#3A3427` (暖黃色便條紙)
- 解題線索：`#3C2325` (暗紅色警告)

### 選項分析範例
```
📋 選項分析

(A) access (進入；使用權) — 詞義錯誤（與「受傷」語境無關） ✗
(B) supply (供應) — 語意不符（情境為「事件」，非「資源」） ✗
(C) attack (攻擊) — 正確（符合「恐怖事件」描述） ✓
(D) burden (負擔) — 詞義錯誤（不具動作性） ✗
```

---

## 🐛 已知問題

### ⚠️ 選項解析問題（不影響 UI）
如果 Console 顯示：
```
[parseOptionsFromText] No options found in text
[route-solver] No options found for English question, falling back to hybrid solve
```

**原因：** API 收到了全形括號 `（Ａ）` 而不是半形 `(A)`

**解決方法：** 確保輸入時使用半形括號

**測試用問題（正確格式）：**
```
There are reports coming in that a number of people have been injured in a terrorist ____. (A) access (B) supply (C) attack (D) burden
```

---

## 🔧 如果遇到問題

### 1. 清除瀏覽器緩存
```
Chrome DevTools → Application → Storage → Clear site data
然後 Cmd + Shift + R (硬刷新)
```

### 2. 檢查 Console Errors
如果有紅色錯誤，複製完整訊息

### 3. 檢查 Network Tab
- 找到 `/api/ai/route-solver` 請求
- 查看 Response 的 JSON
- 確認 `explanation.card.kind` 的值

### 4. 重啟 Dev Server
```bash
lsof -ti:3000 | xargs kill -9
cd apps/web
rm -rf .next
pnpm dev
```

---

## 📸 提供反饋時請包含

1. **截圖**
   - 完整的 UI（包含 Console）
   - 特別標註問題區域

2. **Console Logs**
   - 所有 `[AnySubjectSolver]` logs
   - 所有 `[ExplainCard]` logs
   - 任何錯誤訊息

3. **Network Response**
   - `/api/ai/route-solver` 的 Response JSON
   - 特別是 `explanation.card` 的內容

---

## ✨ 新功能總結

### 已實現
✅ StreamingExplainPlaceholder（ChatGPT 風格）
✅ 極簡 ExplainCard（無內部 chips）
✅ 結構化色彩分區
✅ 行動端友好（inline 理由）
✅ Normalizer 系統（資料一致性）
✅ 完整 TypeScript 類型安全

### 待完善
⏳ extractTips 函數（IPA/collocations/synonyms）
⏳ 相似題導航整合
⏳ 淺色主題切換
⏳ 英文原句高亮顯示

---

**🎉 現在可以開始測試了！打開 http://localhost:3000/ask**
