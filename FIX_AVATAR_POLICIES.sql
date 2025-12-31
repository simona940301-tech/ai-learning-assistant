-- ============================================
-- 修復 Avatar Upload RLS 政策
-- ============================================
-- 在 Supabase Dashboard > SQL Editor 執行這個文件
-- 或者複製下面的 SQL 語句執行
-- ============================================

-- 1. 公開讀取政策
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public avatars read'
  ) THEN
    CREATE POLICY "Public avatars read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 2. 認證用戶上傳政策
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users upload avatars'
  ) THEN
    CREATE POLICY "Authenticated users upload avatars"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'avatars'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

-- 3. 用戶更新自己的頭像政策
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users update own avatars'
  ) THEN
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
  END IF;
END $$;

-- 4. 用戶刪除自己的頭像政策
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users delete own avatars'
  ) THEN
    CREATE POLICY "Users delete own avatars"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ============================================
-- 驗證政策是否創建成功
-- ============================================
SELECT
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'storage'
AND tablename = 'objects'
AND policyname LIKE '%avatar%'
ORDER BY policyname;

-- 應該看到 4 條政策：
-- 1. Authenticated users upload avatars (INSERT)
-- 2. Public avatars read (SELECT)
-- 3. Users delete own avatars (DELETE)
-- 4. Users update own avatars (UPDATE)
