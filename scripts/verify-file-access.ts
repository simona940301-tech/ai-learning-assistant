/**
 * Verify File Access
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyAccess() {
  console.log('🔍 Verifying file access...\n')

  const { data: items, error } = await supabase
    .from('backpack_items')
    .select('id, title, file_url')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error)
    return
  }

  console.log(`📊 Testing ${items.length} files:\n`)

  let accessible = 0
  let inaccessible = 0

  for (const item of items) {
    try {
      const response = await fetch(item.file_url!, { method: 'HEAD' })
      if (response.ok) {
        console.log(`✅ ${item.title}`)
        accessible++
      } else {
        console.log(`❌ ${item.title} (HTTP ${response.status})`)
        console.log(`   URL: ${item.file_url}\n`)
        inaccessible++
      }
    } catch (err) {
      console.log(`❌ ${item.title} (Network error)`)
      console.log(`   ${err}\n`)
      inaccessible++
    }
  }

  console.log(`\n📊 Results:`)
  console.log(`   ✅ Accessible: ${accessible}`)
  console.log(`   ❌ Inaccessible: ${inaccessible}`)
  console.log(`   📝 Total: ${items.length}\n`)

  if (inaccessible === 0) {
    console.log('🎉 All files are accessible!\n')
  } else {
    console.log(`⚠️  ${inaccessible} files are inaccessible\n`)
  }
}

verifyAccess().catch(console.error)
