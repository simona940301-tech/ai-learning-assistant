/**
 * 遷移使用者的大學科系資料
 *
 * 將舊的種子資料（來自 taiwan-universities.ts）
 * 更新為 department_requirements 表中的真實資料
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 映射表：舊名稱 -> 新名稱（從 department_requirements）
const UNIVERSITY_MAPPING: Record<string, string> = {
  // 如果舊名稱和新名稱一樣，就不需要映射
  // 這裡只列出需要修正的
}

const DEPARTMENT_MAPPING: Record<string, string> = {
  // 例如：
  // '資訊工程系': '資訊工程學系',
  // '電機工程系': '電機工程學系',
}

async function migrateUserUniversities() {
  console.log('🔄 開始遷移使用者的大學科系資料...\n')

  // 1. 查詢所有有設定目標學校的使用者
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, target_university, target_department')
    .not('target_university', 'is', null)

  if (profileError) {
    console.error('❌ 查詢 profiles 失敗:', profileError)
    return
  }

  if (!profiles || profiles.length === 0) {
    console.log('✅ 沒有需要遷移的使用者資料')
    return
  }

  console.log(`📊 找到 ${profiles.length} 位使用者需要檢查:\n`)

  let updatedCount = 0
  let validCount = 0
  let invalidCount = 0

  for (const profile of profiles) {
    const university = profile.target_university || ''
    const department = profile.target_department || ''

    console.log(`👤 ${profile.email}`)
    console.log(`   目前設定: ${university} - ${department}`)

    // 跳過「摸索中」的使用者
    if (university === '摸索中' || department === '摸索中') {
      console.log(`   ⏭️  跳過（使用者選擇摸索中）\n`)
      validCount++
      continue
    }

    // 檢查資料庫中是否存在這個科系
    const { data: deptReq, error: deptError } = await supabase
      .from('department_requirements')
      .select('id, university_name, department_name, score_english, requirement_english')
      .eq('university_name', university)
      .eq('department_name', department)
      .maybeSingle()

    if (deptError) {
      console.error(`   ❌ 查詢失敗:`, deptError.message)
      invalidCount++
      continue
    }

    if (deptReq) {
      // 資料正確，不需要更新
      console.log(`   ✅ 資料正確（${deptReq.requirement_english || deptReq.score_english}）\n`)
      validCount++
    } else {
      // 資料不存在，嘗試尋找相似的科系
      console.log(`   ⚠️  在 department_requirements 中找不到此科系`)

      // 嘗試模糊搜尋大學
      const { data: similarUniversities } = await supabase
        .from('department_requirements')
        .select('university_name')
        .ilike('university_name', `%${university}%`)
        .limit(3)

      if (similarUniversities && similarUniversities.length > 0) {
        console.log(`   💡 相似的大學:`)
        similarUniversities.forEach(u => console.log(`      - ${u.university_name}`))
      }

      // 嘗試模糊搜尋科系
      const { data: similarDepartments } = await supabase
        .from('department_requirements')
        .select('university_name, department_name')
        .ilike('department_name', `%${department}%`)
        .limit(3)

      if (similarDepartments && similarDepartments.length > 0) {
        console.log(`   💡 相似的科系:`)
        similarDepartments.forEach(d =>
          console.log(`      - ${d.university_name} ${d.department_name}`)
        )
      }

      console.log(`   ℹ️  請手動更新此使用者的資料\n`)
      invalidCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 遷移結果統計:')
  console.log(`   ✅ 資料正確: ${validCount}`)
  console.log(`   ⚠️  需要手動修正: ${invalidCount}`)
  console.log(`   📝 已更新: ${updatedCount}`)
  console.log('='.repeat(60) + '\n')

  if (invalidCount > 0) {
    console.log('💡 建議:')
    console.log('1. 檢查上方列出的無效資料')
    console.log('2. 使用相似科系建議進行手動更新')
    console.log('3. 或者請使用者重新在 /profile/settings 中選擇科系')
  }
}

// 執行遷移
migrateUserUniversities()
  .then(() => {
    console.log('\n✅ 遷移檢查完成')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 遷移失敗:', error)
    process.exit(1)
  })
