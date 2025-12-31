/**
 * Test chick status API to check foodBowlsCount
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testChickStatusAPI() {
    // Get a user ID first
    const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .single()

    if (!profile) {
        console.error('No user found')
        return
    }

    const userId = profile.id
    console.log('Testing for user:', userId)
    console.log()

    // Check database directly
    const { data: dbData } = await supabase
        .from('profiles')
        .select('chick_food_bowls')
        .eq('id', userId)
        .single()

    console.log('📊 Database Value:')
    console.log('  chick_food_bowls:', dbData?.chick_food_bowls)
    console.log()

    // Check API response
    try {
        const response = await fetch(`http://localhost:3000/api/chick/status`, {
            headers: {
                'Cookie': `sb-access-token=dummy` // This won't work without real auth
            }
        })

        if (response.ok) {
            const apiData = await response.json()
            console.log('🌐 API Response:')
            console.log('  foodBowlsCount:', apiData.foodBowlsCount)
            console.log()

            if (apiData.foodBowlsCount === dbData?.chick_food_bowls) {
                console.log('✅ API and Database match!')
            } else {
                console.log('❌ API and Database DO NOT match!')
                console.log('   Expected:', dbData?.chick_food_bowls)
                console.log('   Got:', apiData.foodBowlsCount)
            }
        } else {
            console.log('⚠️  API returned error:', response.status, response.statusText)
            console.log('   This is expected without proper authentication')
            console.log()
            console.log('💡 Solution: The frontend needs to refresh the chick status')
            console.log('   The user should:')
            console.log('   1. Refresh the page')
            console.log('   2. Or close and reopen the chick modal')
        }
    } catch (error) {
        console.error('Error testing API:', error)
    }
}

testChickStatusAPI()
