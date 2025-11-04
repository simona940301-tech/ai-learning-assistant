#!/usr/bin/env npx tsx
/**
 * Test that meta.questions passes through correctly from templates to presenter
 */

process.env.DEBUG = '1'

const testPassage = `
The Industrial Revolution transformed society in unprecedented ways.

Question 41: What does the passage mainly discuss?
(A) The negative effects
(B) The transformation
(C) Working conditions
(D) City growth
`.trim()

import { generateTemplateCard } from '../lib/english/templates'
import { presentExplainCard } from '../lib/mapper/explain-presenter'

async function test() {
  console.log('=== Testing meta.questions passthrough ===\n')

  // Step 1: Generate card
  console.log('[Step 1] Generating ExplainCard...\n')
  const card = await generateTemplateCard({
    route: { type: 'E4' },
    stem: testPassage,
    options: [],
    meta: {},
  })

  console.log('[Step 1] Card generated:')
  console.log('  kind:', card.kind)
  console.log('  meta.questions exists:', !!card.meta?.questions)
  console.log('  meta.questions length:', Array.isArray(card.meta?.questions) ? card.meta.questions.length : 0)

  if (card.meta?.questions && Array.isArray(card.meta.questions) && card.meta.questions.length > 0) {
    console.log('  meta.questions[0] keys:', Object.keys(card.meta.questions[0]))
    console.log('  meta.questions[0].reasoning:', card.meta.questions[0].reasoning ? card.meta.questions[0].reasoning.substring(0, 60) : 'MISSING')
    console.log('  meta.questions[0].counterpoints:', card.meta.questions[0].counterpoints ? Object.keys(card.meta.questions[0].counterpoints) : 'MISSING')
    console.log('  meta.questions[0].commonMistake:', card.meta.questions[0].commonMistake ? card.meta.questions[0].commonMistake.substring(0, 60) : 'MISSING')
  } else {
    console.log('  ❌ FAIL: No questions in meta!')
    return
  }

  // Step 2: Present card
  console.log('\n[Step 2] Presenting ExplainCard...\n')
  const vm = presentExplainCard(card)

  if (!vm || vm.kind !== 'E4') {
    console.log('  ❌ FAIL: VM is not E4 type')
    return
  }

  console.log('[Step 2] ReadingVM generated:')
  console.log('  questions.length:', vm.questions.length)

  if (vm.questions.length > 0) {
    const q = vm.questions[0]
    console.log('  questions[0].reasoning:', q.reasoning ? q.reasoning.substring(0, 60) : 'MISSING')
    console.log('  questions[0].counterpoints:', q.counterpoints ? Object.keys(q.counterpoints) : 'MISSING')
    console.log('  questions[0].meta.commonMistake:', q.meta.commonMistake ? q.meta.commonMistake.substring(0, 60) : 'MISSING')

    const hasReasoning = !!q.reasoning && q.reasoning.length > 0
    const hasCounterpoints = !!q.counterpoints && Object.keys(q.counterpoints).length > 0
    const hasCommonMistake = !!q.meta.commonMistake && q.meta.commonMistake.length > 0

    console.log('\n[Validation]')
    console.log('  Reasoning:', hasReasoning ? '✅ OK' : '❌ MISSING')
    console.log('  Counterpoints:', hasCounterpoints ? '✅ OK' : '❌ MISSING')
    console.log('  Common Mistake:', hasCommonMistake ? '✅ OK' : '❌ MISSING')

    if (hasReasoning && hasCounterpoints && hasCommonMistake) {
      console.log('\n✅ ALL TESTS PASSED')
    } else {
      console.log('\n❌ SOME FIELDS MISSING')
    }
  } else {
    console.log('  ❌ FAIL: No questions in VM!')
  }
}

test().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
