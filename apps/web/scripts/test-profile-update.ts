/**
 * Test script to verify profile update operations
 * Run with: npx tsx apps/web/scripts/test-profile-update.ts <user_id>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testProfileUpdate(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Testing profile update for user:', userId)

    // 1. Fetch current profile
    const { data: beforeProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (fetchError) {
        console.error('❌ Error fetching profile:', fetchError)
        return
    }

    if (!beforeProfile) {
        console.log('❌ Profile not found')
        return
    }

    console.log('✅ Current profile:', {
        id: beforeProfile.id,
        xp: beforeProfile.xp,
        level: beforeProfile.level,
        coins: beforeProfile.coins,
        total_matches: beforeProfile.total_matches
    })

    // 2. Try to update profile (add 100 XP and 50 coins)
    const newXp = (beforeProfile.xp || 0) + 100
    const newCoins = (beforeProfile.coins || 0) + 50
    const newMatches = (beforeProfile.total_matches || 0) + 1

    console.log('\n🔄 Attempting to update profile...')
    console.log('New values:', { xp: newXp, coins: newCoins, total_matches: newMatches })

    const { data: updatedProfile, error: updateError } = await supabase
        .from('profiles')
        .update({
            xp: newXp,
            coins: newCoins,
            total_matches: newMatches,
            updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

    if (updateError) {
        console.error('❌ Error updating profile:', updateError)
        console.error('Error details:', JSON.stringify(updateError, null, 2))
        return
    }

    if (!updatedProfile) {
        console.log('❌ Update returned no data')
        return
    }

    console.log('✅ Profile updated successfully:', {
        id: updatedProfile.id,
        xp: updatedProfile.xp,
        level: updatedProfile.level,
        coins: updatedProfile.coins,
        total_matches: updatedProfile.total_matches
    })

    // 3. Verify the update by fetching again
    console.log('\n🔍 Verifying update...')
    const { data: afterProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

    if (verifyError) {
        console.error('❌ Error verifying profile:', verifyError)
        return
    }

    console.log('✅ Verified profile:', {
        id: afterProfile.id,
        xp: afterProfile.xp,
        level: afterProfile.level,
        coins: afterProfile.coins,
        total_matches: afterProfile.total_matches
    })

    // 4. Check if values match
    if (afterProfile.xp === newXp && afterProfile.coins === newCoins) {
        console.log('\n✅✅✅ UPDATE SUCCESSFUL! Values match.')
    } else {
        console.log('\n❌❌❌ UPDATE FAILED! Values do not match.')
        console.log('Expected:', { xp: newXp, coins: newCoins })
        console.log('Got:', { xp: afterProfile.xp, coins: afterProfile.coins })
    }
}

const userId = process.argv[2]
if (!userId) {
    console.error('Usage: npx tsx apps/web/scripts/test-profile-update.ts <user_id>')
    process.exit(1)
}

testProfileUpdate(userId).then(() => process.exit(0))
