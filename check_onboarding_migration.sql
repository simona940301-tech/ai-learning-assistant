-- =============================================
-- Onboarding Migration 狀態檢查腳本
-- =============================================

-- 1. 檢查表格是否存在
SELECT '檢查表格存在性:' as section;
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('onboarding_sessions', 'onboarding_questions', 'scorecard_questions', 'onboarding_task_configs') 
    THEN '✅ 存在' 
    ELSE '❌ 缺失' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('onboarding_sessions', 'onboarding_questions', 'scorecard_questions', 'onboarding_task_configs')
ORDER BY table_name;

-- 2. 檢查 RLS 是否啟用
SELECT '檢查 RLS 權限:' as section;
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity = true THEN '✅ 已啟用'
    ELSE '❌ 未啟用'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE 'onboarding%'
ORDER BY tablename;

-- 3. 檢查索引是否存在
SELECT '檢查索引存在性:' as section;
SELECT 
  indexname,
  CASE 
    WHEN indexname IN (
      'idx_onboarding_sessions_user', 'idx_onboarding_sessions_status', 'idx_onboarding_sessions_step',
      'idx_onboarding_questions_difficulty', 'idx_onboarding_questions_active', 'idx_onboarding_questions_subject',
      'idx_scorecard_questions_section', 'idx_scorecard_questions_active',
      'idx_onboarding_task_configs_user'
    ) THEN '✅ 存在'
    ELSE '❓ 其他索引'
  END as status
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename LIKE 'onboarding%'
ORDER BY indexname;

-- 4. 檢查函數是否存在
SELECT '檢查函數存在性:' as section;
SELECT 
  routine_name,
  CASE 
    WHEN routine_name IN ('get_onboarding_question', 'generate_task_config_from_onboarding', 'complete_onboarding')
    THEN '✅ 存在'
    ELSE '❓ 其他函數'
  END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%onboarding%'
ORDER BY routine_name;

-- 5. 檢查題目數量
SELECT '檢查題目數量:' as section;
SELECT 
  'onboarding_questions' as table_name,
  COUNT(*) as total_questions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_questions,
  COUNT(CASE WHEN difficulty_level = 1 THEN 1 END) as difficulty_1,
  COUNT(CASE WHEN difficulty_level = 2 THEN 1 END) as difficulty_2,
  COUNT(CASE WHEN difficulty_level = 3 THEN 1 END) as difficulty_3
FROM onboarding_questions;
