-- Quick diagnostic query to check rag_documents table
-- Run this in Supabase SQL Editor

-- 1. Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'rag_documents'
) as table_exists;

-- 2. If table exists, check its structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'rag_documents'
ORDER BY ordinal_position;

-- 3. Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'rag_documents';

-- 4. Try a test insert (will fail if RLS is blocking)
-- Replace 'YOUR_USER_ID' with your actual user ID from the error log
-- INSERT INTO rag_documents (user_id, filename, file_type, original_text, status)
-- VALUES ('b34075cd-d271-4f20-ab9a-cdaa25836da1', 'test.pdf', 'pdf', 'test content', 'processing')
-- RETURNING id;
