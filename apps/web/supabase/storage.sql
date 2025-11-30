-- Storage Buckets Setup
-- Run this in Supabase Dashboard > Storage, not SQL Editor
-- Or use the Dashboard UI to create buckets

-- Note: Buckets are created via Dashboard UI or Supabase CLI, not SQL
-- Instructions:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New Bucket" and create:
--    - avatars (public: true)
--    - post_images (public: true)
--    - backpack_files (public: false)
--    - explanations (public: true)

-- After creating buckets via UI, run these policies in SQL Editor:

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Avatars bucket - public read, authenticated write
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
-- Post images - public read, authenticated write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public post images read'
  ) THEN
    CREATE POLICY "Public post images read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'post_images');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Authenticated users upload post images'
  ) THEN
    CREATE POLICY "Authenticated users upload post images"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'post_images'
        AND auth.role() = 'authenticated'
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users update own post images'
  ) THEN
    CREATE POLICY "Users update own post images"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'post_images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users delete own post images'
  ) THEN
    CREATE POLICY "Users delete own post images"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'post_images'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ============================================
-- Backpack files - private, owner only
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users view own backpack files'
  ) THEN
    CREATE POLICY "Users view own backpack files"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'backpack_files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users upload own backpack files'
  ) THEN
    CREATE POLICY "Users upload own backpack files"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'backpack_files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users update own backpack files'
  ) THEN
    CREATE POLICY "Users update own backpack files"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'backpack_files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Users delete own backpack files'
  ) THEN
    CREATE POLICY "Users delete own backpack files"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'backpack_files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;

-- ============================================
-- Explanations bucket - public read, admin write
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Public explanations read'
  ) THEN
    CREATE POLICY "Public explanations read"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'explanations');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admins upload explanations'
  ) THEN
    CREATE POLICY "Admins upload explanations"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'explanations'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admins update explanations'
  ) THEN
    CREATE POLICY "Admins update explanations"
      ON storage.objects FOR UPDATE
      USING (
        bucket_id = 'explanations'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Admins delete explanations'
  ) THEN
    CREATE POLICY "Admins delete explanations"
      ON storage.objects FOR DELETE
      USING (
        bucket_id = 'explanations'
        AND EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid()
          AND role = 'admin'
        )
      );
  END IF;
END $$;
