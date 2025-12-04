/**
 * Test Profile API Response
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProfileAPI() {
  console.log('🔍 Testing Profile API Response\n')

  try {
    const userEmail = 'simona940301@gmail.com'

    // Get auth user first
    const { data: authData } = await supabase.auth.admin.listUsers()
    const authUser = authData.users.find(u => u.email === userEmail)

    if (!authUser) {
      console.error('❌ No auth user found')
      return
    }

    console.log('✅ Auth User ID:', authUser.id)
    console.log('')

    // Simulate what the API does
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (error) {
      console.error('❌ Query Error:', error)
      return
    }

    if (!profile) {
      console.error('❌ No profile found')
      return
    }

    console.log('✅ Profile Data from Database:')
    console.log('   id:', profile.id)
    console.log('   username:', profile.username)
    console.log('   display_name:', profile.display_name)
    console.log('   full_name:', profile.full_name)
    console.log('   avatar_url:', profile.avatar_url)
    console.log('   bio:', profile.bio)
    console.log('   coins:', profile.coins)
    console.log('   streak:', profile.streak)
    console.log('')

    // Show what API would return
    console.log('📤 What API Should Return:')
    const apiResponse = {
      success: true,
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        xp: profile.xp ?? 0,
        coins: profile.coins,
        streak: profile.streak,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      }
    }
    console.log(JSON.stringify(apiResponse, null, 2))

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testProfileAPI()
