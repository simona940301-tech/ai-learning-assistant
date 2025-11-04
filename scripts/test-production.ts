/**
 * Test production deployment
 */

const PRODUCTION_URL = 'https://plms-learning.vercel.app'

async function testProduction() {
  console.log(`🔍 Testing production: ${PRODUCTION_URL}\n`)

  const TEST_QUESTION = `In 2018, Oprah Winfrey interviewed former First Lady Michelle Obama in front of 20,000 fans at Washington's Capital One Arena. The event was part of Obama's book tour for her memoir "Becoming."

What does "memoir" mean in this context?
(A) A fictional story
(B) An autobiography
(C) A history textbook
(D) A poetry collection`

  console.log(`📡 Testing: /api/ai/route-solver-stream`)
  console.log(`📝 Question: "${TEST_QUESTION.substring(0, 80)}..."\n`)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => {
      console.error('⏱️  Timeout after 30s - aborting request')
      controller.abort()
    }, 30000)

    const response = await fetch(`${PRODUCTION_URL}/api/ai/route-solver-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: TEST_QUESTION }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    console.log(`✅ Response: ${response.status} ${response.statusText}`)
    console.log(`📋 Content-Type: ${response.headers.get('content-type')}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`\n❌ Error response:`, errorText.substring(0, 1000))
      return
    }

    const reader = response.body?.getReader()
    if (!reader) {
      console.error('\n❌ No response body reader')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let eventCount = 0
    let finalCard = null
    let hasError = false

    console.log('\n📥 Streaming events:\n')

    const streamTimeout = setTimeout(() => {
      console.error(`⏱️  Stream reading timeout after 25s`)
      reader.cancel()
    }, 25000)

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log('\n✅ Stream ended')
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const event = JSON.parse(line.slice(6))
            eventCount++

            if (event.type === 'status') {
              console.log(`  [${eventCount}] 🔄 Status: ${event.data.message || event.data.stage}`)
            } else if (event.type === 'question') {
              console.log(`  [${eventCount}] ✅ Question ${event.data.index + 1} completed`)
            } else if (event.type === 'complete') {
              finalCard = event.data.card
              console.log(`  [${eventCount}] 🎉 Complete: Card received (kind: ${finalCard?.kind})`)
            } else if (event.type === 'error') {
              hasError = true
              console.error(`  [${eventCount}] ❌ ERROR: ${event.data.message}`)
              if (event.data.details) {
                console.error(`      Details:`, JSON.stringify(event.data.details, null, 2))
              }
              if (event.data.buffer) {
                console.error(`      Buffer:`, event.data.buffer)
              }
            } else if (event.type === 'done') {
              console.log(`  [${eventCount}] ✓ Done`)
            } else {
              console.log(`  [${eventCount}] ${event.type}: ${JSON.stringify(event.data).substring(0, 100)}`)
            }
          } catch (err) {
            console.warn(`  ⚠️  Parse error:`, err, '\n      Line:', line.substring(0, 200))
          }
        }
      }
    } finally {
      clearTimeout(streamTimeout)
    }

    console.log(`\n📊 RESULTS:`)
    console.log(`  - Total events: ${eventCount}`)
    console.log(`  - Final card: ${finalCard ? '✅ YES' : '❌ NO'}`)
    console.log(`  - Errors: ${hasError ? '⚠️  YES' : '✅ NO'}`)

    if (finalCard) {
      console.log(`\n✅ SUCCESS! Card details:`)
      console.log(`  - ID: ${finalCard.id}`)
      console.log(`  - Kind: ${finalCard.kind}`)
      console.log(`  - Translation: ${finalCard.translation?.substring(0, 100)}...`)
      console.log(`  - Questions: ${finalCard.meta?.questions?.length || 0}`)

      if (finalCard.meta?.questions?.[0]) {
        const q = finalCard.meta.questions[0]
        console.log(`\n  📝 First question:`)
        console.log(`    - Answer: ${q.answer}`)
        console.log(`    - Reasoning: ${q.reasoningText?.substring(0, 150) || 'N/A'}...`)
        console.log(`    - Evidence: ${q.evidence?.substring(0, 100) || 'N/A'}...`)
      }
    } else if (!hasError) {
      console.error(`\n❌ FAILURE: Stream completed but no card was received`)
      console.error(`   This indicates the OpenAI response parsing failed silently`)
      console.error(`   Remaining buffer: ${buffer.substring(0, 500)}`)
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('\n❌ Request aborted due to timeout')
    } else {
      console.error('\n❌ Error:', error)
      if (error.stack) console.error(error.stack)
    }
  }
}

testProduction().catch(console.error)
