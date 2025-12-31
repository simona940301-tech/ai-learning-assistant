/**
 * 診斷 Onboarding Questions 問題的腳本
 * 
 * 使用方法：
 * 1. 在瀏覽器控制台執行
 * 2. 或在 Node.js 環境中執行（需要配置環境變數）
 */

async function diagnoseOnboardingQuestions() {
  console.log('🔍 開始診斷 Onboarding Questions 問題...\n')

  // 步驟 1: 檢查 API 端點
  console.log('步驟 1: 測試 API 端點')
  console.log('─'.repeat(50))
  
  try {
    const response = await fetch('/api/onboarding/questions?difficulties=1,2,3&count=7')
    const data = await response.json()
    
    console.log('API 響應狀態:', response.status)
    console.log('API 響應數據:', data)
    
    if (data.success) {
      console.log(`✅ API 查詢成功`)
      console.log(`📊 返回題目數量: ${data.questions?.length || 0}`)
      
      if (data.questions && data.questions.length >= 7) {
        console.log('✅ 題目數量充足')
        console.log('第一題範例:', data.questions[0])
      } else {
        console.warn('⚠️ 題目數量不足 7 題')
        console.warn('這將導致使用 fallback 測試題')
      }
    } else {
      console.error('❌ API 查詢失敗')
      console.error('錯誤信息:', data.error)
    }
  } catch (error) {
    console.error('❌ API 請求失敗')
    console.error('錯誤:', error)
  }

  console.log('\n')

  // 步驟 2: 檢查數據庫（需要 Supabase 客戶端）
  console.log('步驟 2: 檢查數據庫狀態')
  console.log('─'.repeat(50))
  console.log('請在 Supabase SQL Editor 執行以下查詢：\n')
  console.log(`
-- 檢查表是否存在
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'onboarding_questions'
);

-- 檢查題目數量
SELECT 
  COUNT(*) as total_questions,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_questions,
  COUNT(CASE WHEN subject = 'english' THEN 1 END) as english_questions,
  COUNT(CASE WHEN is_active = true AND subject = 'english' THEN 1 END) as active_english_questions
FROM onboarding_questions;

-- 按難度分組
SELECT 
  difficulty_level,
  COUNT(*) as total,
  COUNT(CASE WHEN is_active = true AND subject = 'english' THEN 1 END) as active_english
FROM onboarding_questions
GROUP BY difficulty_level
ORDER BY difficulty_level;
  `)

  console.log('\n')

  // 步驟 3: 檢查導入狀態
  console.log('步驟 3: 檢查導入腳本狀態')
  console.log('─'.repeat(50))
  console.log('導入腳本位置:')
  console.log('- SQL: apps/web/db/sql/021_onboarding_seed_questions.sql')
  console.log('- API: POST /api/internal/onboarding-questions/import')
  console.log('\n如果表為空，需要執行導入。\n')

  // 步驟 4: 檢查 Challenge 頁面邏輯
  console.log('步驟 4: Challenge 頁面邏輯檢查')
  console.log('─'.repeat(50))
  console.log('挑戰頁面邏輯：')
  console.log('1. 請求 API: /api/onboarding/questions?difficulties=1,2,3&count=7')
  console.log('2. 如果 data.success && data.questions.length >= 7，使用真正題目')
  console.log('3. 否則使用 generateFallbackQuestions() 生成測試題')
  console.log('\n當前看到的「這是第 1 道測試題」表示使用了 fallback。\n')

  // 總結
  console.log('📋 問題診斷總結')
  console.log('═'.repeat(50))
  console.log('可能的原因：')
  console.log('1. onboarding_questions 表中沒有數據')
  console.log('2. API 查詢條件不匹配（is_active, subject, difficulty_level）')
  console.log('3. 數據格式不正確')
  console.log('4. RLS 權限問題')
  console.log('\n建議解決方案：')
  console.log('1. 檢查數據庫表是否有數據')
  console.log('2. 如果沒有，執行導入腳本')
  console.log('3. 如果有但查詢失敗，檢查查詢條件')
  console.log('4. 檢查 API 日誌以獲取詳細錯誤信息')
}

// 如果在瀏覽器環境，直接執行
if (typeof window !== 'undefined') {
  // 導出到全局作用域，方便在控制台調用
  ;(window as any).diagnoseOnboardingQuestions = diagnoseOnboardingQuestions
  console.log('✅ 診斷腳本已載入')
  console.log('💡 執行 diagnoseOnboardingQuestions() 開始診斷')
} else {
  // Node.js 環境
  diagnoseOnboardingQuestions().catch(console.error)
}

export { diagnoseOnboardingQuestions }

