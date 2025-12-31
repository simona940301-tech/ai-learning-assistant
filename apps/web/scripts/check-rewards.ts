/**
 * Check if rewards (coins, food bowls, xp) are being updated correctly
 * Run with: npx tsx apps/web/scripts/check-rewards.ts <user_id>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkRewards(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Checking rewards for user:', userId)

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, xp, level, coins, chick_food_bowls, chick_hunger, total_matches, total_wins, last_battle_at')
        .eq('id', userId)
        .single()

    if (error) {
        console.error('❌ Error fetching profile:', error)
        return
    }

    if (!profile) {
        console.log('❌ Profile not found')
        return
    }

    console.log('\n✅ Current Profile Rewards:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('💰 Coins:', profile.coins)
    console.log('🍚 Food Bowls:', profile.chick_food_bowls)
    console.log('⭐ XP:', profile.xp)
    console.log('📊 Level:', profile.level)
    console.log('🐥 Chick Hunger:', profile.chick_hunger)
    console.log('🎮 Total Matches:', profile.total_matches)
    console.log('🏆 Total Wins:', profile.total_wins)
    console.log('⏰ Last Battle:', profile.last_battle_at || 'Never')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    // Check if columns exist and have proper types
    const columnChecks = [
        { name: 'coins', value: profile.coins, expected: 'number' },
        { name: 'chick_food_bowls', value: profile.chick_food_bowls, expected: 'number' },
        { name: 'xp', value: profile.xp, expected: 'number' },
    ]

    console.log('\n🔍 Column Type Checks:')
    for (const check of columnChecks) {
        const actualType = typeof check.value
        const isCorrect = actualType === check.expected && check.value !== null && check.value !== undefined
        const status = isCorrect ? '✅' : '❌'
        console.log(`${status} ${check.name}: ${check.value} (type: ${actualType}, expected: ${check.expected})`)
    }
}

const userId = process.argv[2]
if (!userId) {
    console.error('Usage: npx tsx apps/web/scripts/check-rewards.ts <user_id>')
    process.exit(1)
}

checkRewards(userId).then(() => process.exit(0))
