-- Final Mock User cleanup - remaining dependencies only
-- Mock User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
-- seed_questions already handled safely

-- Step 1: Delete packs data (foreign key dependency)
DELETE FROM packs 
WHERE created_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 2: Delete onboarding_sessions
DELETE FROM onboarding_sessions 
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 3: Delete profiles
DELETE FROM profiles 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Step 4: Finally delete main auth record
DELETE FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- Verify cleanup results
SELECT 'Final Check' as status, count(*) as remaining_records
FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';