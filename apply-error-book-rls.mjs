import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/)
    if (match) {
        envVars[match[1].trim()] = match[2].trim()
    }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    console.log('URL:', supabaseUrl ? '✓' : '✗')
    console.log('Service Key:', supabaseServiceKey ? '✓' : '✗')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
})

async function applyRLSPolicy() {
    console.log('🔧 Applying RLS policy for error_book...\n')

    // Drop existing policy if it exists
    console.log('Step 1: Dropping existing policy (if any)...')
    const dropSql = `DROP POLICY IF EXISTS "Users can insert their own error_book entries" ON error_book;`

    const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropSql })
    if (dropError && !dropError.message?.includes('does not exist')) {
        console.log('⚠️  Could not drop policy (might not exist or exec_sql RPC unavailable)')
    } else {
        console.log('✓ Dropped old policy (if existed)')
    }

    // Apply the new policy
    console.log('\nStep 2: Creating new INSERT policy...')
    const createSql = `
CREATE POLICY "Users can insert their own error_book entries"
ON error_book FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
  `.trim()

    const { error: createError } = await supabase.rpc('exec_sql', { sql: createSql })

    if (createError) {
        console.error('❌ Error applying RLS policy via RPC:', createError.message)
        console.log('\n📋 Please run this SQL manually in Supabase SQL Editor:')
        console.log('─'.repeat(60))
        console.log(createSql)
        console.log('─'.repeat(60))
        process.exit(1)
    }

    console.log('✅ RLS policy created successfully!\n')
}

applyRLSPolicy().catch(err => {
    console.error('Fatal error:', err.message)
    process.exit(1)
})
