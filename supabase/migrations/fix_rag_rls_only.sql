-- 只修復 RAG 表的 RLS 政策（不需要重複執行整個 migration）
-- 如果表已存在但 RLS 有問題，執行此腳本即可

-- ============================================
-- 1. 確保 RLS 已啟用
-- ============================================
ALTER TABLE IF EXISTS notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rag_documents ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. 刪除舊的 RLS 政策（避免衝突）
-- ============================================

-- notebook_entries 的政策
DROP POLICY IF EXISTS "Users can view their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can insert their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can update their own notebook entries" ON notebook_entries;
DROP POLICY IF EXISTS "Users can delete their own notebook entries" ON notebook_entries;

-- rag_documents 的政策
DROP POLICY IF EXISTS "Users can view their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can insert their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can update their own RAG documents" ON rag_documents;
DROP POLICY IF EXISTS "Users can delete their own RAG documents" ON rag_documents;

-- ============================================
-- 3. 重新創建 RLS 政策
-- ============================================

-- notebook_entries 的政策
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

-- rag_documents 的政策
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

-- ============================================
-- 4. 驗證政策是否創建成功
-- ============================================
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notebook_entries', 'rag_documents')
ORDER BY tablename, policyname;

