-- 設置開發用戶為管理員角色
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';

-- 確認設置成功
SELECT id, email, role FROM profiles WHERE id = 'e770f9cd-52a7-43de-b983-70f6f78d2f53';
