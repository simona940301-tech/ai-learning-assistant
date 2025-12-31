-- ============================================
-- Fix RLS Infinite Recursion on seed_questions
-- ============================================
-- Problem: UPDATE policy checks profiles table, causing infinite recursion
-- Solution: Use JWT claims (auth.jwt()) instead of table lookups
-- This is zero-cost and prevents recursion

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Only admins can update seed questions" ON seed_questions;
DROP POLICY IF EXISTS "Only admins can insert seed questions" ON seed_questions;

-- Recreate with JWT-based checks (no table lookups)
CREATE POLICY "Only admins can update seed questions"
  ON seed_questions FOR UPDATE
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Only admins can insert seed questions"
  ON seed_questions FOR INSERT
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );

-- Verify policies
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
