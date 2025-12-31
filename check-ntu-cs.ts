import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkNTU() {
  const { data, error } = await supabase
    .from('department_requirements')
    .select('university_name, department_name, score_english, requirement_english')
    .ilike('university_name', '%台灣大學%')
    .ilike('department_name', '%資訊%')

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('🔍 台灣大學 - 資訊相關科系:')
  data?.forEach(dept => {
    console.log(`   ${dept.university_name} > ${dept.department_name}`)
    console.log(`   英文: ${dept.requirement_english || dept.score_english}`)
    console.log()
  })
}

checkNTU().then(() => process.exit(0))
