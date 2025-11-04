/**
 * Comprehensive E6/E7 Detection Test
 * Ensures router correctly distinguishes between:
 * - E6: Paragraph organization (long passage + numbered blanks + sentence options)
 * - E7: Contextual completion (passage + numbered blanks + word/phrase options)
 * - E4: Reading comprehension (passage + Q1/Q2 markers + options)
 */

const testCases = [
  {
    name: 'E6: User Sample - Little Prince',
    expected: 'E6',
    input: {
      stem: `Antoine de Saint-Exupèry's tale of a pilot and a young alien prince has been loved by readers since it was first published in 1943. Even if you are very familiar with The Little Prince, (1). First, when Saint-Exupèry wrote about the novel's narrator(敘述者)crashing in the Sahara, he was in fact writing about what he had gone through himself. Before World War II (2) and writer who had flown mail routes in Africa and South America and even worked as a test pilot. (3), Saint-Exupèry crashed his plane in the desert 125 miles outside of Cairo. (4) that Saint-Exupèry was inspired by the Hans Christian Andersen fairy tale "The Little Mermaid." In the early 1940s, (5) that had been caused by his plane crashes. There, his friend read him a story—"The Little Mermaid"— that was said to have inspired Saint-Exupèry to write a fairy tale of his own.`,
      options: [
        { key: 'A', text: 'there are probably a few things you may not know about this story' },
        { key: 'B', text: 'Saint-Exupèry was stuck in a hospital while he recovered from various injuries' },
        { key: 'C', text: 'During an attempt to break the record for the fastest trip between Paris and Saigon' },
        { key: 'D', text: 'Another anecdote(軼事) about The Little Prince is a common theory' },
        { key: 'E', text: 'Saint-Exupery was celebrated as a brave pilot' },
      ],
    },
  },
  {
    name: 'E6: Typical paragraph organization',
    expected: 'E6',
    input: {
      stem: `Climate change has become one of the most pressing issues of our time. (1) Scientists have been warning about the dangers of global warming for decades. The evidence is clear: rising sea levels, extreme weather events, and changing ecosystems. (2) Many countries have committed to reducing their carbon emissions. However, the challenge is enormous. (3) It requires cooperation between governments, businesses, and individuals. Some argue that technology will save us, while others believe we need fundamental changes to our way of life. (4) The debate continues, but one thing is certain: we must act now.`,
      options: [
        { key: 'A', text: 'The impact is already being felt around the world' },
        { key: 'B', text: 'International agreements like the Paris Accord aim to address this crisis' },
        { key: 'C', text: 'Renewable energy sources offer hope for a sustainable future' },
        { key: 'D', text: 'Time is running out to prevent the worst consequences' },
      ],
    },
  },
  {
    name: 'E7: Vocabulary cloze with numbered blanks',
    expected: 'E7',
    input: {
      stem: `The researchers conducted a comprehensive study to (1) the effects of social media on mental health. Their findings were (2), showing both positive and negative impacts. While social media can help people stay (3), it can also lead to feelings of isolation and (4). The team recommended that users be more (5) about their online habits.`,
      options: [
        { key: 'A', text: 'investigate' },
        { key: 'B', text: 'surprising' },
        { key: 'C', text: 'connected' },
        { key: 'D', text: 'anxiety' },
        { key: 'E', text: 'mindful' },
        { key: 'F', text: 'reveal' },
        { key: 'G', text: 'complex' },
        { key: 'H', text: 'isolated' },
        { key: 'I', text: 'depression' },
        { key: 'J', text: 'aware' },
      ],
    },
  },
  {
    name: 'E7: Short phrase options',
    expected: 'E7',
    input: {
      stem: `The new policy aims to (1) environmental protection while (2) economic growth. This balance is (3) to achieve but (4) for sustainable development.`,
      options: [
        { key: 'A', text: 'promote' },
        { key: 'B', text: 'maintaining' },
        { key: 'C', text: 'difficult' },
        { key: 'D', text: 'essential' },
        { key: 'E', text: 'encourage' },
        { key: 'F', text: 'sustaining' },
      ],
    },
  },
  {
    name: 'E4: Reading comprehension with Q1/Q2',
    expected: 'E4',
    input: {
      stem: `The Amazon rainforest is often called the "lungs of the Earth" because it produces about 20% of the world's oxygen. However, deforestation has been increasing at an alarming rate.

Q1. What percentage of the world's oxygen does the Amazon produce?
Q2. What is the main threat to the Amazon rainforest mentioned in the passage?`,
      options: [
        { key: 'A', text: '10%' },
        { key: 'B', text: '20%' },
        { key: 'C', text: '30%' },
        { key: 'D', text: 'Deforestation' },
      ],
    },
  },
  {
    name: 'E1: Single vocabulary question',
    expected: 'E1',
    input: {
      stem: `The scientist's research was ( ) by many experts in the field.`,
      options: [
        { key: 'A', text: 'praised' },
        { key: 'B', text: 'criticized' },
        { key: 'C', text: 'ignored' },
        { key: 'D', text: 'rejected' },
      ],
    },
  },
]

async function runTests() {
  const { classifyEnglishType } = await import('../apps/web/lib/english/router')

  console.log('='.repeat(80))
  console.log('E6/E7 Comprehensive Detection Test')
  console.log('='.repeat(80))

  let passed = 0
  let failed = 0

  for (const testCase of testCases) {
    console.log(`\n${'─'.repeat(80)}`)
    console.log(`Test: ${testCase.name}`)
    console.log(`Expected: ${testCase.expected}`)

    const result = await classifyEnglishType(testCase.input)

    const success = result.type === testCase.expected
    const icon = success ? '✅' : '❌'

    console.log(`${icon} Result: ${result.type} (confidence: ${result.confidence})`)
    console.log(`   Reason: ${result.reason}`)

    if (!success) {
      console.log(`   ⚠️  MISMATCH: Expected ${testCase.expected}, got ${result.type}`)
      failed++
    } else {
      passed++
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log(`Test Results: ${passed}/${testCases.length} passed`)
  console.log('='.repeat(80))

  if (failed > 0) {
    console.log(`\n❌ ${failed} test(s) failed`)
    process.exit(1)
  } else {
    console.log('\n✅ All tests passed!')
  }
}

runTests().catch(console.error)
