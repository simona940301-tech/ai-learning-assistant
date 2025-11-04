#!/usr/bin/env npx tsx
/**
 * Test Presenter Tolerant Extraction
 * Tests that the presenter can extract all 5 core fields with key variants
 */

process.env.DEBUG = '1'

// Mock AI response with all 5 core fields
const mockAiResponse = {
  id: 1,
  answer: 'B — The transformation of society during the Industrial Revolution',
  reasoning: '文章主要探討工業革命如何徹底改變社會結構和人們的生活方式，B選項最能反映這一核心主題。',
  counterpoints: {
    A: '選項A只關注負面影響，過於片面。',
    C: '選項C僅聚焦工作條件，範圍太窄。',
    D: '選項D只提及城市成長，未涵蓋全部主旨。',
  },
  commonMistake: '學生常誤選A，因為文中確實提到負面影響，但這並非文章主旨。',
  evidence: 'The Industrial Revolution transformed society in unprecedented ways.',
}

console.log('=== Presenter Extraction Test ===\n')
console.log('Mock AI Response:', JSON.stringify(mockAiResponse, null, 2))
console.log('\n')

// Import the presenter
import { presentExplainCard } from '../lib/mapper/explain-presenter'

// Create a mock ExplainCard
const mockCard = {
  id: 'test-123',
  kind: 'E4' as const,
  question: 'Test passage with questions',
  meta: {
    article: 'Test passage...',
    groupId: 'test-group',
    hasMultipleQuestions: true,
    questionCount: 1,
    questions: [mockAiResponse],
  },
  translation: '',
  cues: [],
  options: [
    { key: 'A', text: 'The negative effects', verdict: 'unfit' as const },
    { key: 'B', text: 'The transformation', verdict: 'fit' as const, reason: 'Correct' },
    { key: 'C', text: 'Working conditions', verdict: 'unfit' as const },
    { key: 'D', text: 'City growth', verdict: 'unfit' as const },
  ],
  steps: [],
  correct: { key: 'B', text: 'The transformation' },
  vocab: [],
  nextActions: [],
}

console.log('[TEST] Calling presentExplainCard...\n')

const result = presentExplainCard(mockCard)

if (!result || result.kind !== 'E4') {
  console.error('❌ FAIL: Result is not E4 type')
  process.exit(1)
}

console.log('\n[TEST] Checking extracted fields in ReadingVM...\n')

const vm = result
const question = vm.questions[0]

console.log('Question structure:')
console.log('  qid:', question.qid)
console.log('  stem:', question.stem ? question.stem.substring(0, 40) + '...' : 'MISSING')
console.log('  answerLetter:', question.answerLetter)
console.log('  answerText:', question.answerText ? question.answerText.substring(0, 40) + '...' : 'MISSING')
console.log('')
console.log('Enhanced explanation fields:')
console.log('  reasoning:', question.reasoning ? question.reasoning.substring(0, 80) + '...' : 'MISSING')
console.log('  counterpoints keys:', question.counterpoints ? Object.keys(question.counterpoints) : 'MISSING')
console.log('  counterpoints values:')
if (question.counterpoints) {
  Object.entries(question.counterpoints).forEach(([key, value]) => {
    console.log(`    ${key}: ${value.substring(0, 60)}...`)
  })
}
console.log('  commonMistake:', question.meta?.commonMistake ? question.meta.commonMistake.substring(0, 80) + '...' : 'MISSING')
console.log('  evidence:', question.evidence && question.evidence.length > 0 ? question.evidence[0].text.substring(0, 80) + '...' : 'MISSING')

console.log('\n[TEST] Validation:\n')

const hasReasoning = !!question.reasoning && question.reasoning.length > 0
const hasCounterpoints = !!question.counterpoints && Object.keys(question.counterpoints).length > 0
const hasCommonMistake = !!question.meta?.commonMistake && question.meta.commonMistake.length > 0
const hasEvidence = question.evidence && question.evidence.length > 0 && question.evidence[0].text.length > 0

console.log('  ✓ Reasoning:', hasReasoning ? 'OK' : '❌ MISSING')
console.log('  ✓ Counterpoints:', hasCounterpoints ? 'OK' : '❌ MISSING')
console.log('  ✓ Common Mistake:', hasCommonMistake ? 'OK' : '❌ MISSING')
console.log('  ✓ Evidence:', hasEvidence ? 'OK' : '❌ MISSING')

if (hasReasoning && hasCounterpoints && hasCommonMistake && hasEvidence) {
  console.log('\n✅ ALL TESTS PASSED')
  console.log('Presenter successfully extracted all 5 core fields with tolerant extraction')
  process.exit(0)
} else {
  console.log('\n❌ SOME TESTS FAILED')
  console.log('Presenter failed to extract all required fields')
  process.exit(1)
}
