/**
 * Migrate Storage Files to Correct Paths
 *
 * 問題：舊檔案存在 "backpack_files/backpack_files/..." 路徑
 * 需要移動到 "user_id/..." 路徑
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateFiles() {
  console.log('🔍 Scanning for files in wrong location...\n')

  // 1. List files in the wrong path
  const { data: wrongPathFiles, error: listError } = await supabase.storage
    .from('backpack_files')
    .list('backpack_files/b34075cd-d271-4f20-ab9a-cdaa25836da1', {
      limit: 100,
    })

  if (listError) {
    console.error('❌ Error listing files:', listError)
    return
  }

  if (!wrongPathFiles || wrongPathFiles.length === 0) {
    console.log('✅ No files found in wrong location!\n')
    return
  }

  console.log(`📊 Found ${wrongPathFiles.length} files in wrong location:\n`)

  const userId = 'b34075cd-d271-4f20-ab9a-cdaa25836da1'

  for (const file of wrongPathFiles) {
    const oldPath = `backpack_files/${userId}/${file.name}`
    const newPath = `${userId}/${file.name}`

    console.log(`📄 ${file.name}`)
    console.log(`   Old: ${oldPath}`)
    console.log(`   New: ${newPath}`)

    // Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('backpack_files')
      .download(oldPath)

    if (downloadError) {
      console.error(`   ❌ Download failed:`, downloadError.message)
      continue
    }

    // Upload to new location
    const { error: uploadError } = await supabase.storage
      .from('backpack_files')
      .upload(newPath, fileData, {
        contentType: file.metadata?.mimetype || 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error(`   ❌ Upload failed:`, uploadError.message)
      continue
    }

    console.log(`   ✅ Migrated successfully`)

    // Update database record
    const filename = file.name
    const newUrl = `${supabaseUrl}/storage/v1/object/public/backpack_files/${newPath}`

    const { error: updateError } = await supabase
      .from('backpack_items')
      .update({ file_url: newUrl })
      .ilike('file_url', `%${filename}`)

    if (updateError) {
      console.error(`   ⚠️  Database update failed:`, updateError.message)
    } else {
      console.log(`   ✅ Database updated`)
    }

    // Optionally delete old file
    const { error: deleteError } = await supabase.storage
      .from('backpack_files')
      .remove([oldPath])

    if (deleteError) {
      console.error(`   ⚠️  Old file deletion failed:`, deleteError.message)
    } else {
      console.log(`   ✅ Old file deleted\n`)
    }
  }

  console.log('\n✅ Migration complete!')
}

migrateFiles().catch(console.error)
