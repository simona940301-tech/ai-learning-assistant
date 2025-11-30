-- ============================================
-- Fix Avatar Storage RLS Policy
-- ============================================
-- Date: 2025-01-21
-- Purpose: Fix INSERT policy to check file path matches user ID
-- Issue: "new row violates row-level security policy" when uploading avatars
-- ============================================

BEGIN;

-- Drop existing INSERT policy (it doesn't check file path)
DROP POLICY IF EXISTS "Authenticated users upload avatars" ON storage.objects;

-- Create new INSERT policy that checks file path
-- File path format: {user_id}/{timestamp}-{filename}.png
-- We need to ensure users can only upload to their own folder
CREATE POLICY "Authenticated users upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

COMMIT;

-- ============================================
-- Verification Query
-- ============================================
-- Run this to verify the policy was created correctly:
-- SELECT 
--   policyname, 
--   cmd,
--   with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage' 
--   AND tablename = 'objects' 
--   AND policyname = 'Authenticated users upload avatars';

