/**
 * Test script to diagnose explanation generation issues
 * Run with: npx tsx scripts/test-explain-generation.ts
 */

const TEST_QUESTION = `In 2018, Oprah Winfrey interviewed former First Lady Michelle Obama in front of 20,000 fans at Washington's Capital One Arena. The event was part of Obama's book tour for her memoir "Becoming."

What does "memoir" mean in this context?
(A) A fictional story
(B) An autobiography
(C) A history textbook
(D) A poetry collection`

async function testExplainGeneration() {
  console.log('🔍 Testing explanation generation...\n')

  const apiUrl = 'http://127.0.0.1:3000/api/ai/route-solver-stream'

  console.log(`📡 Calling: ${apiUrl}`)
  console.log(`📝 Question: ${TEST_QUESTION.substring(0, 100)}...\n`)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: TEST_QUESTION }),
    })

    console.log(`✅ Response status: ${response.status} ${response.statusText}`)
    console.log(`📋 Headers:`, Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ Error response:`, errorText)
      return
    }

    // Read SSE stream
    const reader = response.body?.getReader()
    if (!reader) {
      console.error('❌ No response body reader')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let eventCount = 0
    let finalCard = null

    console.log('\n📡 Streaming events:\n')

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        try {
          const event = JSON.parse(line.slice(6))
          eventCount++

          console.log(`[Event ${eventCount}] Type: ${event.type}`)

          if (event.type === 'status') {
            console.log(`  └─ Message: ${event.data.message || event.data.stage}`)
          } else if (event.type === 'question') {
            console.log(`  └─ Question ${event.data.index + 1} completed`)
          } else if (event.type === 'complete') {
            finalCard = event.data.card
            console.log(`  └─ Final card received (kind: ${finalCard?.kind})`)
          } else if (event.type === 'error') {
            console.error(`  └─ ERROR: ${event.data.message}`)
            if (event.data.details) {
              console.error(`  └─ Details:`, event.data.details)
            }
          } else if (event.type === 'done') {
            console.log(`  └─ Stream complete`)
          }
        } catch (err) {
          console.warn(`⚠️  Parse error:`, err)
        }
      }
    }

    console.log(`\n📊 Summary:`)
    console.log(`  - Total events: ${eventCount}`)
    console.log(`  - Final card: ${finalCard ? '✅ Received' : '❌ Not received'}`)

    if (finalCard) {
      console.log(`\n✅ CARD STRUCTURE:`)
      console.log(`  - ID: ${finalCard.id}`)
      console.log(`  - Kind: ${finalCard.kind}`)
      console.log(`  - Translation length: ${finalCard.translation?.length || 0}`)
      console.log(`  - Questions: ${finalCard.meta?.questions?.length || 0}`)

      if (finalCard.meta?.questions?.[0]) {
        const q = finalCard.meta.questions[0]
        console.log(`\n  First Question:`)
        console.log(`    - Answer: ${q.answer}`)
        console.log(`    - Reasoning: ${q.reasoningText?.substring(0, 100)}...`)
        console.log(`    - Evidence: ${q.evidence?.substring(0, 100)}...`)
      }
    } else {
      console.error(`\n❌ NO CARD RECEIVED - Explanation generation failed!`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
  }
}

// Run test
testExplainGeneration().catch(console.error)
