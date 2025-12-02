-- Check what seed_questions are tied to Mock User
-- This will help us understand the impact before deleting

-- 1. Check how many seed_questions are linked to Mock User
SELECT count(*) as questions_linked_to_mock_user
FROM seed_questions 
WHERE imported_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 2. Check total seed_questions in database
SELECT count(*) as total_seed_questions
FROM seed_questions;

-- 3. Check if there are questions NOT linked to Mock User
SELECT count(*) as questions_NOT_linked_to_mock_user
FROM seed_questions 
WHERE imported_by != 'e770f9cd-52a7-43de-b983-70f6f78d2f53' 
   OR imported_by IS NULL;

-- 4. Check actual table structure first
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'seed_questions'
ORDER BY ordinal_position;

-- 5. See sample of Mock User questions (first 5) - using only safe columns
SELECT id, imported_by, updated_at
FROM seed_questions 
WHERE imported_by = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
LIMIT 5;