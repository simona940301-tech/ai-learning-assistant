/**
 * Check User Profile Data
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserProfile() {
  console.log('🔍 Checking User Profile Data\n')

  try {
    // Find user by email
    const userEmail = 'simona940301@gmail.com'

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', userEmail)
      .single()

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    if (!profile) {
      console.log('❌ No profile found for', userEmail)
      return
    }

    console.log('✅ Profile found:')
    console.log('   Email:', profile.email)
    console.log('   Username:', profile.username || '(empty)')
    console.log('   Display Name:', profile.display_name || '(empty)')
    console.log('   Full Name:', profile.full_name || '(empty)')
    console.log('   Avatar URL:', profile.avatar_url || '(empty)')
    console.log('   Bio:', profile.bio || '(empty)')
    console.log('')

    // Show priority order
    const displayName =
      profile.display_name ||
      profile.full_name ||
      profile.username ||
      userEmail.split('@')[0] ||
      '使用者'

    console.log('📋 Display Name Priority:')
    console.log(`   1. display_name: ${profile.display_name ? '✓' : '✗'} "${profile.display_name || ''}"`)
    console.log(`   2. full_name: ${profile.full_name ? '✓' : '✗'} "${profile.full_name || ''}"`)
    console.log(`   3. username: ${profile.username ? '✓' : '✗'} "${profile.username || ''}"`)
    console.log(`   4. email prefix: ✓ "${userEmail.split('@')[0]}"`)
    console.log('')
    console.log(`   → Final Display Name: "${displayName}"`)
    console.log('')

    // Suggest fix
    if (!profile.display_name && profile.username !== '陳沛樺') {
      console.log('💡 Suggested Fix:')
      console.log('   Update display_name to "陳沛樺"')
      console.log('')
      console.log('   SQL Command:')
      console.log(`   UPDATE profiles SET display_name = '陳沛樺' WHERE email = '${userEmail}';`)
    }

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkUserProfile()
