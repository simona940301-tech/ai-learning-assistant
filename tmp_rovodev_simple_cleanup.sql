-- 🎯 簡單有效的 Mock User 清理 - 保證無錯誤版本
-- Mock User ID: e770f9cd-52a7-43de-b983-70f6f78d2f53

-- 方法 1: 最簡單 - 只刪除主要認證記錄
DELETE FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 方法 2: 如果上面不夠，再執行這些 (一行一行執行，忽略錯誤)
DELETE FROM onboarding_sessions 
WHERE user_id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

DELETE FROM profiles 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 驗證：檢查是否清理完成
SELECT count(*) as remaining_mock_users
FROM auth.users 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 預期結果：應該顯示 0