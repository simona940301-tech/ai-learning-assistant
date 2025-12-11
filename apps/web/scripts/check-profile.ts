/**
 * Quick script to check if user profile exists
 * Run with: npx tsx apps/web/scripts/check-profile.ts <user_id>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkProfile(userId: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔍 Checking profile for user:', userId)

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
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

    console.log('✅ Profile found:', {
        id: profile.id,
        xp: profile.xp,
        level: profile.level,
        coins: profile.coins,
        total_matches: profile.total_matches
    })
}

const userId = process.argv[2]
if (!userId) {
    console.error('Usage: npx tsx apps/web/scripts/check-profile.ts <user_id>')
    process.exit(1)
}

checkProfile(userId).then(() => process.exit(0))
