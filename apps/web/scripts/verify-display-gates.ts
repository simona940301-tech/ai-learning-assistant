#!/usr/bin/env npx tsx
/**
 * Verify Display Gates - Check that VM flags are correctly computed
 */

process.env.DEBUG = '1'

const mockPassage = `
The Industrial Revolution transformed society in unprecedented ways.

Question 41: What does the passage mainly discuss?
(A) The negative effects
(B) The transformation of society
(C) Working conditions
(D) City growth
`.trim()

import { generateTemplateCard } from '../lib/english/templates'
import { presentExplainCard } from '../lib/mapper/explain-presenter'

async function verify() {
  console.log('=== Verifying Display Gates ===\n')

  // Step 1: Generate card
  console.log('[Step 1] Generating ExplainCard...')
  const card = await generateTemplateCard({
    route: { type: 'E4' },
    stem: mockPassage,
    options: [],
    meta: {},
  })

  // Step 2: Present card to VM
  console.log('\n[Step 2] Presenting to ReadingVM...')
  const vm = presentExplainCard(card)

  if (!vm || vm.kind !== 'E4') {
    console.error('❌ FAIL: VM is not E4 type')
    return
  }

  console.log('\n[Step 3] Checking display flags...\n')

  const q = vm.questions[0]
  if (!q) {
    console.error('❌ FAIL: No questions in VM')
    return
  }

  console.log('Question:', q.qid)
  console.log('\nDisplay Flags:')
  console.log('  hasReasoning:', q.hasReasoning)
  console.log('  hasCounterpoints:', q.hasCounterpoints)

  console.log('\nActual Content:')
  console.log('  reasoning:', q.reasoning ? `"${q.reasoning.substring(0, 60)}..."` : 'MISSING')
  console.log('  counterpoints keys:', q.counterpoints ? Object.keys(q.counterpoints) : 'MISSING')
  console.log('  counterpoints sample:', q.counterpoints ? Object.entries(q.counterpoints)[0] : 'MISSING')
  console.log('  commonMistake:', q.meta.commonMistake ? `"${q.meta.commonMistake.substring(0, 60)}..."` : 'MISSING')

  console.log('\n[Step 4] Validation...\n')

  const checks = {
    'hasReasoning flag matches content': q.hasReasoning === !!(q.reasoning && q.reasoning.length > 0),
    'hasCounterpoints flag matches content': q.hasCounterpoints === !!(q.counterpoints && Object.keys(q.counterpoints).length > 0),
    'counterpoints keys are uppercase A-D': q.counterpoints ? Object.keys(q.counterpoints).every(k => /^[A-D]$/.test(k)) : true,
    'at least one display flag is true': q.hasReasoning || q.hasCounterpoints,
  }

  let allPassed = true
  Object.entries(checks).forEach(([check, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${check}`)
    if (!passed) allPassed = false
  })

  if (allPassed) {
    console.log('\n✅ ALL CHECKS PASSED')
    console.log('Display gates are working correctly!')
  } else {
    console.log('\n❌ SOME CHECKS FAILED')
    console.log('Review the flags calculation in Presenter')
  }
}

verify().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
