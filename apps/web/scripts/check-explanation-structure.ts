/**
 * Check actual explanation data structure
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkExplanationStructure() {
    console.log('🔍 Checking explanation data structure...\n')

    // Get a few sample explanations
    const { data: explanations, error } = await supabase
        .from('question_explanations')
        .select('question_id, explanation_text, option_analysis')
        .limit(3)

    if (error) {
        console.error('❌ Error:', error)
        return
    }

    console.log('📝 Sample explanations:\n')

    explanations?.forEach((expl, index) => {
        console.log(`\n=== Explanation ${index + 1} ===`)
        console.log('Question ID:', expl.question_id)
        console.log('\nExplanation Text:')
        console.log(expl.explanation_text)
        console.log('\nOption Analysis:')
        console.log(JSON.stringify(expl.option_analysis, null, 2))
        console.log('\n' + '='.repeat(50))
    })

    // Check if option_analysis is a separate column
    const { data: tableInfo } = await supabase
        .from('question_explanations')
        .select('*')
        .limit(1)
        .single()

    console.log('\n📊 Table columns:')
    console.log(Object.keys(tableInfo || {}))
}

checkExplanationStructure()
    .then(() => {
        console.log('\n✅ Check complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Failed:', error)
        process.exit(1)
    })
