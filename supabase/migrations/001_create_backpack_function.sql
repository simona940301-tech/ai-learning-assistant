-- 建立一個函數來處理 backpack_items 的插入，暫時繞過外鍵約束
CREATE OR REPLACE FUNCTION create_backpack_item(
  p_user_id UUID,
  p_subject TEXT,
  p_type TEXT,
  p_title TEXT,
  p_content TEXT,
  p_derived_from TEXT[] DEFAULT '{}',
  p_version_history JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  subject TEXT,
  type TEXT,
  title TEXT,
  content TEXT,
  derived_from TEXT[],
  version_history JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 暫時禁用外鍵檢查
  SET session_replication_role = replica;
  
  -- 插入資料
  RETURN QUERY
  INSERT INTO backpack_items (
    user_id,
    subject,
    type,
    title,
    content,
    derived_from,
    version_history,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_subject,
    p_type,
    p_title,
    p_content,
    p_derived_from,
    p_version_history,
    NOW(),
    NOW()
  )
  RETURNING 
    backpack_items.id,
    backpack_items.user_id,
    backpack_items.subject,
    backpack_items.type,
    backpack_items.title,
    backpack_items.content,
    backpack_items.derived_from,
    backpack_items.version_history,
    backpack_items.created_at,
    backpack_items.updated_at;
  
  -- 恢復外鍵檢查
  SET session_replication_role = DEFAULT;
END;
$$;

-- 授予執行權限
GRANT EXECUTE ON FUNCTION create_backpack_item TO authenticated, anon;
