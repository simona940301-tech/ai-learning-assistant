# 修復重點統整 Tab 文件上傳功能

## 🎯 問題總結

重點統整 Tab 的文件上傳功能可能因為以下原因出現錯誤：
1. 資料庫表未創建（migration 未執行）
2. 用戶認證問題
3. 文件處理錯誤
4. AI API 配置問題

## 🚀 快速修復步驟

### 步驟 1: 執行資料庫 Migration

資料庫需要創建兩個表：`rag_documents` 和 `notebook_entries`

**⚠️ 重要：Migration 已修復政策衝突問題**

如果你之前執行 migration 時遇到 "policy already exists" 錯誤，現在已經修復了！

**方法 A: 使用 Supabase Dashboard（推薦）**

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案：`umzqjgxsetsmwzhniemw`
3. 進入 **SQL Editor**

4. **第一步：驗證表狀態**
   - 複製 [verify-rag-tables.sql](verify-rag-tables.sql) 的內容
   - 在 SQL Editor 中執行
   - 查看結果，確認哪些表已存在

5. **第二步：執行 Migration**
   - 打開 [supabase/migrations/20251123_create_rag_notebook_schema.sql](supabase/migrations/20251123_create_rag_notebook_schema.sql)
   - 複製全部內容到 SQL Editor
   - 點擊 **Run** 執行
   - ✅ 現在已經包含 `DROP POLICY IF EXISTS`，不會再有衝突

**方法 B: 使用 Supabase CLI**

```bash
# 連接到遠端資料庫
supabase link --project-ref umzqjgxsetsmwzhniemw

# 推送 migration
supabase db push

# 確認表已創建
supabase db pull
```

### 步驟 2: 驗證表結構

在 Supabase Dashboard > SQL Editor 執行：

```sql
-- 檢查 rag_documents 表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rag_documents'
ORDER BY ordinal_position;

-- 檢查 notebook_entries 表結構
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'notebook_entries'
ORDER BY ordinal_position;
```

應該看到以下欄位：

**rag_documents:**
- id (uuid)
- user_id (uuid)
- filename (text)
- file_size (integer)
- file_type (text)
- original_text (text)
- summary (text)
- keywords (text[])
- status (text)
- uploaded_at (timestamp)
- processed_at (timestamp)

**notebook_entries:**
- id (uuid)
- user_id (uuid)
- title (text)
- content_md (text)
- source_type (text)
- document_id (text)
- tags (text[])
- created_at (timestamp)
- updated_at (timestamp)

### 步驟 3: 檢查 RLS 政策

執行以下 SQL 確認 Row Level Security 政策：

```sql
-- 檢查 rag_documents 的 RLS 政策
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'rag_documents';

-- 檢查 notebook_entries 的 RLS 政策
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'notebook_entries';
```

應該看到 SELECT, INSERT, UPDATE, DELETE 的政策。

### 步驟 4: 測試 API 端點

#### 4.1 啟動開發伺服器

```bash
pnpm --filter web dev
```

#### 4.2 測試健康檢查

```bash
curl http://localhost:3000/api/health
```

應該返回：`{"status":"ok"}`

#### 4.3 手動測試文件上傳

1. 打開瀏覽器訪問 http://localhost:3000/login
2. 登入帳號
3. 訪問 http://localhost:3000/ask
4. 切換到「重點統整」Tab
5. 打開瀏覽器 DevTools (F12)
6. 切換到 Console Tab

#### 4.4 上傳測試文件

1. 創建一個測試 TXT 文件：

```bash
cat > test-upload.txt << 'EOF'
學測數學重點整理

一、數與式
1. 指數律：a^m × a^n = a^(m+n)
2. 對數律：log(ab) = log(a) + log(b)
3. 複數運算：i² = -1

二、方程式
1. 一元二次方程式：ax² + bx + c = 0
2. 判別式：Δ = b² - 4ac
3. 公式解：x = (-b ± √Δ) / 2a

三、函數
1. 一次函數：y = mx + b
2. 二次函數：y = ax² + bx + c
3. 函數圖形的平移與對稱

重點提醒：
- 注意定義域和值域
- 記住常用公式
- 多做練習題
EOF
```

2. 在網頁中拖放或選擇這個文件
3. 點擊「開始分析」
4. 觀察 Console 和 Network Tab 的輸出

### 步驟 5: 檢查常見錯誤

#### 錯誤 A: "relation 'rag_documents' does not exist"

**原因:** 表未創建

**解決:** 返回步驟 1，執行 migration

#### 錯誤 B: "UNAUTHORIZED" 或 401 錯誤

**原因:** 用戶未登入或 token 失效

**解決:**
1. 確保已在 `/login` 頁面登入
2. 檢查 DevTools > Application > Cookies
3. 確認有 `sb-access-token` 和 `sb-refresh-token`
4. 如果 token 失效，清除 cookies 並重新登入

#### 錯誤 C: "TEXT_TOO_SHORT"

**原因:** 提取的文本少於 50 字元

**可能情況:**
1. PDF 是掃描的圖片檔（需要 OCR）
2. 文件內容確實太少

**解決:**
- 使用包含更多文字的文件（至少 50 字元）
- 檢查 PDF 是否包含可提取的文字

#### 錯誤 D: "File too large"

**原因:** 文件超過 10MB

**解決:**
- 使用較小的文件
- 或修改 [apps/web/app/api/rag/upload/route.ts:11](apps/web/app/api/rag/upload/route.ts:11) 的 `MAX_FILE_SIZE`

#### 錯誤 E: "SUMMARY_GENERATION_ERROR"

**原因:** AI API 調用失敗

**檢查:**
1. 環境變數 `GEMINI_API_KEY` 是否設置
2. AI API 配額是否用完
3. 網絡連接是否正常

**解決:**
```bash
# 檢查環境變數
grep GEMINI_API_KEY .env.local

# 如果沒有，添加：
echo "GEMINI_API_KEY=your-api-key" >> .env.local

# 重啟開發伺服器
```

### 步驟 6: 驗證完整流程

完整的測試檢查清單：

- [ ] 資料庫表已創建
- [ ] 用戶可以成功登入
- [ ] 可以上傳 TXT 文件
- [ ] 可以上傳 PDF 文件
- [ ] 摘要正確生成
- [ ] 關鍵詞正確提取
- [ ] 可以存到筆記本
- [ ] 資料來源列表顯示正確

### 步驟 7: 除錯工具

#### 檢查後端日誌

開發伺服器的終端會顯示詳細日誌：

```
[RAG Upload] Extracted text length: 326 characters
[RAG Upload] File: test-upload.txt, Size: 326 bytes, Pages: N/A
[RAG Upload] First 200 chars: 學測數學重點整理...
```

#### 檢查前端 Console

在瀏覽器 Console 中查看：

```javascript
// 檢查 attachedFiles state
console.log('[FileUploader] Files:', attachedFiles)

// 檢查上傳響應
console.log('[SummaryWorkbench] Upload response:', data)
```

#### 檢查 Network 請求

在 DevTools > Network Tab：
1. 找到 `/api/rag/upload` 請求
2. 查看 Request Headers（確認有 Cookie）
3. 查看 Request Payload（FormData 包含文件）
4. 查看 Response（檢查錯誤訊息）

## 🔧 手動修復代碼問題

如果以上步驟都完成但仍有問題，可能需要修復代碼：

### 修復 1: 加強文件 URL 驗證

編輯 [apps/web/components/ask/SummaryWorkbench.tsx](apps/web/components/ask/SummaryWorkbench.tsx:116):

```typescript
// 在 handleGenerate 函數中添加更多驗證
if (attachedFiles.length > 0) {
  const firstFile = attachedFiles[0]

  // 加強驗證
  if (!firstFile.url) {
    console.error('[SummaryWorkbench] File URL is missing:', firstFile)
    setError('文件上傳出錯，請重新選擇文件')
    return
  }

  console.log('[SummaryWorkbench] Uploading file:', firstFile.name)

  // ... 繼續上傳流程
}
```

### 修復 2: 添加更詳細的錯誤訊息

編輯 [apps/web/components/ask/SummaryWorkbench.tsx](apps/web/components/ask/SummaryWorkbench.tsx:144):

```typescript
} catch (err) {
  console.error('[SummaryWorkbench] Error:', err)

  // 根據不同的錯誤類型顯示不同訊息
  if (err instanceof Error) {
    if (err.message.includes('UNAUTHORIZED')) {
      setError('登入狀態失效，請重新登入')
    } else if (err.message.includes('TEXT_TOO_SHORT')) {
      setError('文件內容太少，請選擇包含更多文字的文件')
    } else if (err.message.includes('FILE_TOO_LARGE')) {
      setError('文件太大，請選擇小於 10MB 的文件')
    } else {
      setError(err.message)
    }
  } else {
    setError('分析失敗，請稍後再試')
  }
}
```

### 修復 3: 添加重試機制

對於網絡錯誤，可以添加重試：

```typescript
async function uploadWithRetry(formData: FormData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/rag/upload', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        return response
      }

      // 如果是 5xx 錯誤，重試
      if (response.status >= 500 && i < maxRetries - 1) {
        console.log(`Retry ${i + 1}/${maxRetries}...`)
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
        continue
      }

      return response
    } catch (error) {
      if (i === maxRetries - 1) throw error
      console.log(`Retry ${i + 1}/${maxRetries} after network error...`)
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
    }
  }

  throw new Error('Upload failed after retries')
}
```

## 📊 成功指標

完成修復後，應該看到：

1. **前端 Console:**
   ```
   ✅ [ForceSolver] Solver-only mode active
   [SummaryWorkbench] Uploading file: test-upload.txt
   [SummaryWorkbench] Upload successful
   ```

2. **Network 請求:**
   - POST `/api/rag/upload` → 200 OK
   - Response 包含 `document.summary` 和 `keywords`

3. **後端日誌:**
   ```
   [RAG Upload] Extracted text length: 326 characters
   [RAG Upload] File: test-upload.txt, Size: 326 bytes
   ```

4. **UI 顯示:**
   - 摘要卡片正常顯示
   - 關鍵詞標籤顯示
   - 「存到筆記本」按鈕可用

## 🎓 學習資源

- [Supabase 官方文件](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [FormData 使用指南](https://developer.mozilla.org/en-US/docs/Web/API/FormData)

## 💬 仍有問題？

如果按照以上步驟仍無法解決，請提供：
1. 瀏覽器 Console 的完整錯誤訊息
2. Network Tab 中 `/api/rag/upload` 的完整響應
3. 開發伺服器終端的日誌輸出
4. Migration 執行的結果截圖

這樣可以更準確地診斷問題！
