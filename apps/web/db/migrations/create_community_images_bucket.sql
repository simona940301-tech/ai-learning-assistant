-- Create community_images storage bucket for community post images
-- Migration: create_community_images_bucket
-- Date: 2025-12-11

-- Create the community_images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'community_images',
  'community_images',
  true, -- Public bucket for easy image access
  5242880, -- 5MB file size limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Note: RLS policies for storage.objects should be created via Supabase Dashboard
-- or with proper superuser permissions. The policies needed are:
-- 
-- 1. Allow authenticated users to upload images:
--    INSERT policy: bucket_id = 'community_images' AND auth.uid()::text = (storage.foldername(name))[1]
-- 
-- 2. Allow public read access:
--    SELECT policy: bucket_id = 'community_images'
-- 
-- 3. Allow users to update their own images:
--    UPDATE policy: bucket_id = 'community_images' AND auth.uid()::text = (storage.foldername(name))[1]
-- 
-- 4. Allow users to delete their own images:
--    DELETE policy: bucket_id = 'community_images' AND auth.uid()::text = (storage.foldername(name))[1]

-- If you have superuser access, uncomment the following:
-- 
-- DROP POLICY IF EXISTS "Allow authenticated users to upload community images" ON storage.objects;
-- CREATE POLICY "Allow authenticated users to upload community images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'community_images' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
-- 
-- DROP POLICY IF EXISTS "Allow public read access to community images" ON storage.objects;
-- CREATE POLICY "Allow public read access to community images"
-- ON storage.objects FOR SELECT
-- TO public
-- USING (bucket_id = 'community_images');
-- 
-- DROP POLICY IF EXISTS "Allow users to update their own community images" ON storage.objects;
-- CREATE POLICY "Allow users to update their own community images"
-- ON storage.objects FOR UPDATE
-- TO authenticated
-- USING (
--   bucket_id = 'community_images' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
-- 
-- DROP POLICY IF EXISTS "Allow users to delete their own community images" ON storage.objects;
-- CREATE POLICY "Allow users to delete their own community images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'community_images' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );
