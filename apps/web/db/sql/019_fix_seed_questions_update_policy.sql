-- ============================================
-- 修復 seed_questions 表的 UPDATE 權限
-- ============================================
-- 添加 UPDATE RLS 策略，允許管理員更新 has_explanation 標記

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'seed_questions' 
    AND policyname = 'Only admins can update seed questions'
  ) THEN
    CREATE POLICY "Only admins can update seed questions"
      ON seed_questions FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE id = auth.uid() 
          AND role = 'admin'
        )
      );
  END IF;
END $$;

-- 驗證策略已創建
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'seed_questions'
ORDER BY policyname;

