-- Fix Onboarding RLS Policies
-- Date: 2025-11-23
-- Description: Enable RLS and add policies for onboarding_sessions table to fix 401 errors

-- 1. Enable RLS on onboarding_sessions table
ALTER TABLE onboarding_sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create policy to allow users to view their own sessions
DROP POLICY IF EXISTS "Users can view their own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can view their own onboarding sessions"
ON onboarding_sessions FOR SELECT
USING (auth.uid() = user_id);

-- 3. Create policy to allow users to insert their own sessions
DROP POLICY IF EXISTS "Users can insert their own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can insert their own onboarding sessions"
ON onboarding_sessions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Create policy to allow users to update their own sessions
DROP POLICY IF EXISTS "Users can update their own onboarding sessions" ON onboarding_sessions;
CREATE POLICY "Users can update their own onboarding sessions"
ON onboarding_sessions FOR UPDATE
USING (auth.uid() = user_id);

-- 5. Verify policies
SELECT * FROM pg_policies WHERE tablename = 'onboarding_sessions';
