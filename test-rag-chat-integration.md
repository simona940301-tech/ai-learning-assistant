# 🧪 RAG Chat 整合測試指南

## ✅ 開發伺服器狀態
- **狀態**: ✅ 正在運行
- **端口**: 3000
- **URL**: http://localhost:3000

## 📋 手動測試步驟

### 1. 測試頁面載入
```bash
# 瀏覽器訪問
http://localhost:3000/ask
```

**預期結果**:
- ✅ 頁面正常載入
- ✅ 顯示「上傳講義」標題
- ✅ 顯示文件上傳區域

---

### 2. 測試文件上傳流程

**步驟**:
1. 點擊或拖曳上傳 PDF 文件
2. 點擊「開始分析」按鈕
3. 等待上傳和分析完成

**預期結果**:
- ✅ 上傳進度條顯示
- ✅ 分析完成後顯示重點統整
- ✅ 顯示「向 AI 提問」按鈕

---

### 3. 測試聊天介面開啟

**步驟**:
1. 找到「向 AI 提問」按鈕
2. 點擊按鈕

**預期結果**:
- ✅ 聊天介面平滑展開（動畫效果）
- ✅ 顯示空狀態：AI 助手圖示 + 說明
- ✅ 顯示 5 個建議問題 chips
- ✅ 顯示輸入框（底部浮動設計）

**UI 檢查清單**:
- [ ] Sparkles 圖示正確顯示
- [ ] 「我是您的 AI 學習助手」文字顯示（如果有初始訊息）
- [ ] 建議問題 chips 可點擊
- [ ] 輸入框有毛玻璃效果
- [ ] 發送按鈕顯示在輸入框右側

---

### 4. 測試建議問題功能

**步驟**:
1. 點擊任一建議問題，例如「這份文件的核心觀念是什麼？」

**預期結果**:
- ✅ 問題立即顯示在聊天區域（使用者訊息，藍色，右對齊）
- ✅ AI 訊息區域出現（灰色卡片，左對齊，帶 Sparkles 圖示）
- ✅ 顯示 3 個跳動的圓點（loading 動畫）
- ✅ **打字機效果**: 文字逐字出現
- ✅ Markdown 正確渲染（粗體、列表等）
- ✅ 自動捲動到底部

**關鍵驗證點**:
```
檢查瀏覽器 Console:
- 應該看到: [useRAGChat] 📤 Sending request
- 應該看到: [useRAGChat] ✅ Streaming completed
- 不應該有錯誤
```

---

### 5. 測試手動輸入

**步驟**:
1. 在輸入框輸入自訂問題，例如「請出 3 題測驗題」
2. 按 Enter 或點擊發送按鈕

**預期結果**:
- ✅ 輸入框立即清空
- ✅ 問題顯示在聊天區域
- ✅ AI 回應正常 streaming
- ✅ Markdown 渲染正確

---

### 6. 測試錯誤處理

#### 6.1 未選擇文件時提問
**步驟**:
1. 重新整理頁面（不上傳文件）
2. 嘗試提問

**預期結果**:
- ✅ 顯示錯誤提示「請先選擇至少一個文件」
- ✅ 3 秒後錯誤消失
- ✅ 不發送請求

#### 6.2 模擬網路錯誤
**步驟**:
1. 打開瀏覽器 DevTools
2. Network tab > Throttling > Offline
3. 嘗試提問
4. 恢復網路

**預期結果**:
- ✅ 顯示錯誤訊息
- ✅ Console 顯示錯誤日誌
- ✅ 不會導致頁面崩潰

---

### 7. 測試多文件場景

**步驟**:
1. 上傳 2-3 個 PDF 文件
2. 等待分析完成
3. 點擊「向 AI 提問」
4. 提問「請統整這些文件的共同主題」

**預期結果**:
- ✅ `contextFileIds` 包含所有文件 ID
- ✅ AI 回應整合所有文件內容
- ✅ 功能正常無錯誤

---

### 8. 測試文件重新選擇

**步驟**:
1. 上傳多個文件後，使用 FileSelectionChips 取消選擇部分文件
2. 點擊「重新統整」
3. 打開聊天，提問

**預期結果**:
- ✅ `contextFileIds` 只包含選中的文件
- ✅ AI 回應僅基於選中文件

---

### 9. 測試聊天關閉/重開

**步驟**:
1. 開啟聊天，提問數個問題
2. 點擊「隱藏 AI 助手」
3. 再次點擊「向 AI 提問」

**預期結果**:
- ✅ 聊天平滑收起（動畫）
- ✅ 重新開啟後，**對話歷史保留**
- ✅ 可繼續提問

---

## 🔍 技術驗證

### Console 日誌檢查

**正常流程應該看到**:
```javascript
[useRAGChat] 📤 Sending request: {
  endpoint: '/api/rag/chat',
  messageCount: 2,  // 包含系統訊息 + 使用者訊息
  contextFiles: 1   // 或更多
}

[useRAGChat] ✅ Streaming completed

[SummaryWorkbench] Chat ready
```

**不應該看到**:
```javascript
❌ DefaultChatTransport is not a constructor
❌ TypeError: ...
❌ 403 / 500 錯誤（除了 Sentry 的 403，可忽略）
```

---

### Network Tab 檢查

**請求檢查**:
1. 打開 DevTools > Network
2. 提問後，應該看到 `/api/rag/chat` 請求
3. 點擊該請求，檢查：

```
Request Headers:
✅ Content-Type: application/json

Request Payload:
{
  "messages": [
    { "role": "user", "content": "問題內容" }
  ],
  "contextFileIds": ["doc-id-1", "doc-id-2"]
}

Response:
✅ Status: 200 OK
✅ Content-Type: text/plain; charset=utf-8
✅ X-Cache-Status: HIT (如果有 Context Cache)
✅ Body: streaming 文字（逐步載入）
```

---

### React DevTools 檢查（可選）

如果安裝了 React DevTools:
1. 找到 `RAGChatInterface` 元件
2. 檢查 Props:
   ```
   contextFileIds: ["..."]  // 應該有值
   refreshKey: "..."        // 文件 ID
   ```
3. 檢查 State (useRAGChat hook):
   ```
   messages: [...]     // 訊息陣列
   isLoading: false    // 非載入時
   error: null         // 無錯誤時
   ```

---

## ✅ 成功標準

### 必須通過的測試
- [x] 頁面正常載入
- [ ] 文件上傳成功
- [ ] 聊天介面正常開啟
- [ ] 建議問題可點擊並正常回應
- [ ] 手動輸入正常回應
- [ ] Streaming 打字機效果正常
- [ ] Markdown 渲染正確
- [ ] 錯誤處理正常
- [ ] Console 無嚴重錯誤

### UI/UX 檢查
- [ ] 動畫流暢（framer-motion）
- [ ] 自動捲動到底部
- [ ] Loading 狀態清晰
- [ ] 輸入框設計美觀（毛玻璃效果）
- [ ] 訊息氣泡樣式正確

---

## 🐛 常見問題排查

### 問題 1: 聊天不顯示
**檢查**:
- [ ] `state.uploadedDocIds.length > 0` ?
- [ ] `showChat` state 是否為 true?
- [ ] Console 是否有錯誤?

### 問題 2: 發送後無回應
**檢查**:
- [ ] Network tab 有 `/api/rag/chat` 請求嗎?
- [ ] 請求狀態是 200 還是錯誤?
- [ ] `contextFileIds` 是否為空?

### 問題 3: 無 Streaming 效果
**檢查**:
- [ ] 後端是否返回 `Content-Type: text/plain`?
- [ ] Response body 是否為 streaming?
- [ ] `ReadableStream` 是否正確處理?

### 問題 4: Markdown 不渲染
**檢查**:
- [ ] `RAGMarkdownRenderer` 元件是否正常?
- [ ] `react-markdown` 是否安裝?
- [ ] AI 回應內容是否包含 Markdown 語法?

---

## 📊 測試報告模板

測試完成後，請填寫：

```markdown
## 測試結果

- 測試日期: ____
- 測試環境: 本地開發環境
- Next.js 版本: 14.1.0
- Node.js 版本: ____

### 功能測試
- [ ] 文件上傳: ✅/❌
- [ ] 聊天開啟: ✅/❌
- [ ] 建議問題: ✅/❌
- [ ] 手動輸入: ✅/❌
- [ ] Streaming: ✅/❌
- [ ] 錯誤處理: ✅/❌

### 發現的問題
1. (如有)

### 截圖
(可選)
```

---

## 🚀 下一步

測試通過後:
1. [ ] 提交代碼到 Git
2. [ ] 部署到 Vercel 測試環境
3. [ ] 進行生產環境驗證

---

*測試愉快！如有任何問題，請檢查 Console 日誌。*
