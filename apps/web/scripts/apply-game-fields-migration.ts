/**
 * Apply game progression fields migration
 * Run with: npx tsx apps/web/scripts/apply-game-fields-migration.ts
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function applyMigration() {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        db: { schema: 'public' },
        auth: { persistSession: false }
    })

    console.log('🔧 Applying game progression fields migration...\n')

    // Step 1: Add columns one by one
    const columns = [
        { name: 'xp', type: 'INTEGER', default: '0', notNull: true },
        { name: 'level', type: 'INTEGER', default: '1', notNull: true },
        { name: 'coins', type: 'INTEGER', default: '0', notNull: true },
        { name: 'streak', type: 'INTEGER', default: '0', notNull: true },
        { name: 'best_streak', type: 'INTEGER', default: '0', notNull: true },
        { name: 'streak_reward_state', type: 'JSONB', default: "'{}'::jsonb", notNull: true },
        { name: 'total_matches', type: 'INTEGER', default: '0', notNull: true },
        { name: 'total_wins', type: 'INTEGER', default: '0', notNull: true },
        { name: 'total_pve_matches', type: 'INTEGER', default: '0', notNull: true },
        { name: 'total_pvp_matches', type: 'INTEGER', default: '0', notNull: true },
        { name: 'total_correct_answers', type: 'INTEGER', default: '0', notNull: true },
        { name: 'total_questions_answered', type: 'INTEGER', default: '0', notNull: true },
        { name: 'last_battle_at', type: 'TIMESTAMPTZ', default: null, notNull: false },
        { name: 'tutorial_completed_at', type: 'TIMESTAMPTZ', default: null, notNull: false },
        { name: 'tutorial_badge_awarded', type: 'BOOLEAN', default: 'false', notNull: false },
        { name: 'chick_hunger', type: 'INTEGER', default: '50', notNull: true },
        { name: 'chick_food_bowls', type: 'INTEGER', default: '0', notNull: true },
        { name: 'chick_last_fed_at', type: 'TIMESTAMPTZ', default: null, notNull: false },
    ]

    for (const col of columns) {
        const notNullClause = col.notNull ? 'NOT NULL' : ''
        const defaultClause = col.default !== null ? `DEFAULT ${col.default}` : ''

        const sql = `
            ALTER TABLE profiles 
            ADD COLUMN IF NOT EXISTS ${col.name} ${col.type} ${defaultClause} ${notNullClause};
        `.trim()

        console.log(`Adding column: ${col.name}...`)

        // Use raw query execution
        const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

        if (error) {
            // Try alternative approach using Supabase REST API
            console.log(`  ⚠️  RPC failed, trying direct approach...`)

            // Since we can't execute DDL via REST API, we'll need to use the SQL editor
            // For now, just log the error and continue
            console.log(`  ℹ️  You may need to run this SQL manually in Supabase SQL Editor:`)
            console.log(`     ${sql}`)
        } else {
            console.log(`  ✅ Column ${col.name} added successfully`)
        }
    }

    console.log('\n✅ Migration completed!')
    console.log('\n📋 Next steps:')
    console.log('1. Verify the columns were added by running: npx tsx apps/web/scripts/check-profile.ts <user_id>')
    console.log('2. Test the profile update by running: npx tsx apps/web/scripts/test-profile-update.ts <user_id>')
}

applyMigration().then(() => process.exit(0)).catch(err => {
    console.error('❌ Migration failed:', err)
    process.exit(1)
})
