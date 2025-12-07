/**
 * Ready Score 完整流程測試腳本
 *
 * 測試從 onboarding 到 Ready Score 計算的完整流程
 */

import { createClient } from '@supabase/supabase-js'

// 從環境變數載入 Supabase 設定
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testReadyScoreFlow() {
  console.log('🧪 開始測試 Ready Score 完整流程...\n')

  // 1. 檢查 department_requirements 表是否有資料
  console.log('📊 Step 1: 檢查 department_requirements 表...')
  const { data: deptReqs, error: deptError } = await supabase
    .from('department_requirements')
    .select('university_name, department_name, score_english, requirement_english')
    .limit(5)

  if (deptError) {
    console.error('❌ 查詢失敗:', deptError)
    return
  }

  if (!deptReqs || deptReqs.length === 0) {
    console.error('⚠️  department_requirements 表沒有資料！請先匯入資料。')
    return
  }

  console.log(`✅ 找到 ${deptReqs.length} 筆科系資料（範例）:`)
  deptReqs.forEach(dept => {
    console.log(`   - ${dept.university_name} ${dept.department_name}`)
    console.log(`     英文要求: ${dept.requirement_english || dept.score_english || '未設定'}`)
  })
  console.log()

  // 2. 檢查是否有使用者設定了目標學校
  console.log('👤 Step 2: 檢查使用者 profiles...')
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, target_university, target_department, mock_exam_level')
    .not('target_university', 'is', null)
    .limit(3)

  if (profileError) {
    console.error('❌ 查詢失敗:', profileError)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('⚠️  目前沒有使用者設定目標學校。請完成 onboarding 流程。')
    console.log()
  } else {
    console.log(`✅ 找到 ${profiles.length} 位使用者已設定目標學校:`)
    profiles.forEach(profile => {
      console.log(`   - ${profile.email}`)
      console.log(`     目標: ${profile.target_university} ${profile.target_department}`)
      console.log(`     模考級分: ${profile.mock_exam_level || '未設定'}`)
    })
    console.log()
  }

  // 3. 測試 Ready Score 計算邏輯
  console.log('🎯 Step 3: 測試 Ready Score 計算邏輯...')

  if (profiles && profiles.length > 0) {
    const testProfile = profiles[0]
    console.log(`\n測試使用者: ${testProfile.email}`)
    console.log(`目標學校: ${testProfile.target_university} ${testProfile.target_department}`)

    // 查詢該科系的英文要求
    const { data: deptReq, error: reqError } = await supabase
      .from('department_requirements')
      .select('score_english, requirement_english')
      .eq('university_name', testProfile.target_university)
      .eq('department_name', testProfile.target_department)
      .maybeSingle()

    if (reqError) {
      console.error('❌ 查詢科系要求失敗:', reqError)
    } else if (deptReq) {
      console.log(`\n科系英文要求:`)
      console.log(`  - 級分標準: ${deptReq.requirement_english || '未設定'}`)
      console.log(`  - 級分數值: ${deptReq.score_english || '未設定'}`)

      if (deptReq.score_english) {
        const minReadyScore = 50 + (deptReq.score_english * 3)
        console.log(`\n計算出的 minReadyScore: ${minReadyScore}`)
        console.log(`公式: 50 + (${deptReq.score_english} × 3) = ${minReadyScore}`)
      }
    } else {
      console.log(`⚠️  找不到該科系的入學要求資料`)
    }
  }

  // 4. 檢查大學列表的唯一性
  console.log('\n\n🏫 Step 4: 檢查大學列表...')
  const { data: allDepts, error: allDeptsError } = await supabase
    .from('department_requirements')
    .select('university_name, department_name')

  if (allDeptsError) {
    console.error('❌ 查詢失敗:', allDeptsError)
    return
  }

  if (allDepts) {
    const uniqueUniversities = Array.from(
      new Set(allDepts.map(d => d.university_name))
    ).sort()

    console.log(`✅ 共有 ${uniqueUniversities.length} 所大學`)
    console.log(`✅ 共有 ${allDepts.length} 個科系`)

    // 顯示前 10 所大學
    console.log(`\n前 10 所大學:`)
    uniqueUniversities.slice(0, 10).forEach((uni, idx) => {
      const deptCount = allDepts.filter(d => d.university_name === uni).length
      console.log(`   ${idx + 1}. ${uni} (${deptCount} 個科系)`)
    })
  }

  console.log('\n\n✅ 測試完成！')
  console.log('\n下一步:')
  console.log('1. 如果 department_requirements 表沒有資料，請先匯入資料')
  console.log('2. 測試 onboarding 流程: 訪問 /onboarding/goal')
  console.log('3. 選擇大學和科系，完成 onboarding')
  console.log('4. 測試 Ready Score API: 訪問 /api/profile/dream-school-progress')
  console.log('5. 測試設定頁面: 訪問 /profile/settings')
}

// 執行測試
testReadyScoreFlow()
  .then(() => {
    console.log('\n👋 測試腳本執行完畢')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 測試失敗:', error)
    process.exit(1)
  })
