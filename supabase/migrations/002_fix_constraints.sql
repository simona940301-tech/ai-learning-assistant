-- 暫時修改外鍵約束以允許測試
-- 這個遷移應該在 Supabase Dashboard 的 SQL Editor 中執行

-- 1. 添加新欄位（如果還沒有）
ALTER TABLE backpack_items ADD COLUMN IF NOT EXISTS derived_from TEXT[];
ALTER TABLE backpack_items ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb;

-- 2. 暫時禁用 RLS
ALTER TABLE backpack_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 3. 暫時修改外鍵約束為 DEFERRABLE
ALTER TABLE backpack_items DROP CONSTRAINT IF EXISTS backpack_items_user_id_fkey;
ALTER TABLE backpack_items ADD CONSTRAINT backpack_items_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) 
  DEFERRABLE INITIALLY DEFERRED;

-- 4. 建立一個測試用的 profile（如果不存在）
INSERT INTO profiles (id, username, xp, coins, streak)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo_user',
  0,
  0,
  0
) ON CONFLICT (id) DO NOTHING;

-- 5. 重新啟用 RLS（可選，用於生產環境）
-- ALTER TABLE backpack_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
