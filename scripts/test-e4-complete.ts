#!/usr/bin/env npx tsx
/**
 * E4 Complete Flow Test
 * Tests the entire E4 explanation generation pipeline:
 * 1. Option reconstruction when parser returns empty options
 * 2. LLM generation with 5 core fields
 * 3. Tolerant extraction in presenter
 * 4. Boundary logging
 */

const DEBUG = true
process.env.DEBUG = '1'

// Test passage with multiple questions
const testPassage = `
The Industrial Revolution transformed society in unprecedented ways. Beginning in Britain in the late 18th century, it spread throughout Europe and North America, fundamentally changing how people lived and worked. The introduction of machinery and new manufacturing processes led to a shift from agrarian economies to industrial ones.

One of the most significant changes was the rise of factory systems. Instead of working in small workshops or at home, workers now gathered in large factories. This concentration of labor allowed for greater efficiency and productivity, but it also created new social challenges. Working conditions were often harsh, with long hours, low wages, and dangerous machinery.

The Revolution also brought about rapid urbanization. As factories drew workers from rural areas, cities grew at an extraordinary rate. This urban growth created both opportunities and problems. While cities offered jobs and the promise of better lives, they also suffered from overcrowding, pollution, and inadequate sanitation.

Question 41: What does the passage mainly discuss?
(A) The negative effects of industrialization
(B) The transformation of society during the Industrial Revolution
(C) Working conditions in early factories
(D) The growth of cities in the 18th century

Question 42: According to the passage, what was a major advantage of the factory system?
(A) Workers could work from home
(B) It provided safer working conditions
(C) It allowed for greater efficiency and productivity
(D) It reduced the need for machinery

Question 43: The word "harsh" in paragraph 2 is closest in meaning to:
(A) difficult
(B) pleasant
(C) modern
(D) traditional
`.trim()

console.log('=== E4 Complete Flow Test ===\n')
console.log('Test passage length:', testPassage.length, 'chars')
console.log('Expected questions: 3 (Q41, Q42, Q43)\n')

// Import the explanation generator
import { generateTemplateCard } from '../apps/web/lib/english/templates'

async function runTest() {
  try {
    console.log('[TEST] Step 1: Calling generateTemplateCard with E4 route...\n')

    const result = await generateTemplateCard({
      route: { type: 'E4' },
      stem: testPassage,
      options: [], // Empty options to test reconstruction
      meta: {},
    })

    console.log('\n[TEST] Step 2: Checking result structure...\n')
    console.log('Result keys:', Object.keys(result))
    console.log('Result kind:', result.kind)
    console.log('Result meta keys:', result.meta ? Object.keys(result.meta) : 'no meta')

    const questions = (result.meta as any)?.questions || []
    console.log('Questions returned:', questions.length)

    if (!questions || questions.length === 0) {
      console.error('❌ FAIL: No questions returned')
      console.error('Meta structure:', JSON.stringify(result.meta, null, 2).substring(0, 500))
      return
    }

    console.log('\n[TEST] Step 3: Validating each question...\n')

    let allValid = true
    questions.forEach((q: any, idx: number) => {
      console.log(`\n--- Question ${idx + 1} (${q.id}) ---`)
      console.log('Answer:', q.answer || 'MISSING')
      console.log('Reasoning:', q.reasoning ? q.reasoning.substring(0, 80) + '...' : 'MISSING')
      console.log('Counterpoints keys:', q.counterpoints ? Object.keys(q.counterpoints) : 'MISSING')
      console.log('Common Mistake:', q.commonMistake ? q.commonMistake.substring(0, 60) + '...' : 'MISSING')
      console.log('Evidence:', q.evidence ? q.evidence.substring(0, 80) + '...' : 'MISSING')
      console.log('Options reconstructed:', q.options ? q.options.length : 0)

      // Validate 5 core fields
      const hasAnswer = !!q.answer && q.answer.length > 0
      const hasReasoning = !!q.reasoning && q.reasoning.length >= 12
      const hasCounterpoints = !!q.counterpoints && Object.keys(q.counterpoints).length > 0
      const hasCommonMistake = !!q.commonMistake && q.commonMistake.length > 0
      const hasEvidence = !!q.evidence && q.evidence.length > 0

      console.log('\nValidation:')
      console.log('  ✓ Answer:', hasAnswer ? 'OK' : '❌ MISSING')
      console.log('  ✓ Reasoning:', hasReasoning ? 'OK' : '❌ MISSING/TOO SHORT')
      console.log('  ✓ Counterpoints:', hasCounterpoints ? 'OK' : '❌ MISSING')
      console.log('  ✓ Common Mistake:', hasCommonMistake ? 'OK' : '❌ MISSING')
      console.log('  ✓ Evidence:', hasEvidence ? 'OK' : '❌ MISSING')

      if (!hasAnswer || !hasReasoning || !hasCounterpoints || !hasCommonMistake || !hasEvidence) {
        allValid = false
      }
    })

    console.log('\n\n=== TEST SUMMARY ===')
    if (allValid) {
      console.log('✅ ALL TESTS PASSED')
      console.log('All questions have complete 5-field explanations')
    } else {
      console.log('❌ SOME TESTS FAILED')
      console.log('Some questions are missing required fields')
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
  }
}

runTest()
