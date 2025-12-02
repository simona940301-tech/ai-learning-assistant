-- ============================================
-- 強制修復 Avatar RLS 政策
-- ============================================
-- 這個腳本會：
-- 1. 刪除所有現有的 avatar 相關政策
-- 2. 重新創建正確的政策
-- 3. 驗證創建成功
-- ============================================

-- 清理舊政策
DROP POLICY IF EXISTS "Public avatars read" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own avatars" ON storage.objects;

-- 重新創建政策

-- 1. 允許所有人讀取頭像（因為是 public bucket）
CREATE POLICY "Public avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 2. 允許認證用戶上傳頭像
CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

-- 3. 允許用戶更新自己的頭像
CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. 允許用戶刪除自己的頭像
CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 驗證政策已創建
-- ============================================
SELECT
  policyname,
  cmd,
  CASE
    WHEN cmd = 'SELECT' THEN '✅ 讀取'
    WHEN cmd = 'INSERT' THEN '✅ 上傳'
    WHEN cmd = 'UPDATE' THEN '✅ 更新'
    WHEN cmd = 'DELETE' THEN '✅ 刪除'
  END as operation
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY cmd;

-- 期望看到 4 條結果
