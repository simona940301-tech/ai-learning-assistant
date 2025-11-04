/**
 * Test E6 Detection with User's Sample Question
 * This should detect as E6, not E4
 */

const sampleE6Question = {
  stem: `Antoine de Saint-Exupèry's tale of a pilot and a young alien prince has been loved by readers since it was first published in 1943. Even if you are very familiar with The Little Prince, (1). First, when Saint-Exupèry wrote about the novel's narrator(敘述者)crashing in the Sahara, he was in fact writing about what he had gone through himself. Before World War II (2) and writer who had flown mail routes in Africa and South America and even worked as a test pilot. (3), Saint-Exupèry crashed his plane in the desert 125 miles outside of Cairo. (4) that Saint-Exupèry was inspired by the Hans Christian Andersen fairy tale "The Little Mermaid." In the early 1940s, (5) that had been caused by his plane crashes. There, his friend read him a story—"The Little Mermaid"— that was said to have inspired Saint-Exupèry to write a fairy tale of his own.`,
  options: [
    { key: 'A', text: 'there are probably a few things you may not know about this story' },
    { key: 'B', text: 'Saint-Exupèry was stuck in a hospital while he recovered from various injuries' },
    { key: 'C', text: 'During an attempt to break the record for the fastest trip between Paris and Saigon' },
    { key: 'D', text: 'Another anecdote(軼事) about The Little Prince is a common theory' },
    { key: 'E', text: 'Saint-Exupery was celebrated as a brave pilot' },
  ],
}

async function testE6Detection() {
  const { classifyEnglishType } = await import('../apps/web/lib/english/router')

  console.log('='.repeat(80))
  console.log('Testing E6 Detection with User Sample Question')
  console.log('='.repeat(80))

  // Debug metrics
  const stem = sampleE6Question.stem
  const options = sampleE6Question.options

  // Extract metrics manually
  const blankMatches = stem.match(/\(\d+\)/g) ?? []
  const uniqueNumberedBlanks = new Set(blankMatches.map((token) => token.replace(/\D/g, ''))).size
  const hasNumberedBlanks = uniqueNumberedBlanks >= 2 || blankMatches.length >= 2

  const optionTexts = options.map((o) => o.text.toLowerCase().trim())
  const choicesAreFullSentences = optionTexts.some((text) => {
    const wordCount = text.split(/\s+/).length
    const hasPunctuation = /[.!?。！？]$/.test(text.trim())
    const startsWithCapital = /^[A-Z]/.test(text.trim())
    return (wordCount >= 8 || hasPunctuation) && startsWithCapital
  })

  const sentenceCount = optionTexts.filter((text) => {
    const wordCount = text.split(/\s+/).length
    const hasPunctuation = /[.!?。！？]$/.test(text.trim())
    const startsWithCapital = /^[A-Z]/.test(text.trim())
    return (wordCount >= 8 || hasPunctuation) && startsWithCapital
  }).length

  const sentenceRatio = sentenceCount / options.length

  console.log('\nManual Metrics:')
  console.log('  Blank matches:', blankMatches)
  console.log('  Unique numbered blanks:', uniqueNumberedBlanks)
  console.log('  Has numbered blanks:', hasNumberedBlanks)
  console.log('  Passage length:', stem.length)
  console.log('  Options count:', options.length)
  console.log('  Sentence count:', sentenceCount)
  console.log('  Sentence ratio:', sentenceRatio)
  console.log('  Choices are full sentences:', choicesAreFullSentences)

  console.log('\nOption Analysis:')
  options.forEach((opt, idx) => {
    const text = opt.text
    const wordCount = text.split(/\s+/).length
    const hasPunctuation = /[.!?。！？]$/.test(text.trim())
    const startsWithCapital = /^[A-Z]/.test(text.trim())
    const isSentence = (wordCount >= 8 || hasPunctuation) && startsWithCapital

    console.log(`  ${opt.key}: words=${wordCount}, punct=${hasPunctuation}, cap=${startsWithCapital}, isSentence=${isSentence}`)
    console.log(`      ${text.slice(0, 60)}${text.length > 60 ? '...' : ''}`)
  })

  console.log('\nExpected Detection:')
  console.log('  Should be: E6 (Paragraph Organization)')
  console.log('  Reason: Long passage + 5 numbered blanks + sentence options')

  console.log('\n' + '-'.repeat(80))
  console.log('Running classifier...')
  console.log('-'.repeat(80) + '\n')

  const result = await classifyEnglishType(sampleE6Question)

  console.log('\nDetection Result:')
  console.log('  Type:', result.type)
  console.log('  Confidence:', result.confidence)
  console.log('  Reason:', result.reason)
  console.log('  Signals:', result.signals)

  if (result.type === 'E6') {
    console.log('\n✅ SUCCESS: Correctly detected as E6')
  } else {
    console.log('\n❌ FAILURE: Detected as', result.type, 'instead of E6')
    console.log('\nDEBUG: Checking E6 detection logic:')
    console.log('  1. hasNumberedBlanks:', hasNumberedBlanks, '(need: true)')
    console.log('  2. passageLength >= 200:', stem.length >= 200, `(${stem.length} >= 200)`)
    console.log('  3. choicesShape === "sentences":', choicesAreFullSentences, '(need: true)')
    console.log('  4. optionsCount 4-6:', options.length >= 4 && options.length <= 6, `(${options.length} in [4,6])`)
    console.log('  5. sentenceRatio >= 0.5:', sentenceRatio >= 0.5, `(${sentenceRatio} >= 0.5)`)
  }

  console.log('\n' + '='.repeat(80))
}

testE6Detection().catch(console.error)
