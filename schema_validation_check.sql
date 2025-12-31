-- 🔍 Supabase Schema 驗證 SQL (60 張表檢查)
-- 用於驗證資料庫中應有的 60 張表是否存在

-- 創建臨時表來存儲預期的表清單
CREATE TEMP TABLE expected_tables AS
SELECT unnest(ARRAY[
    -- User & Profile Domain (8)
    'profiles', 'follows', 'user_badges', 'user_achievements',
    'battle_progression_state', 'battle_badge_definitions', 'battle_achievement_definitions', 'transactions',

    -- Questions & Packs Domain (13)
    'packs', 'pack_chapters', 'pack_questions', 'user_pack_installations',
    'seed_questions', 'question_explanations', 'ugc_questions', 'error_book',
    'user_answers', 'question_sets', 'user_question_sets', 'question_set_reviews',

    -- Battle & Progression Domain (6)
    'battle_events', 'match_history', 'match_queue', 'contract_escrows',
    'battle_chests', 'battle_streak_milestones',

    -- RAG & Files Domain (7)
    'files', 'file_pages', 'doc_chunks', 'citations', 'rag_documents',
    'file_analysis', 'exam_question_bank',

    -- Backpack & Notebook Domain (5)
    'backpack_items', 'backpack_notes', 'notebook_entries', 'ai_interactions',

    -- Missions Domain (5)
    'missions', 'user_missions', 'mission_logs', 'user_question_history', 'daily_missions',

    -- Onboarding Domain (4)
    'onboarding_sessions', 'onboarding_questions', 'scorecard_questions', 'onboarding_task_configs',

    -- Community & Store Domain (8)
    'posts', 'post_likes', 'comments', 'store_items', 'user_purchases',
    'tasks', 'class_challenges', 'class_challenge_participants',

    -- Chick, Analytics & Concepts Domain (6)
    'chick_messages', 'analytics_events', 'concepts', 'concept_edges',
    'solve_sessions', 'solve_options'
]) AS table_name;

-- 創建臨時表來存儲實際存在的表
CREATE TEMP TABLE actual_tables AS
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE';

-- 總表數檢查
SELECT
    '總表數檢查' as check_type,
    (SELECT COUNT(*) FROM expected_tables) as expected_count,
    (SELECT COUNT(*) FROM actual_tables) as actual_count,
    CASE
        WHEN (SELECT COUNT(*) FROM expected_tables) = (SELECT COUNT(*) FROM actual_tables) THEN '✅ 表數匹配'
        ELSE '❌ 表數不匹配'
    END as status;

-- 詳細的表存在檢查
SELECT
    '表存在檢查 - ' || et.table_name as check_type,
    1 as expected_count,
    CASE WHEN at.table_name IS NOT NULL THEN 1 ELSE 0 END as actual_count,
    CASE
        WHEN at.table_name IS NOT NULL THEN '✅ 存在'
        ELSE '❌ 缺失'
    END as status
FROM expected_tables et
LEFT JOIN actual_tables at ON et.table_name = at.table_name
ORDER BY check_type;

-- 顯示缺失的表
SELECT
    '缺失的表' as section,
    et.table_name as missing_table
FROM expected_tables et
LEFT JOIN actual_tables at ON et.table_name = at.table_name
WHERE at.table_name IS NULL
ORDER BY et.table_name;

-- 顯示多餘的表 (如果有的話)
SELECT
    '多餘的表' as section,
    at.table_name as extra_table
FROM actual_tables at
LEFT JOIN expected_tables et ON at.table_name = et.table_name
WHERE et.table_name IS NULL
ORDER BY at.table_name;

-- 檢查 Extensions
SELECT
    'Extensions 檢查' as check_type,
    extname as extension_name,
    CASE
        WHEN extname IN ('uuid-ossp', 'vector') THEN '✅ 已啟用'
        ELSE 'ℹ️ 已啟用'
    END as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'vector')
ORDER BY extname;

-- 檢查 RLS 狀態
SELECT
    'RLS 檢查' as check_type,
    COUNT(*) as total_tables,
    SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) as rls_enabled_count,
    CASE
        WHEN COUNT(*) = SUM(CASE WHEN rowsecurity THEN 1 ELSE 0 END) THEN '✅ 所有表都啟用 RLS'
        ELSE '❌ 部分表未啟用 RLS'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (SELECT table_name FROM expected_tables);

-- 顯示未啟用 RLS 的表
SELECT
    '未啟用 RLS 的表' as section,
    tablename as table_without_rls
FROM pg_tables
WHERE schemaname = 'public'
AND NOT rowsecurity
AND tablename IN (SELECT table_name FROM expected_tables)
ORDER BY tablename;

-- 清理臨時表
DROP TABLE IF EXISTS expected_tables;
DROP TABLE IF EXISTS actual_tables;

-- 關鍵欄位檢查範例
-- profiles 表檢查
SELECT
    '關鍵欄位檢查 - profiles' as check_type,
    column_name,
    CASE
        WHEN column_name IN ('chick_iq', 'chick_fatigue', 'chick_emotion_state', 'onboarding_completed', 'target_university') THEN '✅ 存在'
        WHEN column_name = 'focus_stats' AND data_type = 'jsonb' THEN '✅ JSONB 欄位存在'
        ELSE 'ℹ️ 其他欄位'
    END as status
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- pack_questions 表檢查
SELECT
    '關鍵欄位檢查 - pack_questions' as check_type,
    column_name,
    CASE
        WHEN column_name IN ('stem', 'choices', 'answer', 'explanation', 'is_blacklisted', 'is_ugc') THEN '✅ 存在'
        ELSE 'ℹ️ 其他欄位'
    END as status
FROM information_schema.columns
WHERE table_name = 'pack_questions'
ORDER BY ordinal_position;

-- doc_chunks 表檢查 (向量欄位)
SELECT
    '關鍵欄位檢查 - doc_chunks' as check_type,
    column_name,
    data_type,
    CASE
        WHEN column_name = 'embedding' AND data_type LIKE '%vector%' THEN '✅ 向量欄位存在'
        ELSE 'ℹ️ 其他欄位'
    END as status
FROM information_schema.columns
WHERE table_name = 'doc_chunks'
ORDER BY ordinal_position;

-- notebook_entries 表檢查
SELECT
    '關鍵欄位檢查 - notebook_entries' as check_type,
    column_name,
    data_type,
    CASE
        WHEN column_name IN ('source_type', 'subject') THEN '✅ 存在'
        WHEN column_name = 'tags' AND (data_type = 'ARRAY' OR data_type LIKE '%[]') THEN '✅ 陣列欄位存在'
        ELSE 'ℹ️ 其他欄位'
    END as status
FROM information_schema.columns
WHERE table_name = 'notebook_entries'
ORDER BY ordinal_position;
