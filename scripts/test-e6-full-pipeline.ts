/**
 * Full E6 Pipeline Test
 * Tests the complete flow: detection → template generation → card validation
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

async function testFullPipeline() {
  const { classifyEnglishType } = await import('../apps/web/lib/english/router')
  const { generateTemplateCard } = await import('../apps/web/lib/english/templates')
  const { parseE6Passage } = await import('../apps/web/lib/english/e6-parser')

  console.log('='.repeat(80))
  console.log('E6 Full Pipeline Test')
  console.log('='.repeat(80))

  // Step 1: Parse passage
  console.log('\n[Step 1] Parsing E6 passage...')
  const parsed = parseE6Passage(sampleE6Question.stem)
  console.log('  Blanks found:', parsed.blanks.length)
  console.log('  Blank details:')
  parsed.blanks.forEach((blank) => {
    console.log(`    - Blank ${blank.blankIndex}: ${blank.anchorId}`)
  })
  console.log('  Warnings:', parsed.warnings.length > 0 ? parsed.warnings : 'None')

  // Step 2: Classify type
  console.log('\n[Step 2] Classifying question type...')
  const route = await classifyEnglishType(sampleE6Question)
  console.log('  Type:', route.type)
  console.log('  Confidence:', route.confidence)
  console.log('  Reason:', route.reason)

  if (route.type !== 'E6') {
    console.error('\n❌ FAILURE: Expected E6, got', route.type)
    process.exit(1)
  }

  // Step 3: Generate template card
  console.log('\n[Step 3] Generating E6 template card...')
  console.log('  Calling OpenAI API for E6 explanation...')

  try {
    const card = await generateTemplateCard({
      route,
      stem: sampleE6Question.stem,
      options: sampleE6Question.options,
    })

    console.log('  Card generated successfully!')
    console.log('\n[Card Details]')
    console.log('  Kind:', card.kind)
    console.log('  Question (first 100 chars):', card.question.slice(0, 100) + '...')
    console.log('  Translation (first 100 chars):', card.translation?.slice(0, 100) + '...')
    console.log('  Options count:', card.options.length)
    console.log('  Correct answer:', card.correct?.key)
    console.log('  Meta.questions:', card.meta?.questions?.length ?? 0)

    // Display meta questions
    if (card.meta?.questions && card.meta.questions.length > 0) {
      console.log('\n[E6 Questions/Answers]')
      card.meta.questions.forEach((q: any, idx: number) => {
        console.log(`  Blank ${q.blankIndex}: ${q.answer}`)
        console.log(`    Connection: ${q.connection?.slice(0, 80)}...`)
        console.log(`    Reason: ${q.reason?.slice(0, 80)}...`)
        if (q.evidence) {
          console.log(`    Evidence: ${q.evidence.slice(0, 80)}...`)
        }
      })
    }

    // Display options with verdicts
    console.log('\n[Options]')
    card.options.forEach((opt) => {
      console.log(`  ${opt.key}: ${opt.text.slice(0, 50)}... (verdict: ${opt.verdict || 'unknown'})`)
      if (opt.zh) {
        console.log(`      翻譯: ${opt.zh}`)
      }
    })

    console.log('\n✅ SUCCESS: E6 pipeline completed successfully!')
    console.log('='.repeat(80))
  } catch (error: any) {
    console.error('\n❌ FAILURE: Template generation failed')
    console.error('Error:', error.message)
    process.exit(1)
  }
}

testFullPipeline().catch(console.error)
