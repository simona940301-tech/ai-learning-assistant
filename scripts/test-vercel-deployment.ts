/**
 * Test script to check Vercel deployment API
 */

const DEPLOYMENT_URL = 'https://plms-learning-b9cp9yh51-simonas-projects-8f1c7391.vercel.app'

async function testDeployment() {
  console.log(`🔍 Testing Vercel deployment: ${DEPLOYMENT_URL}\n`)

  // Test 1: Heartbeat
  console.log('📡 Test 1: API Heartbeat')
  try {
    const heartbeatRes = await fetch(`${DEPLOYMENT_URL}/api/heartbeat`, {
      method: 'GET',
    })
    console.log(`  Status: ${heartbeatRes.status} ${heartbeatRes.statusText}`)
    const heartbeatData = await heartbeatRes.json()
    console.log(`  Response:`, heartbeatData)
  } catch (error) {
    console.error(`  ❌ Error:`, error)
  }

  console.log('\n📡 Test 2: Streaming Solver API')
  try {
    const TEST_QUESTION = `In 2018, Oprah Winfrey interviewed former First Lady Michelle Obama.

What does "interviewed" mean?
(A) Spoke with
(B) Ignored
(C) Avoided
(D) Criticized`

    console.log(`  Sending question: "${TEST_QUESTION.substring(0, 50)}..."`)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000) // 25s timeout

    const response = await fetch(`${DEPLOYMENT_URL}/api/ai/route-solver-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questionText: TEST_QUESTION }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    console.log(`  Status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`  ❌ Error response: ${errorText.substring(0, 500)}`)
      return
    }

    // Read stream
    const reader = response.body?.getReader()
    if (!reader) {
      console.error('  ❌ No reader available')
      return
    }

    const decoder = new TextDecoder()
    let buffer = ''
    let eventCount = 0
    let hasError = false
    let hasComplete = false

    console.log('  📥 Reading stream events...')

    const streamTimeout = setTimeout(() => {
      console.error(`  ⏱️  Stream timeout after 20s`)
      reader.cancel()
    }, 20000)

    try {
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

            if (event.type === 'status') {
              console.log(`    [${eventCount}] status: ${event.data.message || event.data.stage}`)
            } else if (event.type === 'question') {
              console.log(`    [${eventCount}] question: Completed #${event.data.index + 1}`)
            } else if (event.type === 'complete') {
              hasComplete = true
              console.log(`    [${eventCount}] complete: Card received (kind: ${event.data.card?.kind})`)
            } else if (event.type === 'error') {
              hasError = true
              console.error(`    [${eventCount}] ❌ ERROR: ${event.data.message}`)
              if (event.data.details) {
                console.error(`      Details:`, event.data.details)
              }
              if (event.data.buffer) {
                console.error(`      Buffer preview:`, event.data.buffer.substring(0, 200))
              }
            } else if (event.type === 'done') {
              console.log(`    [${eventCount}] done`)
            } else {
              console.log(`    [${eventCount}] ${event.type}`)
            }
          } catch (err) {
            console.warn(`    ⚠️  Parse error:`, err)
          }
        }
      }
    } finally {
      clearTimeout(streamTimeout)
    }

    console.log(`\n  📊 Summary:`)
    console.log(`    - Total events: ${eventCount}`)
    console.log(`    - Has complete event: ${hasComplete ? '✅' : '❌'}`)
    console.log(`    - Has error event: ${hasError ? '⚠️' : '✅ No errors'}`)

    if (!hasComplete && !hasError) {
      console.error(`\n  ❌ ISSUE: Stream ended without 'complete' or 'error' event`)
      console.error(`     This likely means the OpenAI API call is failing silently`)
    }

  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`  ❌ Request timeout after 25s - likely an API issue`)
    } else {
      console.error(`  ❌ Error:`, error)
    }
  }
}

testDeployment().catch(console.error)
