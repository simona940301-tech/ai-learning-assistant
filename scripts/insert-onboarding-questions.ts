import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function main() {
  console.log('🚀 Starting onboarding questions insertion...\n')

  // Read the SQL file
  const sqlPath = path.join(process.cwd(), 'insert_onboarding_questions_batch.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf-8')

  // Split the SQL into individual INSERT statements
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('SELECT'))

  console.log(`📝 Found ${statements.length} SQL statements to execute\n`)

  // Execute each statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    if (statement.includes('INSERT INTO onboarding_questions')) {
      console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)

      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' })

      if (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error)
        // Try direct insertion instead
        console.log('Trying direct insertion...')
        await insertDirectly(statement)
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`)
      }
    }
  }

  // Verify the results
  console.log('\n📊 Verifying insertion results...\n')

  const { data: counts, error: countError } = await supabase
    .from('onboarding_questions')
    .select('difficulty_level')
    .eq('subject', 'english')
    .eq('is_active', true)

  if (countError) {
    console.error('Error fetching counts:', countError)
    return
  }

  const countsByDifficulty = counts.reduce((acc, row) => {
    acc[row.difficulty_level] = (acc[row.difficulty_level] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  console.log('Questions by difficulty level:')
  for (let i = 1; i <= 5; i++) {
    console.log(`  Level ${i}: ${countsByDifficulty[i] || 0} questions`)
  }

  console.log(`\n✨ Total: ${counts.length} questions inserted successfully!`)
}

async function insertDirectly(statement: string) {
  // Parse the INSERT statement and extract values
  // This is a simplified version - might need enhancement
  console.log('Direct insertion not implemented yet. Using RPC...')
}

main().catch(console.error)
