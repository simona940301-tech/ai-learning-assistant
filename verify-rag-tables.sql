-- 驗證 RAG 表是否已創建
-- 在 Supabase SQL Editor 中執行此查詢來檢查表是否存在

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('notebook_entries', 'rag_documents') THEN '✅ 已存在'
    ELSE '❌ 不存在'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('notebook_entries', 'rag_documents');

-- 檢查 RLS 是否已啟用
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('notebook_entries', 'rag_documents');

-- 檢查 RLS 政策是否存在
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('notebook_entries', 'rag_documents')
ORDER BY tablename, policyname;
