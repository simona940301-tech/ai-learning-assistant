// Diagnostic script to check user_answers data for Ready Score calculation
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function diagnoseReadyScore() {
    console.log('🔍 Diagnosing Ready Score Data...\n')

    // Get current user (you'll need to replace this with actual user ID)
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users[0] // Assuming first user for now

    if (!user) {
        console.error('❌ No users found')
        return
    }

    console.log(`👤 User ID: ${user.id}\n`)

    // 1. Total user_answers
    const { count: totalCount } = await supabase
        .from('user_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

    console.log(`📊 Total user_answers: ${totalCount}`)

    // 2. English subject questions
    const { count: englishCount } = await supabase
        .from('user_answers')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('metadata->>subject', 'english')

    console.log(`🇬🇧 English subject questions: ${englishCount}`)

    // 3. Sample metadata to see format
    const { data: sampleData } = await supabase
        .from('user_answers')
        .select('id, is_correct, metadata')
        .eq('user_id', user.id)
        .limit(10)

    console.log('\n📝 Sample metadata (first 10):')
    sampleData?.forEach((row, idx) => {
        console.log(`\n${idx + 1}. ID: ${row.id}`)
        console.log(`   Correct: ${row.is_correct}`)
        console.log(`   Metadata:`, JSON.stringify(row.metadata, null, 2))
    })

    // 4. Check difficulty field distribution
    const { data: difficultyData } = await supabase
        .from('user_answers')
        .select('metadata')
        .eq('user_id', user.id)

    const difficultyStats = {
        total: difficultyData?.length || 0,
        withDifficulty: 0,
        withoutDifficulty: 0,
        difficultyValues: {} as Record<string, number>
    }

    difficultyData?.forEach(row => {
        const metadata = row.metadata as any
        const difficulty = metadata?.difficulty

        if (difficulty !== undefined && difficulty !== null) {
            difficultyStats.withDifficulty++
            const key = String(difficulty)
            difficultyStats.difficultyValues[key] = (difficultyStats.difficultyValues[key] || 0) + 1
        } else {
            difficultyStats.withoutDifficulty++
        }
    })

    console.log('\n📈 Difficulty field statistics:')
    console.log(`   Total records: ${difficultyStats.total}`)
    console.log(`   With difficulty: ${difficultyStats.withDifficulty}`)
    console.log(`   Without difficulty: ${difficultyStats.withoutDifficulty}`)
    console.log(`   Difficulty distribution:`, difficultyStats.difficultyValues)

    // 5. Test the RPC function
    console.log('\n🔧 Testing get_weighted_english_performance RPC...')
    const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_weighted_english_performance', { user_id_input: user.id })
        .single()

    if (rpcError) {
        console.error('❌ RPC Error:', rpcError)
    } else {
        console.log('✅ RPC Result:')
        console.log(`   weighted_correct_sum: ${rpcData.weighted_correct_sum}`)
        console.log(`   total_difficulty_sum: ${rpcData.total_difficulty_sum}`)
        console.log(`   total_questions_count: ${rpcData.total_questions_count}`)
        console.log(`   avg_response_time_ms: ${rpcData.avg_response_time_ms}`)

        const weightedAccuracy = rpcData.total_difficulty_sum > 0
            ? rpcData.weighted_correct_sum / rpcData.total_difficulty_sum
            : 0
        console.log(`   Calculated weighted accuracy: ${(weightedAccuracy * 100).toFixed(2)}%`)
    }

    // 6. Check which questions are being filtered out
    const { data: allEnglish } = await supabase
        .from('user_answers')
        .select('id, metadata')
        .eq('user_id', user.id)
        .eq('metadata->>subject', 'english')

    const passesRegex = allEnglish?.filter(row => {
        const difficulty = (row.metadata as any)?.difficulty
        const diffStr = String(difficulty)
        return /^[1-5]$/.test(diffStr)
    })

    console.log(`\n🔍 Regex filter analysis:`)
    console.log(`   Total english questions: ${allEnglish?.length || 0}`)
    console.log(`   Passing regex ^[1-5]$: ${passesRegex?.length || 0}`)
    console.log(`   Filtered out: ${(allEnglish?.length || 0) - (passesRegex?.length || 0)}`)

    if (allEnglish && passesRegex && allEnglish.length > passesRegex.length) {
        console.log('\n❌ Questions filtered out (sample):')
        const filtered = allEnglish.filter(row => {
            const difficulty = (row.metadata as any)?.difficulty
            const diffStr = String(difficulty)
            return !/^[1-5]$/.test(diffStr)
        }).slice(0, 5)

        filtered.forEach(row => {
            console.log(`   ID: ${row.id}, difficulty: ${JSON.stringify((row.metadata as any)?.difficulty)}`)
        })
    }
}

diagnoseReadyScore()
    .then(() => {
        console.log('\n\n🔍 Checking match_answers table...')
        return checkMatchAnswers()
    })
    .then(() => {
        console.log('\n\n🔍 Checking RLS policies...')
        return checkRLSPolicies()
    })
    .catch(console.error)

async function checkMatchAnswers() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users[0]

    if (!user) return

    // Check match_answers
    const { data: matchAnswers, count } = await supabase
        .from('match_answers')
        .select('*', { count: 'exact' })
        .limit(10)

    console.log(`📊 Total match_answers: ${count}`)
    console.log(`📝 Sample match_answers (first 10):`)
    matchAnswers?.forEach((row, idx) => {
        console.log(`\n${idx + 1}. Match ID: ${row.match_id}`)
        console.log(`   Question ID: ${row.question_id}`)
        console.log(`   Correct: ${row.is_correct}`)
        console.log(`   Score: ${row.score_awarded}`)
    })

    // Check match_history
    const { data: matches, count: matchCount } = await supabase
        .from('match_history')
        .select('*', { count: 'exact' })
        .limit(5)

    console.log(`\n📊 Total match_history: ${matchCount}`)
}

async function checkRLSPolicies() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Try to insert a test record
    const { data: { users } } = await supabase.auth.admin.listUsers()
    const user = users[0]

    if (!user) return

    console.log('🧪 Testing user_answers insert with service role...')
    const { data, error } = await supabase
        .from('user_answers')
        .insert({
            user_id: user.id,
            question_id: 'test-question-123',
            is_correct: true,
            metadata: {
                subject: 'english',
                difficulty: 3,
                response_time_ms: 5000,
                source: 'diagnostic_test'
            }
        })
        .select()

    if (error) {
        console.error('❌ Insert failed:', error)
    } else {
        console.log('✅ Insert successful:', data)

        // Clean up test record
        await supabase
            .from('user_answers')
            .delete()
            .eq('question_id', 'test-question-123')
        console.log('🧹 Cleaned up test record')
    }
}
