/**
 * Test Storage Access Methods
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testAccess() {
  const testPath = 'b34075cd-d271-4f20-ab9a-cdaa25836da1/1764652707895-_2.pdf'

  console.log('🧪 Testing different access methods...\n')

  // Method 1: Public URL
  const { data: publicUrlData } = supabase.storage
    .from('backpack_files')
    .getPublicUrl(testPath)

  console.log('1️⃣ Public URL:')
  console.log(`   ${publicUrlData.publicUrl}`)

  try {
    const response = await fetch(publicUrlData.publicUrl, { method: 'HEAD' })
    console.log(`   Status: ${response.status} ${response.statusText}`)
    console.log(`   Headers:`, Object.fromEntries(response.headers.entries()))
  } catch (err) {
    console.log(`   Error: ${err}`)
  }

  console.log('\n2️⃣ Signed URL:')
  const { data: signedUrlData, error: signedError } = await supabase.storage
    .from('backpack_files')
    .createSignedUrl(testPath, 60)

  if (signedError) {
    console.log(`   ❌ Error: ${signedError.message}`)
  } else {
    console.log(`   ${signedUrlData?.signedUrl}`)
    try {
      const response = await fetch(signedUrlData!.signedUrl, { method: 'HEAD' })
      console.log(`   Status: ${response.status} ${response.statusText}`)
    } catch (err) {
      console.log(`   Error: ${err}`)
    }
  }

  console.log('\n3️⃣ Direct Download:')
  const { data: downloadData, error: downloadError } = await supabase.storage
    .from('backpack_files')
    .download(testPath)

  if (downloadError) {
    console.log(`   ❌ Error: ${downloadError.message}`)
  } else {
    console.log(`   ✅ Downloaded: ${downloadData?.size} bytes`)
  }

  console.log('\n4️⃣ Check Bucket Info:')
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    console.log(`   ❌ Error: ${bucketsError.message}`)
  } else {
    const bucket = buckets.find((b) => b.name === 'backpack_files')
    console.log(`   Bucket: ${bucket?.name}`)
    console.log(`   Public: ${bucket?.public}`)
    console.log(`   File Size Limit: ${bucket?.file_size_limit}`)
    console.log(`   Allowed MIME types: ${bucket?.allowed_mime_types?.join(', ') || 'All'}`)
  }
}

testAccess().catch(console.error)
