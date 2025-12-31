請將以下SQL在Supabase Dashboard中執行，或在本地資料庫中執行：

-- 將當前登入用戶設為管理員
-- 請將 YOUR_USER_ID_HERE 替換為您的實際用戶ID

UPDATE profiles 
SET role = 'admin' 
WHERE id = 'YOUR_USER_ID_HERE';

-- 確認設定成功
SELECT id, email, role FROM profiles WHERE id = 'YOUR_USER_ID_HERE';
