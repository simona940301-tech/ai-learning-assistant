import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkExactMatch() {
  const testUniversity = '國立台灣大學'
  const testDepartment = '資訊工程學系'

  console.log('🔍 檢查精確匹配:')
  console.log(`   大學: "${testUniversity}"`)
  console.log(`   科系: "${testDepartment}"\n`)

  // 1. 使用 eq 查詢
  const { data: exactMatch, error: exactError } = await supabase
    .from('department_requirements')
    .select('*')
    .eq('university_name', testUniversity)
    .eq('department_name', testDepartment)

  console.log('使用 eq 查詢:')
  if (exactError) {
    console.log(`   ❌ 錯誤:`, exactError)
  } else {
    console.log(`   找到 ${exactMatch?.length || 0} 筆資料`)
    if (exactMatch && exactMatch.length > 0) {
      exactMatch.forEach(d => {
        console.log(`   - "${d.university_name}" | "${d.department_name}"`)
        console.log(`     英文要求: ${d.requirement_english} (${d.score_english})`)
      })
    }
  }

  // 2. 檢查資料庫中的實際值
  console.log('\n\n📋 資料庫中台大的科系（前5個）:')
  const { data: ntuDepts } = await supabase
    .from('department_requirements')
    .select('university_name, department_name')
    .ilike('university_name', '%台灣大學%')
    .limit(5)

  ntuDepts?.forEach(d => {
    console.log(`   大學: [${d.university_name}] (length: ${d.university_name?.length})`)
    console.log(`   科系: [${d.department_name}] (length: ${d.department_name?.length})`)
    console.log()
  })

  // 3. 檢查 profiles 表中的值
  console.log('\n📋 Profiles 表中的值:')
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_university, target_department')
    .eq('email', 'simona940301@gmail.com')
    .single()

  if (profile) {
    console.log(`   大學: [${profile.target_university}] (length: ${profile.target_university?.length})`)
    console.log(`   科系: [${profile.target_department}] (length: ${profile.target_department?.length})`)
  }
}

checkExactMatch().then(() => process.exit(0))
