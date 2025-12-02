-- Safe Mock User cleanup - Handle foreign key constraints
-- Mock User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53

-- First check which tables reference this user
SELECT 'packs' as table_name, count(*) as count 
FROM packs WHERE created_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'seed_questions', count(*) 
FROM seed_questions WHERE imported_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'onboarding_sessions', count(*) 
FROM onboarding_sessions WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'profiles', count(*) 
FROM profiles WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Delete in correct order (child tables first, then parent tables)

-- Step 1: Delete packs data (foreign key dependency)
DELETE FROM packs 
WHERE created_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 2: Delete seed_questions (foreign key dependency)
DELETE FROM seed_questions 
WHERE imported_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 3: Delete onboarding_sessions
DELETE FROM onboarding_sessions 
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 4: Delete profiles
DELETE FROM profiles 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 5: Finally delete main auth record
DELETE FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Verify cleanup results
SELECT 'Final Check' as status, count(*) as remaining_records
FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 應該顯示 0 records