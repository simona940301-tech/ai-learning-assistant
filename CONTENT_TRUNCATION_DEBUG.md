# 內容截斷問題調查報告

## 🐛 問題描述

**用戶反饋**：「存到書包的內容會被截斷」

**觀察現象**：
- 標題顯示正確：「核心摘要」
- 內容只顯示：「本文件探討行」（應為完整重點統整內容）
- 預期：完整的重點統整內容應該被儲存

## 🔍 調查策略

已在以下關鍵位置添加詳細 debug logging，用於追蹤內容從生成到儲存的完整流程：

### 1. 內容捕獲階段（ProgressiveAnalysisCard → SummaryWorkbench）

**位置**：[SummaryWorkbench.tsx:913-932](apps/web/components/ask/SummaryWorkbench.tsx#L913-L932)

```typescript
onAnalysisComplete={(analysis) => {
    console.log('[SummaryWorkbench] ✅ Analysis complete:', analysis)
    console.log('[DEBUG] 📊 structuredNotes length:', analysis.structuredNotes?.length)
    console.log('[DEBUG] 📊 structuredNotes preview:', analysis.structuredNotes?.substring(0, 200))
    console.log('[DEBUG] 📊 quickSummary length:', analysis.quickSummary?.length)
    console.log('[DEBUG] 📊 quickSummary preview:', analysis.quickSummary?.substring(0, 200))

    const capturedContent = analysis.structuredNotes || analysis.quickSummary || ''
    console.log('[DEBUG] 💾 Final captured content length:', capturedContent.length)
    console.log('[DEBUG] 💾 Final captured content preview:', capturedContent.substring(0, 300))
    console.log('[DEBUG] 💾 Full captured content:', capturedContent)

    setAnalysisContent(capturedContent)
    // ...
}}
```

**檢查點**：
- ✅ `analysis.structuredNotes` 是否包含完整內容？
- ✅ `analysis.quickSummary` 是否包含完整內容？
- ✅ `capturedContent` 長度是否正確？

### 2. 點擊儲存按鈕階段（底部 CTA）

**位置**：[SummaryWorkbench.tsx:1003-1009](apps/web/components/ask/SummaryWorkbench.tsx#L1003-L1009)

```typescript
onClick={() => {
    console.log('[Bottom CTA] 🔘 Save button clicked')
    console.log('[Bottom CTA] 📊 Current analysisContent length:', analysisContent.length)
    console.log('[Bottom CTA] 📊 Current analysisContent preview:', analysisContent.substring(0, 300))
    console.log('[Bottom CTA] 📊 Full analysisContent:', analysisContent)
    setShowSaveDialog(true)
}}
```

**檢查點**：
- ✅ 點擊「存到書包」時，`analysisContent` 狀態是否仍保持完整？
- ✅ 狀態是否在某個時間點被意外重置？

### 3. 對話框開啟階段（SummarySaveDialog）

**位置**：[SummarySaveDialog.tsx:106-117](apps/web/components/ask/SummarySaveDialog.tsx#L106-L117)

```typescript
useEffect(() => {
    console.log('[SummarySaveDialog] 🔍 Dialog opened:', open)
    console.log('[SummarySaveDialog] 📄 summaryContent length:', summaryContent?.length)
    console.log('[SummarySaveDialog] 📄 summaryContent preview:', summaryContent?.substring(0, 300))
    console.log('[SummarySaveDialog] 📄 Full summaryContent:', summaryContent)

    if (open && summaryContent) {
        const defaultTitle = generateDefaultTitle(summaryContent)
        console.log('[SummarySaveDialog] 📌 Generated title:', defaultTitle)
        setTitle(defaultTitle)
    }
}, [open, summaryContent])
```

**檢查點**：
- ✅ `summaryContent` prop 是否完整傳遞到對話框？
- ✅ `generateDefaultTitle()` 是否意外截斷內容？（理論上只處理標題）

### 4. API 請求階段（handleSaveToBackpack）

**位置**：[SummaryWorkbench.tsx:574-602](apps/web/components/ask/SummaryWorkbench.tsx#L574-L602)

```typescript
const handleSaveToBackpack = async (saveData: SaveData) => {
    console.log('[handleSaveToBackpack] 🚀 Starting save process')
    console.log('[handleSaveToBackpack] 📦 SaveData received:', {
        title: saveData.title,
        subject: saveData.subject,
        contentLength: saveData.content.length,
        contentPreview: saveData.content.substring(0, 300),
        includeConversation: saveData.includeConversation,
        conversationCount: saveData.conversationHistory?.length || 0
    })
    console.log('[handleSaveToBackpack] 📄 Full content:', saveData.content)

    const payload = {
        user_id: 'auto',
        title: saveData.title,
        subject: saveData.subject,
        content: saveData.content,
        include_conversation: saveData.includeConversation,
        conversation_history: saveData.conversationHistory,
    }
    console.log('[handleSaveToBackpack] 📡 API Payload:', payload)
    // ... fetch request
}
```

**檢查點**：
- ✅ `saveData.content` 在 onConfirm 回調中是否完整？
- ✅ API payload 是否包含完整內容？

## 🧪 測試步驟

### 1. 啟動開發伺服器

```bash
cd /Users/simonac/Desktop/moonshot-idea
pnpm --filter web dev
```

### 2. 開啟瀏覽器開發者工具

- 打開 Console 面板
- 確保顯示所有日誌等級（Info, Debug, Log）

### 3. 完整測試流程

1. **上傳文件並生成重點統整**
   - 前往 `/ask` 頁面
   - 上傳 PDF/圖片/TXT 文件
   - 點擊「開始分析」
   - 等待 AI 生成重點統整

2. **觀察內容捕獲日誌**
   - 在 Console 中查找：
     ```
     [SummaryWorkbench] ✅ Analysis complete
     [DEBUG] 📊 structuredNotes length: XXX
     [DEBUG] 📊 structuredNotes preview: ...
     [DEBUG] 💾 Final captured content length: XXX
     [DEBUG] 💾 Full captured content: ...
     ```
   - **記錄**：`capturedContent` 的長度和內容

3. **點擊「存到書包」按鈕**
   - 滾動到頁面底部
   - 點擊「存到書包」按鈕
   - 觀察日誌：
     ```
     [Bottom CTA] 🔘 Save button clicked
     [Bottom CTA] 📊 Current analysisContent length: XXX
     [Bottom CTA] 📊 Full analysisContent: ...
     ```
   - **比對**：長度是否與步驟 2 一致？

4. **觀察對話框開啟日誌**
   - 對話框應該彈出
   - 觀察日誌：
     ```
     [SummarySaveDialog] 🔍 Dialog opened: true
     [SummarySaveDialog] 📄 summaryContent length: XXX
     [SummarySaveDialog] 📄 Full summaryContent: ...
     [SummarySaveDialog] 📌 Generated title: ...
     ```
   - **比對**：長度是否與步驟 3 一致？

5. **編輯標題並確認儲存**
   - （可選）編輯標題
   - 選擇科目
   - 點擊「確認存入」
   - 觀察日誌：
     ```
     [handleSaveToBackpack] 🚀 Starting save process
     [handleSaveToBackpack] 📦 SaveData received:
       contentLength: XXX
       contentPreview: ...
     [handleSaveToBackpack] 📄 Full content: ...
     [handleSaveToBackpack] 📡 API Payload: {...}
     ```
   - **比對**：`saveData.content` 長度是否與步驟 4 一致？

6. **驗證書包中的內容**
   - 前往書包頁面（`/backpack`）
   - 找到剛儲存的筆記
   - 打開筆記查看完整內容
   - **確認**：內容是否完整？

## 📊 問題定位矩陣

根據上述日誌，可以快速定位問題發生位置：

| 步驟 | 內容完整 | 內容截斷 | 問題位置 |
|------|---------|---------|---------|
| 步驟 2 | ❌ | ✅ | **ProgressiveAnalysisCard 生成問題** |
| 步驟 3 | ✅ 步驟 2<br>❌ 步驟 3 | ✅ | **React State 狀態管理問題** |
| 步驟 4 | ✅ 步驟 3<br>❌ 步驟 4 | ✅ | **Props 傳遞問題** |
| 步驟 5 | ✅ 步驟 4<br>❌ 步驟 5 | ✅ | **Dialog onConfirm 回調問題** |
| 步驟 6 | ✅ 步驟 5<br>❌ 步驟 6 | ✅ | **API 或資料庫儲存問題** |

## 🔧 可能的根本原因

### 假設 1: `generateDefaultTitle()` 意外修改內容

**可能性**：低 ❌

**原因**：`generateDefaultTitle()` 只處理標題生成，使用 `substring()` 方法不會修改原始字串

```typescript
function generateDefaultTitle(summaryContent: string): string {
    const lines = summaryContent.split('\n').filter(line => line.trim())
    const heading = lines.find(line => line.startsWith('#'))
    if (heading) {
        return heading.replace(/^#+\s*/, '').trim().substring(0, 50)
    }
    const firstLine = lines[0] || summaryContent
    return firstLine.trim().substring(0, 50) + (firstLine.length > 50 ? '...' : '')
}
```

### 假設 2: `analysis.structuredNotes` 本身就不完整

**可能性**：中 ⚠️

**調查**：需檢查 `ProgressiveAnalysisCard` 的 `onAnalysisComplete` 回調是否傳遞完整資料

**驗證**：查看步驟 2 的日誌輸出

### 假設 3: React State 更新問題

**可能性**：低 ❌

**原因**：`setAnalysisContent()` 是標準的 React setState 操作，不會截斷字串

### 假設 4: API 請求 payload 大小限制

**可能性**：中 ⚠️

**調查**：Next.js API routes 預設有 4MB 的 body 大小限制

**驗證**：
```typescript
// 在 apps/web/app/api/backpack/save/route.ts 中檢查
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // 如果需要更大的限制
    },
  },
}
```

### 假設 5: Markdown 解析問題

**可能性**：高 ✅

**調查**：如果 `analysis.structuredNotes` 包含特殊 Markdown 語法，可能在某個環節被意外截斷

**驗證**：檢查日誌中的完整內容是否包含特殊字元

### 假設 6: Database 欄位長度限制

**可能性**：中 ⚠️

**調查**：檢查 `notebook_entries.content_md` 欄位的類型

**驗證**：
```sql
SELECT
  column_name,
  data_type,
  character_maximum_length
FROM information_schema.columns
WHERE table_name = 'notebook_entries'
  AND column_name = 'content_md';
```

如果是 `VARCHAR(N)`，可能需要改為 `TEXT` 類型

## 📝 下一步行動

1. **執行完整測試流程**（見上方「測試步驟」）
2. **收集所有 Console 日誌**
3. **根據「問題定位矩陣」判斷截斷發生位置**
4. **針對性修復問題**

## 🎯 預期結果

- 所有日誌顯示 `contentLength` 一致
- 書包中的筆記包含完整的重點統整內容
- 無內容截斷問題

---

**測試狀態**：⏳ Ready for User Testing
**調查人員**：Development Team
**最後更新**：2025-01-30
