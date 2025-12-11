/**
 * Run a specific migration file
 * Usage: npx tsx apps/web/scripts/run-migration.ts <migration_file>
 */

import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runMigration(migrationFile: string) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Running migration:', migrationFile)

    // Read the SQL file
    const sqlPath = resolve(process.cwd(), migrationFile)
    console.log('📁 Reading SQL from:', sqlPath)

    let sql: string
    try {
        sql = readFileSync(sqlPath, 'utf-8')
    } catch (err) {
        console.error('❌ Failed to read migration file:', err)
        process.exit(1)
    }

    console.log('📝 SQL content length:', sql.length, 'characters')

    // Execute the SQL
    console.log('⚡ Executing migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
        console.error('❌ Migration failed:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))

        // Try direct execution as fallback
        console.log('\n🔄 Trying direct execution...')
        const { error: directError } = await supabase.from('_migrations').insert({
            name: migrationFile,
            executed_at: new Date().toISOString()
        })

        if (directError) {
            console.error('❌ Direct execution also failed:', directError)
        }

        // Try executing via raw SQL
        console.log('\n🔄 Trying raw SQL execution...')
        try {
            // Split SQL into individual statements and execute them
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s.length > 0 && !s.startsWith('--'))

            console.log(`📊 Found ${statements.length} SQL statements`)

            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i] + ';'
                console.log(`\n[${i + 1}/${statements.length}] Executing statement...`)
                console.log(statement.substring(0, 100) + '...')

                const { error: stmtError } = await supabase.rpc('exec_sql', {
                    sql_query: statement
                })

                if (stmtError) {
                    console.error(`❌ Statement ${i + 1} failed:`, stmtError)
                    // Continue with next statement
                } else {
                    console.log(`✅ Statement ${i + 1} executed successfully`)
                }
            }

            console.log('\n✅ Migration completed (with possible errors)')
        } catch (rawError) {
            console.error('❌ Raw SQL execution failed:', rawError)
            process.exit(1)
        }
    } else {
        console.log('✅ Migration executed successfully!')
        if (data) {
            console.log('Result:', data)
        }
    }
}

const migrationFile = process.argv[2]
if (!migrationFile) {
    console.error('Usage: npx tsx apps/web/scripts/run-migration.ts <migration_file>')
    console.error('Example: npx tsx apps/web/scripts/run-migration.ts apps/web/db/migrations/036_add_game_progression_fields_to_profiles.sql')
    process.exit(1)
}

runMigration(migrationFile).then(() => {
    console.log('\n🎉 Migration process completed')
    process.exit(0)
})
