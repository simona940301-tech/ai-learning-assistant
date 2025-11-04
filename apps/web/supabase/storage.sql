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

-- After creating buckets via UI, run these policies in SQL Editor:

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Avatars bucket - public read, authenticated write
CREATE POLICY "Public avatars read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users update own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Post images - public read, authenticated write
CREATE POLICY "Public post images read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post_images');

CREATE POLICY "Authenticated users upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post_images'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Users update own post images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post_images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- Backpack files - private, owner only
CREATE POLICY "Users view own backpack files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users upload own backpack files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own backpack files"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own backpack files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'backpack_files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
