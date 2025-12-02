# 🚨 緊急修復：重點統整 Tab 文件上傳

## 🔥 發現的根本問題

### 問題 1: pdf-parse 未安裝 ❌
**錯誤訊息:** `Object.defineProperty called on non-object`

**原因:** `pdf-parse` 和 `@types/pdf-parse` 沒有在 `package.json` 的 dependencies 中

**已修復:** ✅ 已添加到 `apps/web/package.json`

### 問題 2: 資料庫 403 錯誤 ❌
**錯誤訊息:** `Failed to load resource: 403`

**原因:** 資料庫表或 RLS 政策未正確設置

**需要修復:** 執行 migration

### 問題 3: PDF 解析代碼不夠健壯 ❌
**問題:** 錯誤處理不夠詳細，導入方式可能失敗

**已修復:** ✅ 改進了 `text-extraction.ts` 的錯誤處理

---

## 🚀 立即執行修復（按順序）

### 步驟 1: 安裝缺失的依賴 ⚡

```bash
# 在專案根目錄執行
pnpm install

# 或只安裝 web 的依賴
pnpm --filter web install
```

**預期結果:**
```
✓ pdf-parse 已安裝
✓ @types/pdf-parse 已安裝
```

### 步驟 2: 執行資料庫 Migration 📊

**方法 A: 使用 Supabase Dashboard（最快）**

1. 打開瀏覽器訪問:
   ```
   https://supabase.com/dashboard/project/umzqjgxsetsmwzhniemw/sql/new
   ```

2. 複製以下完整的 SQL 並執行:

```sql
-- ============================================
-- 重點統整功能資料庫 Migration
-- 修復版本：包含 DROP IF EXISTS
-- ============================================

-- 1. 創建 notebook_entries 表
CREATE TABLE IF NOT EXISTS notebook_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content_md TEXT NOT NULL,
  source_type TEXT CHECK (source_type IN ('summary', 'qa', 'manual')) DEFAULT 'manual',
  document_id TEXT,
  vector_collection TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. 創建 rag_documents 表
CREATE TABLE IF NOT EXISTS rag_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT CHECK (file_type IN ('pdf', 'txt')) NOT NULL,
  original_text TEXT,
  chroma_collection TEXT,
  chroma_doc_ids TEXT[],
  summary TEXT,
  keywords TEXT[],
  status TEXT CHECK (status IN ('uploading', 'processing', 'ready', 'error')) DEFAULT 'uploading',
  error_message TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  processed_at TIMESTAMPTZ
);

-- 3. 創建索引
CREATE INDEX IF NOT EXISTS idx_notebook_user ON notebook_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_notebook_tags ON notebook_entries USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_notebook_created ON notebook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notebook_source_type ON notebook_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_rag_docs_user ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_docs_status ON rag_documents(status);
CREATE INDEX IF NOT EXISTS idx_rag_docs_uploaded ON rag_documents(uploaded_at DESC);

-- 4. 啟用 RLS
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- 5. 刪除舊的 RLS 政策（避免衝突）
DROP POLICY IF EXISTS "Users can view their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can insert their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can update their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can delete their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can view their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can insert their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can update their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can delete their own RAG documents" ON rag_documents;

-- 6. 創建新的 RLS 政策
CREATE POLICY "Users can view their own notebook entries"
  ON notebook_entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notebook entries"
  ON notebook_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebook entries"
  ON notebook_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebook entries"
  ON notebook_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own RAG documents"
  ON rag_documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own RAG documents"
  ON rag_documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own RAG documents"
  ON rag_documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own RAG documents"
  ON rag_documents FOR DELETE
  USING (auth.uid() = user_id);

-- 7. 創建觸發器函數
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 創建觸發器
DROP TRIGGER IF EXISTS update_notebook_entries_updated_at ON notebook_entries;
CREATE TRIGGER update_notebook_entries_updated_at
  BEFORE UPDATE ON notebook_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. 創建輔助函數
CREATE OR REPLACE FUNCTION get_notebook_stats(p_user_id UUID)
RETURNS TABLE (
  total_entries BIGINT,
  summary_count BIGINT,
  qa_count BIGINT,
  manual_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE source_type = 'summary') AS summary_count,
    COUNT(*) FILTER (WHERE source_type = 'qa') AS qa_count,
    COUNT(*) FILTER (WHERE source_type = 'manual') AS manual_count
  FROM notebook_entries
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_rag_documents_stats(p_user_id UUID)
RETURNS TABLE (
  total_documents BIGINT,
  ready_count BIGINT,
  processing_count BIGINT,
  error_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*) AS total_documents,
    COUNT(*) FILTER (WHERE status = 'ready') AS ready_count,
    COUNT(*) FILTER (WHERE status = 'processing') AS processing_count,
    COUNT(*) FILTER (WHERE status = 'error') AS error_count
  FROM rag_documents
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 驗證設置
SELECT 'Migration completed successfully!' as status;
```

3. 點擊 **Run** 按鈕執行

4. 確認看到: `Migration completed successfully!`

### 步驟 3: 重啟開發伺服器 🔄

```bash
# 停止當前伺服器（Ctrl+C）
# 然後重新啟動
pnpm --filter web dev
```

### 步驟 4: 測試功能 ✅

1. **訪問應用**
   ```
   http://localhost:3000/ask
   ```

2. **切換到「重點統整」Tab**

3. **創建測試文件**
   ```bash
   cat > test-upload.txt << 'EOF'
   學測數學複習重點

   一、數與式
   1. 指數律：a^m × a^n = a^(m+n)
   2. 對數律：log(ab) = log(a) + log(b)
   3. 複數運算：i² = -1

   二、方程式
   1. 一元二次方程式：ax² + bx + c = 0
   2. 判別式：Δ = b² - 4ac
   3. 公式解：x = (-b ± √Δ) / 2a

   三、函數與圖形
   1. 一次函數：y = mx + b
   2. 二次函數：y = ax² + bx + c
   3. 函數的平移與對稱

   四、數列與級數
   1. 等差數列：an = a1 + (n-1)d
   2. 等比數列：an = a1 × r^(n-1)
   3. 級數求和公式

   重點提醒：
   - 熟記公式並理解其意義
   - 注意定義域和值域
   - 多做練習題加強應用
   EOF
   ```

4. **上傳測試**
   - 拖放或選擇 `test-upload.txt`
   - 點擊「開始分析」
   - 等待摘要生成

5. **預期結果**
   - ✅ 顯示摘要內容
   - ✅ 顯示關鍵詞標籤
   - ✅ 可以點擊「存到筆記本」
   - ✅ 資料來源列表顯示上傳的文件

---

## 🔍 驗證修復

### 檢查 1: 依賴已安裝

```bash
ls apps/web/node_modules/pdf-parse/
# 應該顯示檔案列表，不是 "No such file or directory"
```

### 檢查 2: 資料庫表已創建

在 Supabase Dashboard 執行:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rag_documents', 'notebook_entries');
```

應該看到兩個表名。

### 檢查 3: RLS 政策已設置

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('rag_documents', 'notebook_entries')
ORDER BY tablename, policyname;
```

應該看到 8 個政策（每個表 4 個：SELECT, INSERT, UPDATE, DELETE）。

### 檢查 4: 瀏覽器 Console 無錯誤

打開 DevTools > Console，應該看到:
```
✅ [ForceSolver] Solver-only mode active
[PDF Extract] Starting PDF extraction...
[PDF Extract] ✅ Success! Pages: X, Text length: XXX
```

而不是:
```
❌ Object.defineProperty called on non-object
❌ 403 Forbidden
```

---

## 📊 完整的檢查清單

- [ ] 執行 `pnpm install`
- [ ] 確認 `pdf-parse` 已安裝
- [ ] 在 Supabase Dashboard 執行 migration SQL
- [ ] 確認兩個表已創建
- [ ] 確認 RLS 政策已設置
- [ ] 重啟開發伺服器
- [ ] 登入應用
- [ ] 訪問 /ask 頁面
- [ ] 切換到「重點統整」Tab
- [ ] 上傳測試 TXT 文件
- [ ] 確認摘要生成成功
- [ ] 測試「存到筆記本」功能
- [ ] 檢查資料來源列表

---

## 🐛 如果還有問題

### 問題 A: pnpm install 失敗

```bash
# 清除快取並重新安裝
pnpm store prune
rm -rf node_modules apps/web/node_modules
pnpm install
```

### 問題 B: Migration 執行失敗

查看錯誤訊息，如果是:
- `relation already exists` → 表已存在，可忽略
- `policy already exists` → 已修復，但仍出現則手動執行 DROP POLICY
- `permission denied` → 檢查是否使用正確的資料庫帳號

### 問題 C: 403 錯誤仍然出現

```sql
-- 手動檢查 RLS 是否啟用
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('rag_documents', 'notebook_entries');

-- rowsecurity 應該是 't' (true)
```

### 問題 D: PDF 解析仍然失敗

```bash
# 確認 pdf-parse 版本
cat apps/web/package.json | grep pdf-parse

# 應該顯示:
#   "pdf-parse": "^2.4.5",
#   "@types/pdf-parse": "^1.1.5",

# 檢查是否安裝
ls apps/web/node_modules/pdf-parse/package.json
```

### 問題 E: AI 摘要生成失敗

```bash
# 檢查 API key
grep GEMINI_API_KEY apps/web/.env.local

# 如果沒有，添加:
echo "GEMINI_API_KEY=your-actual-key" >> apps/web/.env.local

# 重啟伺服器
```

---

## 🎯 成功指標

完成所有步驟後，你應該看到:

1. **終端日誌:**
   ```
   [PDF Extract] ✅ Success! Pages: 1, Text length: 326
   [RAG Upload] Extracted text length: 326 characters
   ```

2. **瀏覽器 Console:**
   ```
   [SummaryWorkbench] Uploading file: test-upload.txt
   ```

3. **UI 顯示:**
   - 摘要卡片完整顯示
   - 關鍵詞標籤正常
   - 可以存到筆記本

4. **Network Tab:**
   - POST /api/rag/upload → 200 OK
   - Response 包含 `document.summary`

---

## 📝 修復總結

### 已修復的文件:
1. ✅ [apps/web/package.json](apps/web/package.json) - 添加 pdf-parse 依賴
2. ✅ [apps/web/lib/utils/text-extraction.ts](apps/web/lib/utils/text-extraction.ts) - 改進錯誤處理
3. ✅ [supabase/migrations/20251123_create_rag_notebook_schema.sql](supabase/migrations/20251123_create_rag_notebook_schema.sql) - 修復政策衝突

### 需要手動執行:
1. ⚡ `pnpm install` - 安裝依賴
2. 📊 執行 migration SQL - 創建資料庫表
3. 🔄 重啟伺服器 - 應用更改

**預計修復時間:** 5-10 分鐘

完成這些步驟後，重點統整功能應該可以正常使用了！🎉
