#!/usr/bin/env tsx
/**
 * Test script to verify ExplainCard rendering fix
 * Tests the complete pipeline: API → normalization → rendering
 */

const API_URL = process.env.API_URL || 'http://localhost:3000'

const TEST_QUESTION = `There are reports coming in that a number of people have been injured in a terrorist ____.
(A) access (B) supply (C) attack (D) burden`

async function testExplainCardPipeline() {
  console.log('🧪 Testing ExplainCard Fix\n')
  console.log('Test Question:', TEST_QUESTION)
  console.log('\n' + '='.repeat(60) + '\n')

  try {
    // 1. Call API
    console.log('📡 Step 1: Calling /api/ai/route-solver...')
    const response = await fetch(`${API_URL}/api/ai/route-solver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: TEST_QUESTION }),
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`)
    }

    const result = await response.json()
    console.log('✅ API Response received')
    console.log('   Subject:', result.subject)
    console.log('   Pipeline:', result.meta?.pipeline)
    console.log('   Routing:', result.routing?.type, `(conf: ${result.routing?.confidence})`)
    console.log('')

    // 2. Validate response structure
    console.log('🔍 Step 2: Validating response structure...')
    const card = result.explanation?.card

    if (!card) {
      console.error('❌ FAIL: No card found in response.explanation.card')
      console.error('   Available keys:', Object.keys(result))
      process.exit(1)
    }

    console.log('✅ Card found')
    console.log('   ID:', card.id)
    console.log('   Kind:', card.kind)
    console.log('   Has translation:', !!card.translation)
    console.log('   Options count:', card.options?.length ?? 0)
    console.log('   Vocab count:', card.vocab?.length ?? 0)
    console.log('')

    // 3. Validate card fields
    console.log('🔍 Step 3: Validating card fields...')
    const requiredFields = ['id', 'question', 'kind']
    const missingFields = requiredFields.filter((f) => !card[f])

    if (missingFields.length > 0) {
      console.error('❌ FAIL: Missing required fields:', missingFields)
      process.exit(1)
    }

    console.log('✅ All required fields present')
    console.log('')

    // 4. Validate kind
    console.log('🔍 Step 4: Validating card kind...')
    const validKinds = ['E1', 'E2', 'E3', 'E4', 'E5', 'FALLBACK']
    if (!validKinds.includes(card.kind)) {
      console.error('❌ FAIL: Invalid kind:', card.kind)
      console.error('   Expected one of:', validKinds)
      process.exit(1)
    }

    console.log('✅ Valid kind:', card.kind)
    console.log('')

    // 5. Check for E1-specific fields
    if (card.kind === 'E1') {
      console.log('🔍 Step 5: Validating E1-specific fields...')

      if (!card.translation) {
        console.warn('⚠️  WARNING: E1 card missing translation')
      }

      if (!card.options || card.options.length === 0) {
        console.warn('⚠️  WARNING: E1 card missing options analysis')
      } else {
        console.log('✅ Options analysis present:')
        card.options.forEach((opt: any) => {
          const verdict = opt.verdict === 'fit' ? '✓' : opt.verdict === 'unfit' ? '✗' : '?'
          console.log(`   (${opt.key}) ${verdict} ${opt.text}`)
          if (opt.zh) console.log(`       中譯: ${opt.zh}`)
          if (opt.reason) console.log(`       理由: ${opt.reason}`)
        })
      }

      if (!card.correct) {
        console.warn('⚠️  WARNING: E1 card missing correct answer')
      } else {
        console.log('✅ Correct answer:', `(${card.correct.key}) ${card.correct.text}`)
      }

      if (!card.vocab || card.vocab.length === 0) {
        console.warn('⚠️  WARNING: E1 card missing vocab')
      } else {
        console.log('✅ Vocabulary:', card.vocab.map((v: any) => v.term).join(', '))
      }
      console.log('')
    }

    // 6. Check for legacy keys (should NOT exist)
    console.log('🔍 Step 6: Checking for legacy keys...')
    // Note: 'steps' is a valid ExplainCard field (ExplainStep[]), not legacy
    // Legacy 'steps' was string[], new 'steps' is {title, detail}[]
    const legacyKeys = ['focus', 'summary', 'details', 'cardExists', 'stepsLength', 'detailsLength']
    const foundLegacyKeys = legacyKeys.filter((k) => result[k] !== undefined)

    // Also check if 'steps' is in wrong format (string[] instead of ExplainStep[])
    if (card.steps && Array.isArray(card.steps) && card.steps.length > 0) {
      if (typeof card.steps[0] === 'string') {
        foundLegacyKeys.push('steps (wrong format: string[] instead of ExplainStep[])')
      }
    }

    if (foundLegacyKeys.length > 0) {
      console.error('❌ FAIL: Legacy keys found:', foundLegacyKeys)
      console.error('   API should only return ExplainCard format')
      process.exit(1)
    }

    console.log('✅ No legacy keys found')
    console.log('')

    // 7. Success summary
    console.log('=' + '='.repeat(60))
    console.log('🎉 ALL TESTS PASSED!')
    console.log('=' + '='.repeat(60))
    console.log('')
    console.log('Summary:')
    console.log('  ✅ API returns proper ExplainCard format')
    console.log('  ✅ Card has valid kind:', card.kind)
    console.log('  ✅ Card has all required fields')
    console.log('  ✅ No legacy keys in response')
    console.log('  ✅ Frontend should render correctly')
    console.log('')
    console.log('Expected Console Output in Browser:')
    console.log('  [AnySubjectSolver] API Response received: { subject:english, hasExplanationCard:true, ... }')
    console.log('  [AnySubjectSolver] Card received: { kind:E1, hasTranslation:true, ... }')
    console.log('  [ExplainCard] Render called: { hasCard:true, kind:E1, ... }')
    console.log('  [ExplainCard] Rendering card kind: E1')
    console.log('  ✅ Solve preview updated')
    console.log('')

  } catch (error) {
    console.error('❌ TEST FAILED:', error)
    process.exit(1)
  }
}

testExplainCardPipeline()
