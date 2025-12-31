-- ============================================
-- FIX: Error Book RLS Policy
-- ============================================
-- Run this SQL in your Supabase SQL Editor
-- (https://supabase.com/dashboard/project/YOUR_PROJECT/sql)

-- Step 1: Check existing policies
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'error_book';

-- Step 2: Drop the old policy if it exists
DROP POLICY IF EXISTS "Users can insert their own error_book entries" ON error_book;

-- Step 3: Create the new INSERT policy
CREATE POLICY "Users can insert their own error_book entries"
ON error_book FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Step 4: Verify the policy was created
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'error_book';
