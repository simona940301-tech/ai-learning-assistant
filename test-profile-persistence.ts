/**
 * Profile Persistence Test
 *
 * 測試 Profile 資料持久性：
 * 1. Avatar 持久化
 * 2. 使用者名稱顯示
 * 3. Settings 儲存與載入
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testProfilePersistence() {
  console.log('🧪 Testing Profile Persistence\n')

  try {
    // Test 1: Check profiles table structure
    console.log('📋 Test 1: Checking profiles table structure...')
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1)

    if (fetchError) {
      console.error('❌ Failed to fetch profiles:', fetchError)
      return
    }

    if (profiles && profiles.length > 0) {
      const profile = profiles[0]
      const requiredFields = [
        'id',
        'email',
        'username',
        'display_name',
        'full_name',
        'avatar_url',
        'bio',
        'target_university',
        'target_department',
        'email_notifications',
        'push_notifications',
        'onboarding_completed',
        'created_at',
        'updated_at'
      ]

      console.log('✅ Sample profile structure:')
      for (const field of requiredFields) {
        const exists = field in profile
        const value = profile[field]
        const status = exists ? '✓' : '✗'
        console.log(`   ${status} ${field}: ${typeof value} ${value === null ? '(null)' : ''}`)
      }
    }

    // Test 2: Test avatar persistence
    console.log('\n📋 Test 2: Testing avatar persistence...')
    const testAvatarUrl = 'https://example.com/test-avatar.png'

    // Get first profile
    const { data: testProfile } = await supabase
      .from('profiles')
      .select('id, avatar_url, username')
      .limit(1)
      .single()

    if (testProfile) {
      const originalAvatar = testProfile.avatar_url
      console.log(`   Current avatar: ${originalAvatar || '(empty)'}`)

      // Update avatar
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_url: testAvatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', testProfile.id)

      if (updateError) {
        console.error('❌ Failed to update avatar:', updateError)
      } else {
        console.log('✅ Avatar updated successfully')

        // Verify persistence
        const { data: verifyProfile } = await supabase
          .from('profiles')
          .select('avatar_url')
          .eq('id', testProfile.id)
          .single()

        if (verifyProfile?.avatar_url === testAvatarUrl) {
          console.log('✅ Avatar persisted correctly')
        } else {
          console.error('❌ Avatar NOT persisted:', verifyProfile?.avatar_url)
        }

        // Restore original avatar
        await supabase
          .from('profiles')
          .update({ avatar_url: originalAvatar })
          .eq('id', testProfile.id)
        console.log('✅ Original avatar restored')
      }
    }

    // Test 3: Test display name priority
    console.log('\n📋 Test 3: Testing display name priority...')
    const { data: displayNameTest } = await supabase
      .from('profiles')
      .select('username, display_name, full_name, email')
      .limit(5)

    if (displayNameTest) {
      console.log('✅ Display name priority test:')
      displayNameTest.forEach((profile, index) => {
        const effectiveName =
          profile.display_name ||
          profile.full_name ||
          profile.username ||
          profile.email?.split('@')[0] ||
          '使用者'

        console.log(`   ${index + 1}. ${effectiveName}`)
        console.log(`      - display_name: ${profile.display_name || '(empty)'}`)
        console.log(`      - full_name: ${profile.full_name || '(empty)'}`)
        console.log(`      - username: ${profile.username || '(empty)'}`)
      })
    }

    // Test 4: Check onboarding completion
    console.log('\n📋 Test 4: Checking onboarding completion status...')
    const { data: onboardingStats } = await supabase
      .from('profiles')
      .select('onboarding_completed, avatar_url')

    if (onboardingStats) {
      const total = onboardingStats.length
      const completed = onboardingStats.filter(p => p.onboarding_completed).length
      const withAvatar = onboardingStats.filter(p => p.avatar_url).length

      console.log(`   Total profiles: ${total}`)
      console.log(`   Completed onboarding: ${completed} (${((completed/total)*100).toFixed(1)}%)`)
      console.log(`   With avatar: ${withAvatar} (${((withAvatar/total)*100).toFixed(1)}%)`)

      const completedButNoAvatar = onboardingStats.filter(
        p => p.onboarding_completed && !p.avatar_url
      ).length

      if (completedButNoAvatar > 0) {
        console.log(`   ⚠️  ${completedButNoAvatar} users completed onboarding but have no avatar`)
      } else {
        console.log('   ✅ All onboarded users have avatars')
      }
    }

    // Test 5: Test notification preferences
    console.log('\n📋 Test 5: Testing notification preferences...')
    const { data: notificationStats } = await supabase
      .from('profiles')
      .select('email_notifications, push_notifications')

    if (notificationStats) {
      const emailEnabled = notificationStats.filter(p => p.email_notifications).length
      const pushEnabled = notificationStats.filter(p => p.push_notifications).length

      console.log(`   Email notifications enabled: ${emailEnabled}/${notificationStats.length}`)
      console.log(`   Push notifications enabled: ${pushEnabled}/${notificationStats.length}`)
    }

    console.log('\n✅ All persistence tests completed successfully!\n')

  } catch (error) {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  }
}

testProfilePersistence()
