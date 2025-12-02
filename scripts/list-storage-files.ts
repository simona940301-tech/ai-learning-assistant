/**
 * List all files in Supabase Storage
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function listStorageFiles(path = '', depth = 0) {
  const indent = '  '.repeat(depth)

  const { data: files, error } = await supabase.storage
    .from('backpack_files')
    .list(path, {
      limit: 100,
      offset: 0,
    })

  if (error) {
    console.error(`${indent}❌ Error listing ${path}:`, error.message)
    return
  }

  if (!files || files.length === 0) {
    console.log(`${indent}📁 ${path || '/'} (empty)`)
    return
  }

  console.log(`${indent}📁 ${path || '/'} (${files.length} items):`)

  for (const file of files) {
    const fullPath = path ? `${path}/${file.name}` : file.name
    const icon = file.id ? '📄' : '📁'
    const size = file.metadata?.size ? ` (${(file.metadata.size / 1024).toFixed(1)} KB)` : ''

    console.log(`${indent}  ${icon} ${file.name}${size}`)

    // If it's a folder, recurse
    if (!file.id && depth < 3) {
      await listStorageFiles(fullPath, depth + 1)
    }
  }
}

async function main() {
  console.log('🔍 Listing all files in backpack_files bucket...\n')
  await listStorageFiles()
  console.log('\n✅ Done!')
}

main().catch(console.error)
