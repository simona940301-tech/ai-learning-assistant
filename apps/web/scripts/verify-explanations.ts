/**
 * Enhanced Database Verification Script
 * Checks the foreign key relationship between seed_questions and question_explanations
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

// Load environment variables (ESM compatible)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkForeignKeyRelationship() {
    console.log('🔍 Checking foreign key relationship...\n')

    // 1. Check a sample explanation record
    const { data: sampleExplanation, error: explError } = await supabase
        .from('question_explanations')
        .select('*')
        .limit(1)
        .single()

    if (explError) {
        console.error('❌ Error fetching sample explanation:', explError)
        return
    }

    console.log('📝 Sample explanation record:')
    console.log(JSON.stringify(sampleExplanation, null, 2))
    console.log('')

    // 2. Try to find the corresponding question
    if (sampleExplanation?.question_id) {
        const { data: question, error: qError } = await supabase
            .from('seed_questions')
            .select('id, question_text')
            .eq('id', sampleExplanation.question_id)
            .maybeSingle()

        console.log(`🔗 Looking for question with ID: ${sampleExplanation.question_id}`)
        if (qError) {
            console.error('❌ Error:', qError)
        } else if (!question) {
            console.log('❌ No matching question found!')
        } else {
            console.log('✅ Found matching question:', question.question_text.substring(0, 50) + '...')
        }
    }

    console.log('\n🔍 Testing different JOIN syntaxes...\n')

    // 3. Test current syntax (PostgREST foreign table)
    console.log('Test 1: Using question_explanations!left(explanation_text)')
    const { data: test1, error: err1 } = await supabase
        .from('seed_questions')
        .select('id, question_text, question_explanations!left(explanation_text)')
        .limit(5)

    if (err1) {
        console.error('❌ Error:', err1)
    } else {
        const withExpl = test1?.filter((q: any) =>
            Array.isArray(q.question_explanations) && q.question_explanations.length > 0
        ).length || 0
        console.log(`   Result: ${withExpl}/${test1?.length} questions have explanations`)
    }

    // 4. Test explicit foreign key syntax
    console.log('\nTest 2: Using question_explanations!question_id(explanation_text)')
    const { data: test2, error: err2 } = await supabase
        .from('seed_questions')
        .select('id, question_text, question_explanations!question_id(explanation_text)')
        .limit(5)

    if (err2) {
        console.error('❌ Error:', err2)
    } else {
        const withExpl = test2?.filter((q: any) =>
            Array.isArray(q.question_explanations) && q.question_explanations.length > 0
        ).length || 0
        console.log(`   Result: ${withExpl}/${test2?.length} questions have explanations`)
    }

    // 5. Test reverse join
    console.log('\nTest 3: Reverse join from question_explanations')
    const { data: test3, error: err3 } = await supabase
        .from('question_explanations')
        .select('explanation_text, seed_questions!question_id(id, question_text)')
        .limit(5)

    if (err3) {
        console.error('❌ Error:', err3)
    } else {
        console.log(`   Result: Found ${test3?.length} explanations with questions`)
        if (test3 && test3.length > 0) {
            console.log('   Sample:', JSON.stringify(test3[0], null, 2))
        }
    }
}

checkForeignKeyRelationship()
    .then(() => {
        console.log('\n✅ Diagnosis complete')
        process.exit(0)
    })
    .catch((error) => {
        console.error('\n❌ Diagnosis failed:', error)
        process.exit(1)
    })
