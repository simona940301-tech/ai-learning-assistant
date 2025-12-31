# 重點統整 Tab 文件上傳功能診斷報告

## 📋 功能概述

重點統整 Tab 允許用戶上傳文件（PDF、TXT）並自動生成摘要和關鍵詞。

## 🔍 當前架構

### 前端組件

1. **[ModeTabs.tsx](apps/web/components/ask/ModeTabs.tsx)**
   - 切換「解題」和「重點統整」兩個模式
   - ✅ 功能正常

2. **[SummaryWorkbench.tsx](apps/web/components/ask/SummaryWorkbench.tsx)**
   - 主要工作台組件
   - 包含文件上傳器和分析按鈕
   - ⚠️ 需要檢查錯誤處理

3. **[FileUploader.tsx](apps/web/components/ask/file-uploader.tsx)**
   - 拖放文件上傳組件
   - 使用 `useAsk()` context 管理文件
   - ✅ UI 和互動邏輯正常
   - ⚠️ 但只是暫存在 state，需要實際上傳

4. **[RAGSummaryDisplay.tsx](apps/web/components/ask/RAGSummaryDisplay.tsx)**
   - 顯示生成的摘要和關鍵詞
   - 包含「存到筆記本」功能
   - ✅ UI 組件完整

5. **[RAGDataSourceList.tsx](apps/web/components/ask/RAGDataSourceList.tsx)**
   - 顯示已上傳的文件列表
   - ✅ 功能完整

### Context 管理

**[AskContext](apps/web/lib/ask-context.tsx)**
- 管理 `attachedFiles` 狀態
- ✅ 在 `(app)/layout.tsx` 中正確包裝
- ✅ 提供 `addFiles`, `removeFile`, `clearAll` 方法

### 後端 API

1. **POST /api/rag/upload**
   - 位置: [apps/web/app/api/rag/upload/route.ts](apps/web/app/api/rag/upload/route.ts:24)
   - 功能:
     - 接收文件上傳（FormData）
     - 提取文本內容（PDF 或 TXT）
     - 生成摘要和關鍵詞
     - 儲存到 `rag_documents` 表
   - ✅ 實作完整
   - ⚠️ 需要驗證資料庫表是否存在

2. **GET /api/rag/upload**
   - 獲取用戶已上傳的文件列表
   - ✅ 實作完整

3. **POST /api/notebook/save**
   - 位置: [apps/web/app/api/notebook/save/route.ts](apps/web/app/api/notebook/save/route.ts:20)
   - 儲存摘要到筆記本
   - ✅ 實作完整

### 資料庫表

**Migration: [20251123_create_rag_notebook_schema.sql](supabase/migrations/20251123_create_rag_notebook_schema.sql)**

1. **rag_documents**
   - 儲存上傳的文件和 AI 生成的摘要
   - 欄位: `id`, `user_id`, `filename`, `file_size`, `file_type`, `original_text`, `summary`, `keywords`, `status`
   - ⚠️ 需要確認是否已執行 migration

2. **notebook_entries**
   - 儲存用戶的筆記本條目
   - 欄位: `id`, `user_id`, `title`, `content_md`, `source_type`, `document_id`, `tags`
   - ⚠️ 需要確認是否已執行 migration

## ⚠️ 可能的問題

### 1. 資料庫 Migration 未執行

**症狀:**
- API 返回資料庫錯誤
- 無法插入到 `rag_documents` 或 `notebook_entries`

**檢查方法:**
```bash
# 檢查 Supabase 遠端資料庫
supabase db pull

# 或直接查詢表是否存在
psql <connection-string> -c "\dt rag_documents"
```

**解決方法:**
```bash
# 執行 migration
supabase db push
```

### 2. 文件上傳流程問題

**當前流程:**
1. 用戶拖放或選擇文件 → `FileUploader`
2. 文件被添加到 `attachedFiles` state（`useAsk` context）
3. 用戶點擊「開始分析」→ `SummaryWorkbench.handleGenerate()`
4. 從 `attachedFiles[0].url` 讀取 Blob
5. 創建 FormData 並 POST 到 `/api/rag/upload`

**可能的問題:**
- ✅ `attachedFiles[0].url` 是使用 `URL.createObjectURL()` 創建的，可以正常讀取
- ⚠️ 但如果 `url` 為空，會拋出錯誤
- ⚠️ 錯誤處理可能不夠詳細

### 3. 認證問題

**症狀:**
- API 返回 401 UNAUTHORIZED

**原因:**
- 使用 `getApiUser()` 驗證用戶
- 需要有效的 Supabase JWT token

**解決方法:**
- 確保用戶已登入
- 檢查 cookie 中的 `sb-access-token`

### 4. AI API 配置

**依賴:**
- [apps/web/lib/services/rag-summary.ts](apps/web/lib/services/rag-summary.ts) 的 `generateSummary()` 函數
- 可能使用 Gemini 或其他 AI API

**檢查:**
- 確認環境變數 `GEMINI_API_KEY` 或其他 AI API key 已設置

## ✅ 測試步驟

### 1. 確認資料庫表存在

```bash
# 方法 1: 使用 Supabase CLI
supabase db push

# 方法 2: 手動執行 SQL
# 在 Supabase Dashboard > SQL Editor 中執行
# supabase/migrations/20251123_create_rag_notebook_schema.sql
```

### 2. 啟動開發伺服器

```bash
pnpm --filter web dev
```

### 3. 運行測試腳本（需要先登入）

```bash
# 執行測試
npx tsx test-summary-upload.ts
```

### 4. 手動測試

1. 訪問 http://localhost:3000/ask
2. 切換到「重點統整」Tab
3. 拖放或選擇一個 TXT 或 PDF 文件
4. 檢查文件是否出現在列表中
5. 點擊「開始分析」
6. 觀察：
   - 是否顯示「分析中」狀態
   - 是否成功生成摘要
   - 是否出現錯誤訊息
7. 如果成功，點擊「存到筆記本」

### 5. 檢查瀏覽器控制台

- 打開 DevTools > Console
- 檢查是否有錯誤訊息
- 打開 Network Tab
- 檢查 `/api/rag/upload` 的請求和響應

## 🔧 常見錯誤和解決方案

### 錯誤 1: "relation 'rag_documents' does not exist"

**原因:** 資料庫 migration 未執行

**解決:**
```bash
supabase db push
```

### 錯誤 2: "文件 URL 不存在"

**原因:** `attachedFiles[0].url` 為空或無效

**檢查:**
- [FileUploader.tsx:21](apps/web/components/ask/file-uploader.tsx:21) 的 `URL.createObjectURL(file)` 是否正常執行
- 瀏覽器控制台是否有錯誤

**修復:** 在 [SummaryWorkbench.tsx:118](apps/web/components/ask/SummaryWorkbench.tsx:118) 加強驗證

### 錯誤 3: "TEXT_TOO_SHORT"

**原因:** 提取的文本少於 50 字元

**可能情況:**
- PDF 是掃描的圖片檔（需要 OCR）
- TXT 文件內容太少

**解決:**
- 使用包含更多文字的文件
- 或實作 OCR 功能

### 錯誤 4: "UNAUTHORIZED"

**原因:** 用戶未登入或 token 失效

**解決:**
1. 確保在 `/login` 頁面登入
2. 檢查 cookie 中是否有 `sb-access-token`
3. 如果 token 失效，重新登入

## 🎯 建議改進

### 短期修復

1. **加強錯誤處理**
   - 在 `SummaryWorkbench.tsx` 中添加更詳細的錯誤訊息
   - 顯示具體的錯誤原因（認證、文件類型、檔案大小等）

2. **添加文件驗證**
   - 在前端驗證文件類型和大小
   - 提前告知用戶不支援的文件類型

3. **改善 UX**
   - 添加上傳進度條
   - 顯示處理各階段的狀態（上傳中、提取中、分析中）

### 長期改進

1. **支援更多文件類型**
   - DOCX
   - Images (使用 OCR)

2. **批次上傳**
   - 同時上傳多個文件
   - 合併摘要

3. **進階摘要選項**
   - 讓用戶選擇摘要長度
   - 自定義關鍵詞數量

## 📌 重點檢查清單

- [ ] 確認資料庫 migration 已執行
- [ ] 確認用戶已登入
- [ ] 確認環境變數（AI API key）已設置
- [ ] 測試文件上傳流程
- [ ] 檢查瀏覽器控制台錯誤
- [ ] 檢查網絡請求和響應
- [ ] 測試「存到筆記本」功能

## 🚀 快速診斷命令

```bash
# 1. 檢查資料庫表
supabase db pull

# 2. 執行 migration（如果需要）
supabase db push

# 3. 啟動開發伺服器
pnpm --filter web dev

# 4. 在另一個終端運行測試
npx tsx test-summary-upload.ts
```

## 📞 需要幫助？

如果問題仍未解決，請提供以下資訊：
1. 瀏覽器控制台的錯誤訊息
2. 網絡請求的詳細響應
3. 伺服器終端的日誌輸出
4. 測試腳本的輸出結果
