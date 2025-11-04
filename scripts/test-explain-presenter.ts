// Quick test of explain-presenter to check for errors

import { parseReading } from '../apps/web/lib/english/reading-parser'

const testInput = `In 2015, President Obama signed the ESSA.

（）(1) What is the main idea?
(A) Option A
(B) Option B
(C) Option C
(D) Option D`

console.log('Testing parser...')
const result = parseReading(testInput)
console.log('✅ Parser works')
console.log('Passage length:', result.passage.length)
console.log('Questions:', result.questions.length)
console.log('Warnings:', result.warnings)

console.log('\n✅ No errors in basic parsing')
console.log('If browser is still loading, check:')
console.log('1. Network tab for failed requests')
console.log('2. Console for React errors')
console.log('3. Check if any API endpoint is hanging')
