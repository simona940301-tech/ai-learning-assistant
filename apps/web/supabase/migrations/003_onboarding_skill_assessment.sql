-- ============================================
-- Week 1: Onboarding 數據集成 Migration
-- ============================================
-- 擴展 profiles 表，新增 initial_skill_assessment 和 skill_mastery_json 欄位
-- 用於支持 Onboarding 初始評估和 PVE 智能訓練

-- 1. 新增 initial_skill_assessment 欄位（JSONB）
-- 儲存用戶在 Onboarding 流程中的初始知識點掌握度
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS initial_skill_assessment JSONB DEFAULT NULL;

-- 2. 新增 skill_mastery_json 欄位（JSONB）
-- 儲存用戶的知識點掌握度（動態更新）
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS skill_mastery_json JSONB DEFAULT '{}'::jsonb;

-- 3. 創建索引以優化 JSONB 查詢性能
CREATE INDEX IF NOT EXISTS idx_profiles_skill_mastery_json 
ON profiles USING GIN (skill_mastery_json);

CREATE INDEX IF NOT EXISTS idx_profiles_initial_skill_assessment 
ON profiles USING GIN (initial_skill_assessment);

-- 4. 創建函數：從 initial_skill_assessment 初始化 skill_mastery_json
CREATE OR REPLACE FUNCTION initialize_skill_mastery_from_onboarding()
RETURNS TRIGGER AS $$
BEGIN
    -- 如果 skill_mastery_json 為空且 initial_skill_assessment 存在，則初始化
    IF (NEW.skill_mastery_json IS NULL OR NEW.skill_mastery_json = '{}'::jsonb) 
       AND NEW.initial_skill_assessment IS NOT NULL THEN
        
        -- 從 initial_skill_assessment 提取 topics 並轉換為 skill_mastery_json 格式
        -- 格式轉換：{ "EN_GRAMMAR_TENSES": 0.75 } 從 topics 數組中提取
        NEW.skill_mastery_json := (
            SELECT jsonb_object_agg(
                topic->>'id',
                (topic->>'mastery_score')::numeric
            )
            FROM jsonb_array_elements(NEW.initial_skill_assessment->'topics') AS topic
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 創建觸發器：在插入或更新 profiles 時自動初始化 skill_mastery_json
DROP TRIGGER IF EXISTS trigger_initialize_skill_mastery ON profiles;
CREATE TRIGGER trigger_initialize_skill_mastery
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION initialize_skill_mastery_from_onboarding();

-- 6. 創建函數：更新 skill_mastery_json（用於 PVE/PVP 結果數據回流）
CREATE OR REPLACE FUNCTION update_skill_mastery(
    p_user_id UUID,
    p_skill_id TEXT,
    p_mastery_score NUMERIC
)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET skill_mastery_json = COALESCE(skill_mastery_json, '{}'::jsonb) || 
        jsonb_build_object(p_skill_id, p_mastery_score),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. 添加註釋說明欄位用途
COMMENT ON COLUMN profiles.initial_skill_assessment IS 
'用戶在 Onboarding 流程中的初始知識點掌握度評估結果（JSONB）';

COMMENT ON COLUMN profiles.skill_mastery_json IS 
'用戶的知識點掌握度（動態更新，用於 PVE 智能訓練和匹配）';

