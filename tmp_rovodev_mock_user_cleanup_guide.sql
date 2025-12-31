-- 🗑️ Mock User 完整清理 SQL
-- 在 Supabase Dashboard → SQL Editor 執行

-- Mock User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53
-- Mock Email: dev@test.com

-- 1. 檢查 Mock User 相關資料
SELECT 'profiles' as table_name, count(*) as count 
FROM profiles WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'onboarding_sessions', count(*) 
FROM onboarding_sessions WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'auth.users', count(*) 
FROM auth.users WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 2. 刪除所有 Mock User 相關資料 (按依賴順序)

-- 2a. 刪除 onboarding sessions (外鍵依賴)
DELETE FROM onboarding_sessions 
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 2b. 刪除其他存在的用戶資料表 (安全版本)
-- 只刪除確實存在的表，避免錯誤

-- 檢查並刪除可能存在的表 (如果存在的話)
DO $$ 
BEGIN
    -- 嘗試刪除各個表的資料，如果表不存在就跳過
    BEGIN
        DELETE FROM posts WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
    EXCEPTION WHEN undefined_table THEN
        -- 表不存在，跳過
    END;
    
    BEGIN
        DELETE FROM user_missions WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
    EXCEPTION WHEN undefined_table THEN
        -- 表不存在，跳過
    END;
    
    BEGIN
        DELETE FROM backpack_notes WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
    EXCEPTION WHEN undefined_table THEN
        -- 表不存在，跳過
    END;
END $$;

-- 2c. 刪除 profiles 表記錄
DELETE FROM profiles 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 2d. 最後刪除 auth.users (主表)
DELETE FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 3. 驗證清理結果
SELECT 'profiles' as table_name, count(*) as remaining_count 
FROM profiles WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53'
UNION ALL
SELECT 'auth.users', count(*) 
FROM auth.users WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 預期結果：所有 count 都應該是 0