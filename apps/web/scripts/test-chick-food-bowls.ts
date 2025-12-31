/**
 * Test script to verify chick food bowls are being updated correctly after PVE battles
 * Run with: npx tsx apps/web/scripts/test-chick-food-bowls.ts <user_id>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function testChickFoodBowls(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Testing chick food bowls for user:', userId)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    // 1. Check current state
    const { data: beforeProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('chick_food_bowls, chick_hunger, total_matches, total_wins')
        .eq('id', userId)
        .single()

    if (fetchError || !beforeProfile) {
        console.error('❌ Error fetching profile:', fetchError)
        return
    }

    console.log('📊 Current State:')
    console.log('  🍚 Food Bowls:', beforeProfile.chick_food_bowls)
    console.log('  🐥 Hunger:', beforeProfile.chick_hunger)
    console.log('  🎮 Total Matches:', beforeProfile.total_matches)
    console.log('  🏆 Total Wins:', beforeProfile.total_wins)
    console.log()

    // 2. Simulate battle reward (manually call the function)
    console.log('🧪 Testing grantBattleFoodReward function...')

    try {
        const { grantBattleFoodReward } = await import('../lib/chick/rewards')

        // Test win scenario (+3 bowls)
        console.log('  Testing WIN scenario (+3 bowls)...')
        const winResult = await grantBattleFoodReward(supabase, userId, true)
        console.log('  Result:', winResult)

        if (winResult.success) {
            console.log('  ✅ Win reward granted successfully')
        } else {
            console.log('  ❌ Win reward failed')
        }
    } catch (err) {
        console.error('  ❌ Error calling grantBattleFoodReward:', err)
    }

    console.log()

    // 3. Check updated state
    const { data: afterProfile, error: verifyError } = await supabase
        .from('profiles')
        .select('chick_food_bowls, chick_hunger')
        .eq('id', userId)
        .single()

    if (verifyError || !afterProfile) {
        console.error('❌ Error verifying profile:', verifyError)
        return
    }

    console.log('📊 Updated State:')
    console.log('  🍚 Food Bowls:', afterProfile.chick_food_bowls)
    console.log('  🐥 Hunger:', afterProfile.chick_hunger)
    console.log()

    // 4. Verify the change
    const expectedBowls = (beforeProfile.chick_food_bowls || 0) + 3
    const actualBowls = afterProfile.chick_food_bowls || 0

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎯 Verification:')
    console.log('  Expected:', expectedBowls, 'bowls')
    console.log('  Actual:', actualBowls, 'bowls')

    if (actualBowls === expectedBowls) {
        console.log('  ✅✅✅ FOOD BOWLS UPDATE SUCCESSFUL!')
    } else {
        console.log('  ❌❌❌ FOOD BOWLS UPDATE FAILED!')
        console.log('  Difference:', actualBowls - expectedBowls)
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

const userId = process.argv[2]
if (!userId) {
    console.error('Usage: npx tsx apps/web/scripts/test-chick-food-bowls.ts <user_id>')
    process.exit(1)
}

testChickFoodBowls(userId).then(() => process.exit(0))
