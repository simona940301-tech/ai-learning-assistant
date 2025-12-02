/**
 * Test script to debug explain API hanging issue
 */

const testQuestion = `The invitation card is of great      to Ms. Wang, for the bridegroom was her student ten years ago, who once went astray.  (A)  complexity  (B) acquaintance  (C)  significance  (D)  reflection`

async function testExplainAPI() {
  console.log('🔍 Testing /api/explain endpoint...\n')
  console.log('Question:', testQuestion.substring(0, 100) + '...\n')

  const startTime = Date.now()

  try {
    const response = await fetch('http://localhost:3000/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: { text: testQuestion },
        mode: 'deep',
        conservative: false,
      }),
    })

    const elapsed = Date.now() - startTime
    console.log(`⏱️  Response received in ${elapsed}ms`)
    console.log(`📊 Status: ${response.status} ${response.statusText}\n`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return
    }

    const data = await response.json()
    console.log('✅ Response data:')
    console.log('- kind:', data.kind)
    console.log('- answer:', data.answer)
    console.log('- briefReason:', data.briefReason?.substring(0, 50))
    console.log('- markdown length:', data.markdown?.length || data.fullExplanation?.length || 0)
    console.log('- status:', data.status)
    console.log('- meta:', data.meta)

    if (data.structured) {
      console.log('\n📦 Structured data found:')
      console.log('- question:', data.structured.question?.substring(0, 50))
      console.log('- answer:', data.structured.answer)
      console.log('- reasoning:', data.structured.reasoning?.substring(0, 50))
    }

    if (data.questions) {
      console.log('\n📦 Questions array found:', data.questions.length, 'questions')
    }

    if (data.sharedPassage) {
      console.log('\n📦 SharedPassage found')
    }

  } catch (error) {
    const elapsed = Date.now() - startTime
    console.error(`❌ Request failed after ${elapsed}ms:`, error)
  }
}

testExplainAPI()
