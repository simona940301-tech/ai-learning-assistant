-- 將用戶設為管理員角色
UPDATE profiles 
SET role = 'admin' 
WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';

-- 確認設定成功
SELECT id, email, role FROM profiles WHERE id = 'b34075cd-d271-4f20-ab9a-cdaa25836da1';
