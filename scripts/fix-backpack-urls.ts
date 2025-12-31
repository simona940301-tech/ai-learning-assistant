/**
 * Fix Backpack File URLs Migration Script
 *
 * 問題：早期版本的 backpack upload API 在 file_url 中儲存了錯誤的路徑
 * 包含重複的 "backpack_files/backpack_files/" 前綴
 *
 * 此腳本會：
 * 1. 檢查所有 backpack_items 的 file_url
 * 2. 識別包含重複前綴的 URL
 * 3. 修正這些 URL
 * 4. 報告修復結果
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl)
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey)
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixBackpackUrls() {
  console.log('🔍 Scanning backpack_items for malformed URLs...\n')

  // 1. Fetch all backpack items with file_url
  const { data: items, error: fetchError } = await supabase
    .from('backpack_items')
    .select('id, title, file_url, user_id')
    .not('file_url', 'is', null)

  if (fetchError) {
    console.error('❌ Error fetching items:', fetchError)
    return
  }

  console.log(`📊 Found ${items.length} items with file_url\n`)

  // 2. Identify malformed URLs
  const malformedItems = items.filter((item) =>
    item.file_url?.includes('/backpack_files/backpack_files/')
  )

  if (malformedItems.length === 0) {
    console.log('✅ No malformed URLs found! All URLs are correct.\n')
    return
  }

  console.log(`⚠️  Found ${malformedItems.length} items with malformed URLs:\n`)

  // 3. Show preview
  malformedItems.slice(0, 5).forEach((item, idx) => {
    const oldUrl = item.file_url!
    const newUrl = oldUrl.replace('/backpack_files/backpack_files/', '/backpack_files/')
    console.log(`${idx + 1}. ${item.title}`)
    console.log(`   Old: ${oldUrl}`)
    console.log(`   New: ${newUrl}\n`)
  })

  if (malformedItems.length > 5) {
    console.log(`   ... and ${malformedItems.length - 5} more\n`)
  }

  // 4. Fix URLs
  console.log('🔧 Fixing malformed URLs...\n')

  let fixed = 0
  let failed = 0

  for (const item of malformedItems) {
    const oldUrl = item.file_url!
    const newUrl = oldUrl.replace('/backpack_files/backpack_files/', '/backpack_files/')

    const { error: updateError } = await supabase
      .from('backpack_items')
      .update({ file_url: newUrl })
      .eq('id', item.id)

    if (updateError) {
      console.error(`❌ Failed to update item ${item.id}:`, updateError.message)
      failed++
    } else {
      fixed++
    }
  }

  console.log('\n📊 Results:')
  console.log(`   ✅ Fixed: ${fixed}`)
  console.log(`   ❌ Failed: ${failed}`)
  console.log(`   📝 Total: ${malformedItems.length}\n`)

  // 5. Verify storage files exist
  console.log('🔍 Verifying storage files...\n')

  const { data: storageFiles, error: storageError } = await supabase.storage
    .from('backpack_files')
    .list()

  if (storageError) {
    console.error('❌ Error listing storage files:', storageError)
    return
  }

  console.log(`📦 Storage contains ${storageFiles?.length || 0} files/folders\n`)

  // 6. Check for orphaned database records
  console.log('🔍 Checking for orphaned database records...\n')

  const { data: allItems, error: allItemsError } = await supabase
    .from('backpack_items')
    .select('id, title, file_url, user_id, created_at')
    .not('file_url', 'is', null)
    .order('created_at', { ascending: false })

  if (allItemsError) {
    console.error('❌ Error fetching all items:', allItemsError)
    return
  }

  console.log(`📊 Checking ${allItems.length} items against storage...\n`)

  let accessible = 0
  let inaccessible = 0

  for (const item of allItems.slice(0, 10)) {
    // Check first 10 only for performance
    try {
      const response = await fetch(item.file_url!, { method: 'HEAD' })
      if (response.ok) {
        accessible++
      } else {
        inaccessible++
        console.log(`⚠️  Inaccessible: ${item.title} (${response.status})`)
        console.log(`   URL: ${item.file_url}`)
        console.log(`   Created: ${item.created_at}\n`)
      }
    } catch (err) {
      inaccessible++
      console.log(`❌ Error checking: ${item.title}`)
      console.log(`   ${err}\n`)
    }
  }

  console.log('\n📊 Accessibility Check (first 10 items):')
  console.log(`   ✅ Accessible: ${accessible}`)
  console.log(`   ❌ Inaccessible: ${inaccessible}\n`)

  console.log('✅ Migration complete!\n')
}

// Run the migration
fixBackpackUrls().catch((err) => {
  console.error('❌ Fatal error:', err)
  process.exit(1)
})
