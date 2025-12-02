-- ============================================================================
-- Temporarily Disable RLS to Test if That's the Issue
-- ============================================================================

-- 1. Check current RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- 2. Temporarily disable RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'profiles';

-- Now try Google OAuth sign up again

-- 4. If OAuth works after disabling RLS, re-enable it:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 5. Then we need to fix the RLS policies to allow trigger inserts
