-- 檢查表是否存在
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('rag_documents', 'notebook_entries') THEN '✅ 存在'
    ELSE ''
  END as status
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name IN ('rag_documents', 'notebook_entries')
ORDER BY table_name;

-- 檢查 rag_documents 的欄位
\d rag_documents

-- 檢查 notebook_entries 的欄位
\d notebook_entries
