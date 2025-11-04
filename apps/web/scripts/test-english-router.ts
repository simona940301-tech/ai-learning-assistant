/**
 * Manual test script for English explanation pipeline
 * Run: npx tsx apps/web/scripts/test-english-router.ts
 */

import { orchestrateEnglishExplanation } from '../lib/english'

const testCases = [
  {
    name: 'E1: Vocabulary (terrorist attack)',
    input: {
      stem: 'There are reports coming in that a number of people have been injured in a terrorist ____.',
      options: [
        { key: 'A', text: 'access' },
        { key: 'B', text: 'supply' },
        { key: 'C', text: 'attack' },
        { key: 'D', text: 'burden' },
      ],
    },
  },
  {
    name: 'E3: Logic connector (however)',
    input: {
      stem: 'The weather was terrible; however, we ____ decided to go hiking.',
      options: [
        { key: 'A', text: 'still' },
        { key: 'B', text: 'never' },
        { key: 'C', text: 'rarely' },
        { key: 'D', text: 'hardly' },
      ],
    },
  },
  {
    name: 'E2: Grammar (tense)',
    input: {
      stem: 'If I ____ more time, I would travel around the world.',
      options: [
        { key: 'A', text: 'have' },
        { key: 'B', text: 'had' },
        { key: 'C', text: 'will have' },
        { key: 'D', text: 'would have' },
      ],
    },
  },
]

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗')
  console.log('║  English Explanation Pipeline - Manual Tests          ║')
  console.log('╚════════════════════════════════════════════════════════╝\n')
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.name}`)
    console.log('─'.repeat(60))
    console.log(`Question: ${testCase.input.stem}`)
    console.log(`Options: ${testCase.input.options.map((o) => `(${o.key}) ${o.text}`).join(', ')}\n`)
    
    try {
      const result = await orchestrateEnglishExplanation(testCase.input)
      
      console.log(`✅ Routing:`)
      console.log(`   Type: ${result.routing.type}`)
      console.log(`   Confidence: ${result.routing.confidence}`)
      console.log(`   Signals: ${result.routing.signals.join(', ')}`)
      console.log(`   Reason: ${result.routing.reason}\n`)
      
      console.log(`📊 Card Output:`)
      console.log(`   ID: ${result.card.id}`)
      console.log(`   Kind: ${result.card.kind}`)
      console.log(`   Translation: ${result.card.translation}`)
      console.log(`   Cues: ${result.card.cues.join(', ')}`)
      console.log(`   Options: ${result.card.options.length} analyzed`)
      console.log(`   Steps: ${result.card.steps.length}`)
      console.log(`   Vocab: ${result.card.vocab.length} items`)
      
      if (result.card.vocab.length > 0) {
        console.log(`   Vocab items: ${result.card.vocab.map((v) => v.term).join(', ')}`)
      }
      
      if (result.card.correct) {
        console.log(`   Correct: (${result.card.correct.key}) ${result.card.correct.text}`)
      }
      
      if (result.issues && result.issues.length > 0) {
        console.log(`\n⚠️  Validation Issues:`)
        result.issues.forEach((issue) => console.log(`   - ${issue}`))
      }
      
      console.log(`\n✅ Test passed!`)
    } catch (error) {
      console.error(`❌ Test failed:`, error)
    }
  }
  
  console.log('\n' + '═'.repeat(60))
  console.log('✅ All tests completed!\n')
}

// Run tests
runTests().catch(console.error)

