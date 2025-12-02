# RAG 403 錯誤診斷指南

## 問題分析

你已經執行過很多次 migration，但仍然出現 403 錯誤。這表示問題**不是**表不存在，而是其他原因。

## 可能的 403 原因

### 1. RLS (Row Level Security) 政策問題 ⚠️ 最可能

即使表存在，如果 RLS 政策有問題，也會返回 403。

**檢查方法：**
在 Supabase SQL Editor 執行：

```sql
-- 檢查 RLS 是否啟用
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('notebook_entries', 'rag_documents');

-- 檢查 RLS 政策是否存在
SELECT 
  tablename,
  policyname,
  cmd as operation,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notebook_entries', 'rag_documents')
ORDER BY tablename, policyname;
```

**如果政策不存在或錯誤：**
重新執行 migration 的 RLS 部分（第 80-130 行）

### 2. 認證問題

`/api/rag/upload` 使用 `getApiUser(req)` 驗證用戶。如果：
- JWT token 無效或過期
- 用戶未登入
- Supabase client 配置錯誤

會返回 401，但某些情況下可能顯示為 403。

**檢查方法：**
查看瀏覽器 Network Tab 中 `/api/rag/upload` 的：
- Request Headers 中的 `Authorization` 或 Cookie
- Response 的實際狀態碼和錯誤訊息

### 3. Supabase Client 配置問題

檢查 `apps/web/lib/api/auth.ts` 中的 `getApiUser` 實現。

## 快速修復方案

### 方案 1：重新創建 RLS 政策（推薦）

如果表已存在但 RLS 有問題，只執行 RLS 部分：

```sql
-- 只執行 RLS 部分（從 migration 文件的第 80 行開始）
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents ENABLE ROW LEVEL SECURITY;

-- 刪除並重新創建 notebook_entries 的 RLS 政策
DROP POLICY IF EXISTS "Users can view their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can insert their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can update their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can delete their own notebook entries" ON notebook_entries;

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

-- 刪除並重新創建 rag_documents 的 RLS 政策
DROP POLICY IF EXISTS "Users can view their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can insert their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can update their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can delete their own RAG documents" ON rag_documents;

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
```

### 方案 2：臨時禁用 RLS（僅用於測試）

**⚠️ 僅用於診斷，不要用於生產環境！**

```sql
ALTER TABLE notebook_entries DISABLE ROW LEVEL SECURITY;
ALTER TABLE rag_documents DISABLE ROW LEVEL SECURITY;
```

如果禁用 RLS 後 403 消失，說明問題確實在 RLS 政策。

### 方案 3：檢查實際錯誤訊息

在瀏覽器開發者工具的 Network Tab 中：
1. 找到 `/api/rag/upload` 請求
2. 查看 Response 的完整內容
3. 確認實際的錯誤訊息和狀態碼

## 為什麼 migration 可以重複執行？

Migration 文件使用了：
- `CREATE TABLE IF NOT EXISTS` - 表已存在時不會報錯
- `DROP POLICY IF EXISTS` - 政策已存在時先刪除再創建
- `CREATE OR REPLACE FUNCTION` - 函數會覆蓋舊版本

所以重複執行 migration **理論上**不會有問題。但如果：
- RLS 政策創建失敗但沒有報錯
- 或者政策被手動刪除了
- 或者 Supabase 的 RLS 緩存有問題

就會導致 403 錯誤。

## 下一步

1. **先執行方案 1**（重新創建 RLS 政策）
2. **如果還是有問題**，執行方案 2（臨時禁用 RLS）來確認問題
3. **檢查瀏覽器 Network Tab** 查看實際錯誤訊息

