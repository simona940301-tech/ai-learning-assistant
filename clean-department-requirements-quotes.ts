/**
 * 清理 department_requirements 表中的引號
 *
 * 資料匯入時可能包含了額外的引號，需要移除
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 請設定 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanQuotes() {
  console.log('🧹 開始清理 department_requirements 表中的引號...\n')

  // 1. 檢查有問題的資料
  const { data: allDepts, error: fetchError } = await supabase
    .from('department_requirements')
    .select('id, university_name, department_name')

  if (fetchError) {
    console.error('❌ 查詢失敗:', fetchError)
    return
  }

  if (!allDepts) {
    console.log('⚠️  沒有資料')
    return
  }

  console.log(`📊 共有 ${allDepts.length} 筆資料需要檢查\n`)

  let updatedCount = 0
  let cleanCount = 0

  for (const dept of allDepts) {
    const hasQuotes =
      dept.university_name?.startsWith('"') ||
      dept.university_name?.endsWith('"') ||
      dept.department_name?.startsWith('"') ||
      dept.department_name?.endsWith('"')

    if (hasQuotes) {
      // 移除引號
      const cleanUniversity = dept.university_name?.replace(/^"|"$/g, '') || dept.university_name
      const cleanDepartment = dept.department_name?.replace(/^"|"$/g, '') || dept.department_name

      console.log(`🔧 修正: ${dept.university_name} - ${dept.department_name}`)
      console.log(`   -> ${cleanUniversity} - ${cleanDepartment}`)

      // 更新資料庫
      const { error: updateError } = await supabase
        .from('department_requirements')
        .update({
          university_name: cleanUniversity,
          department_name: cleanDepartment,
        })
        .eq('id', dept.id)

      if (updateError) {
        console.error(`   ❌ 更新失敗:`, updateError.message)
      } else {
        console.log(`   ✅ 已更新\n`)
        updatedCount++
      }
    } else {
      cleanCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('📊 清理結果:')
  console.log(`   ✅ 已清理: ${updatedCount} 筆`)
  console.log(`   ✓  本身就乾淨: ${cleanCount} 筆`)
  console.log(`   📝 總計: ${allDepts.length} 筆`)
  console.log('='.repeat(60))
}

// 執行清理
cleanQuotes()
  .then(() => {
    console.log('\n✅ 清理完成')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n❌ 清理失敗:', error)
    process.exit(1)
  })
