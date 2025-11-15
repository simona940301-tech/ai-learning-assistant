-- ============================================
-- Add Role Column to Profiles Table
-- ============================================
-- 為用戶添加角色欄位，支持權限管理

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('admin', 'teacher', 'student', 'guest'));

CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 更新現有用戶角色（可選）
-- UPDATE profiles SET role = 'admin' WHERE email IN ('admin@example.com');

