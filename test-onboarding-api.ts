/**
 * Test script for onboarding questions API
 * Tests if the API can successfully fetch questions from seed_questions table
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function testOnboardingQuestions() {
  console.log('🧪 Testing Onboarding Questions API Fix...\n')

  const supabase = createClient(supabaseUrl, supabaseKey)

  // Test 1: Check if seed_questions table has data
  console.log('📊 Test 1: Checking seed_questions table...')
  const { data: allQuestions, error: allError } = await supabase
    .from('seed_questions')
    .select('id, question_text, difficulty_level, subject')
    .eq('subject', 'english')
    .eq('is_active', true)
    .limit(10)

  if (allError) {
    console.error('❌ Error fetching seed_questions:', allError)
    return
  }

  console.log(`✅ Found ${allQuestions?.length || 0} seed_questions in database`)
  if (allQuestions && allQuestions.length > 0) {
    console.log('   Sample question:', allQuestions[0].question_text.substring(0, 60) + '...')
  }
  console.log()

  // Test 2: Test difficulty filtering
  console.log('📊 Test 2: Testing difficulty filtering (difficulty 1-3)...')
  const { data: filteredQuestions, error: filterError } = await supabase
    .from('seed_questions')
    .select('id, question_text, difficulty_level')
    .eq('subject', 'english')
    .in('difficulty_level', [1, 2, 3])
    .eq('is_active', true)
    .limit(21) // 7 questions * 3 for random selection

  if (filterError) {
    console.error('❌ Error with difficulty filter:', filterError)
    return
  }

  console.log(`✅ Found ${filteredQuestions?.length || 0} questions with difficulty 1-3`)

  // Group by difficulty
  const byDifficulty: Record<number, number> = {}
  filteredQuestions?.forEach(q => {
    byDifficulty[q.difficulty_level] = (byDifficulty[q.difficulty_level] || 0) + 1
  })

  console.log('   Distribution:')
  Object.entries(byDifficulty)
    .sort(([a], [b]) => Number(a) - Number(b))
    .forEach(([diff, count]) => {
      console.log(`   - Difficulty ${diff}: ${count} questions`)
    })
  console.log()

  // Test 3: Simulate API transformation
  console.log('📊 Test 3: Simulating API transformation...')
  if (filteredQuestions && filteredQuestions.length >= 7) {
    const randomQuestions = filteredQuestions
      .sort(() => Math.random() - 0.5)
      .slice(0, 7)

    // Fetch full details for selected questions
    const { data: fullQuestions, error: fullError } = await supabase
      .from('seed_questions')
      .select('*')
      .in('id', randomQuestions.map(q => q.id))

    if (fullError) {
      console.error('❌ Error fetching full questions:', fullError)
      return
    }

    console.log(`✅ Successfully simulated API flow for 7 questions`)
    console.log('   Question IDs:', fullQuestions?.map(q => q.id.substring(0, 8)).join(', '))

    // Validate all required fields exist
    const requiredFields = ['question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'correct_answer']
    let allValid = true

    fullQuestions?.forEach((q, idx) => {
      const missingFields = requiredFields.filter(field => !q[field])
      if (missingFields.length > 0) {
        console.error(`   ❌ Question ${idx + 1} missing fields:`, missingFields)
        allValid = false
      }
    })

    if (allValid) {
      console.log('   ✅ All questions have required fields')
    }
  } else {
    console.error('❌ Not enough questions to simulate API (need at least 7)')
  }
  console.log()

  // Summary
  console.log('📈 Summary:')
  if (allQuestions && allQuestions.length >= 21) {
    console.log('✅ Onboarding questions API should work correctly')
    console.log('✅ Sufficient questions in seed_questions table')
    console.log('✅ Mobile PvE challenge should load questions successfully')
  } else {
    console.log('⚠️  Warning: Low number of questions in database')
    console.log(`   Current: ${allQuestions?.length || 0} questions`)
    console.log(`   Recommended: At least 21 questions (7 per difficulty level)`)
  }
}

testOnboardingQuestions()
  .then(() => {
    console.log('\n✨ Test completed')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Test failed:', error)
    process.exit(1)
  })
