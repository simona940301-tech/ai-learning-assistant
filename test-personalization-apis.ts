/**
 * Complete API Testing Script for Personalization System
 *
 * Tests all new endpoints:
 * 1. Proficiency API
 * 2. Concepts API
 * 3. RAG Question Generator
 * 4. Micro-hints
 * 5. Enhanced DDA
 * 6. Enhanced Error Book Practice
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

// Test user credentials (use your test user)
const TEST_EMAIL = 'test@example.com'
const TEST_PASSWORD = 'test123456'

async function main() {
  console.log('🧪 Starting Personalization System API Tests\n')

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // Login to get auth token
  console.log('🔐 Logging in...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  })

  if (authError || !authData.session) {
    console.error('❌ Login failed:', authError?.message)
    console.log('\n⚠️  Please update TEST_EMAIL and TEST_PASSWORD with valid credentials')
    return
  }

  const token = authData.session.access_token
  const userId = authData.user.id
  console.log('✅ Logged in successfully\n')

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  // Test Suite
  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{ name: string; status: 'pass' | 'fail'; error?: string }>
  }

  // Test 1: Proficiency Calculate API
  await testAPI(
    'POST /api/proficiency/calculate',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/proficiency/calculate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ forceRecalculate: true })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      if (!data.proficiency) {
        throw new Error('Missing proficiency data')
      }

      console.log('   📊 Proficiency:', data.proficiency.overall_proficiency)
      console.log('   📈 Accuracy:', data.proficiency.accuracy_rate)
      console.log('   🎯 Has Dunning-Kruger:', data.proficiency.has_dunning_kruger_effect)

      return true
    },
    results
  )

  // Test 2: Get Latest Proficiency
  await testAPI(
    'GET /api/proficiency/calculate',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/proficiency/calculate`, {
        method: 'GET',
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   📊 Latest Proficiency:', data.proficiency?.[0]?.overall_proficiency || 'N/A')

      return true
    },
    results
  )

  // Test 3: Get Concept Proficiency
  await testAPI(
    'GET /api/proficiency/concepts',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/proficiency/concepts`, {
        method: 'GET',
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   🎯 Total Concepts:', data.stats?.totalConcepts || 0)
      console.log('   ✅ Mastered:', data.stats?.mastered || 0)
      console.log('   📚 Learning:', data.stats?.learning || 0)
      console.log('   ⏰ Due for Review:', data.stats?.dueForReview || 0)

      return true
    },
    results
  )

  // Test 4: Update Concept Proficiency
  await testAPI(
    'POST /api/proficiency/concepts',
    async () => {
      // First get a concept tag ID
      const { data: tags } = await supabase
        .from('concept_tags')
        .select('id')
        .limit(1)
        .single()

      if (!tags) {
        console.log('   ⚠️  No concept tags found, skipping...')
        return true
      }

      const response = await fetch(`${API_BASE_URL}/api/proficiency/concepts`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conceptTagIds: [tags.id],
          isCorrect: true,
          responseTimeMs: 12000
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   ✅ Updated', data.updated?.length || 0, 'concept(s)')

      return true
    },
    results
  )

  // Test 5: Enhanced DDA - PVE Questions
  await testAPI(
    'POST /api/play/pve/questions (Enhanced DDA)',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/play/pve/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          userId,
          subject: 'English',
          numQuestions: 5,
          recentPerformance: [
            { isCorrect: true, timeMs: 10000, difficulty: 3 },
            { isCorrect: true, timeMs: 8000, difficulty: 3 },
            { isCorrect: false, timeMs: 15000, difficulty: 3 }
          ]
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   📝 Questions:', data.questions?.length || 0)
      console.log('   🎯 Baseline Difficulty:', data.baselineDifficulty)
      console.log('   📚 DDA Pool:', Object.keys(data.dda_pool || {}).join(', '))

      return true
    },
    results
  )

  // Test 6: SRS-based Error Book Practice
  await testAPI(
    'GET /api/error-book/practice (SRS Mode)',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/error-book/practice?useSRS=true&limit=5`, {
        method: 'GET',
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   📝 Questions:', data.questions?.length || 0)
      console.log('   📊 Mode:', data.mode)
      if (data.srs_info) {
        console.log('   🎯 Total Concepts:', data.srs_info.total_concepts)
        console.log('   ⏰ Due Concepts:', data.srs_info.due_concepts)
      }

      return true
    },
    results
  )

  // Test 7: RAG Question Generation
  await testAPI(
    'POST /api/questions/generate',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/questions/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          conceptTag: 'tense-consistency',
          subject: 'English',
          difficulty: 3,
          count: 2,
          useErrorBook: false,
          cacheQuestions: false
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   📝 Generated Questions:', data.questions?.length || 0)
      if (data.questions?.[0]) {
        console.log('   ❓ Sample:', data.questions[0].question_text.substring(0, 60) + '...')
      }

      return true
    },
    results
  )

  // Test 8: Micro-hints Generation
  await testAPI(
    'POST /api/hints/generate',
    async () => {
      const response = await fetch(`${API_BASE_URL}/api/hints/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId: 'test-q1',
          questionText: 'Which sentence uses correct tense consistency?',
          options: [
            'She walked to the store and buys milk.',
            'She walked to the store and bought milk.',
            'She walks to the store and bought milk.',
            'She will walk to the store and bought milk.'
          ],
          correctAnswer: 'B',
          subject: 'English',
          conceptTags: ['tense-consistency'],
          userAttempts: 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'API call failed')
      }

      console.log('   💡 Hint Level:', data.level)
      console.log('   🎯 Hint Type:', data.hintType)
      console.log('   💬 Hint:', data.hint.substring(0, 80) + '...')

      return true
    },
    results
  )

  // Print Summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Test Results Summary')
  console.log('='.repeat(60))
  console.log(`✅ Passed: ${results.passed}`)
  console.log(`❌ Failed: ${results.failed}`)
  console.log(`📈 Success Rate: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`)
  console.log('\nDetailed Results:')

  results.tests.forEach((test, i) => {
    const icon = test.status === 'pass' ? '✅' : '❌'
    console.log(`${i + 1}. ${icon} ${test.name}`)
    if (test.error) {
      console.log(`   Error: ${test.error}`)
    }
  })

  console.log('\n' + '='.repeat(60))

  if (results.failed === 0) {
    console.log('🎉 All tests passed! The Personalization System is ready!')
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.')
  }
}

async function testAPI(
  name: string,
  testFn: () => Promise<boolean>,
  results: { passed: number; failed: number; tests: Array<{ name: string; status: 'pass' | 'fail'; error?: string }> }
) {
  console.log(`\n🧪 Testing: ${name}`)
  try {
    await testFn()
    console.log(`✅ PASSED`)
    results.passed++
    results.tests.push({ name, status: 'pass' })
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.log(`❌ FAILED: ${errorMsg}`)
    results.failed++
    results.tests.push({ name, status: 'fail', error: errorMsg })
  }
}

// Run tests
main().catch(console.error)
