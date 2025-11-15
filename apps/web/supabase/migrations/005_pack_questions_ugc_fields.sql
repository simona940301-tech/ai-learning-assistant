-- ============================================
-- Week 3: P9/P10 - 擴展 pack_questions 表（UGC 支持）
-- ============================================
-- 為 pack_questions 表添加 UGC 相關字段（如果表存在且字段尚未存在）

-- 檢查表是否存在，如果存在則添加字段
DO $$
BEGIN
    -- 檢查 pack_questions 表是否存在
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pack_questions'
    ) THEN
        -- 1. 添加 creator_id 字段（題目創作者）
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pack_questions' 
            AND column_name = 'creator_id'
        ) THEN
            ALTER TABLE pack_questions
            ADD COLUMN creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- 2. 添加 is_ugc 字段（是否為用戶生成內容）
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pack_questions' 
            AND column_name = 'is_ugc'
        ) THEN
            ALTER TABLE pack_questions
            ADD COLUMN is_ugc BOOLEAN DEFAULT FALSE;
        END IF;

        -- 3. 添加 deceiver_options 字段（迷惑選項，JSONB）
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'pack_questions' 
            AND column_name = 'deceiver_options'
        ) THEN
            ALTER TABLE pack_questions
            ADD COLUMN deceiver_options JSONB DEFAULT '{}'::jsonb;
        END IF;

        -- 4. 創建索引以優化 UGC 查詢
        CREATE INDEX IF NOT EXISTS idx_pack_questions_creator_id ON pack_questions(creator_id) WHERE creator_id IS NOT NULL;
        CREATE INDEX IF NOT EXISTS idx_pack_questions_is_ugc ON pack_questions(is_ugc) WHERE is_ugc = TRUE;
        CREATE INDEX IF NOT EXISTS idx_pack_questions_deceiver_options ON pack_questions USING GIN (deceiver_options);

        -- 5. 添加註釋說明
        COMMENT ON COLUMN pack_questions.creator_id IS '題目創作者 ID（UGC 題目）';
        COMMENT ON COLUMN pack_questions.is_ugc IS '是否為用戶生成內容（User Generated Content）';
        COMMENT ON COLUMN pack_questions.deceiver_options IS '迷惑選項配置（JSONB），記錄每個迷惑選項的創作者和獎勵金額';
    ELSE
        -- 表不存在，記錄警告（但不失敗）
        RAISE NOTICE 'Table pack_questions does not exist. Skipping UGC fields migration.';
    END IF;
END $$;

