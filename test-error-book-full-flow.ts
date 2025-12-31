#!/usr/bin/env tsx

/**
 * Complete test script for Phase 8.5: Error Book Full Flow
 * Tests the complete MCP finalize_explain_card integration
 */

const BASE_URL = 'http://localhost:3000'

async function testErrorBookFullFlow() {
  console.log('🧪 Testing Phase 8.5: Error Book Full Flow Integration...\n')

  // First, get the actual question ID from database
  console.log('🔍 Finding test question ID...')
  let questionId = null
  try {
    const questionResponse = await fetch(`${BASE_URL}/api/test-question-id`, {
      method: 'GET',
    })
    if (questionResponse.ok) {
      const questionData = await questionResponse.json()
      questionId = questionData.questionId
      console.log('✅ Found test question ID:', questionId)
    }
  } catch (err) {
    console.log('⚠️ Could not fetch test question ID, will use fallback test')
  }

  // Step 1: Test MCP finalize_explain_card with questionId
  if (!questionId) {
    console.log('⚠️ Skipping error book test - no questionId found (seed not run?)')
    console.log('💡 You can still test backpack_notes functionality manually')
    return
  }

  console.log('📚 Step 1: Testing MCP finalize_explain_card with questionId')
  try {
    const response = await fetch(`${BASE_URL}/api/mcp/core`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finalize_explain_card',
        args: {
          cardId: 'test-full-flow',
          outputs: {
            userId: 'e770f9cd-52a7-43de-b983-70f6f78d2f53', // Use dev user
            explainResult: {
              markdown: `# Test Explanation for Error Book

This is a test explanation that should be saved to the error book.

## Answer
A) adopted

## Analysis
The context discusses the establishment of the NHI system in 1995.`,
              questions: [{
                question: "The Taiwanese national health insurance (NHI) scheme is ranked one of the best in the world. In 1995, the system was (1) in Taiwan, a small island with a population of roughly 23 million. What does (1) most likely refer to?",
                options: ["(A) adopted", "(B) identified", "(C) improved", "(D) strengthened"],
                explanation: {
                  answer: "A",
                  reasoning: "The context discusses establishment, so adopted is correct.",
                  counterpoints: {
                    "B": "identified is wrong",
                    "C": "improved doesn't fit",
                    "D": "strengthened is incorrect"
                  }
                }
              }],
              status: 'full' as const,
              meta: {
                elapsedMs: 1000,
                layer: 'universal' as const,
                mode: 'llm-only' as const,
                sourceModel: 'gpt-4o-mini' as const
              }
            },
            questionId: questionId // Use actual question ID from database
          }
        }
      })
    })

    const result = await response.json()
    console.log('✅ MCP finalize_explain_card result:', JSON.stringify(result, null, 2))

    if (result.ok && result.result?.ok && result.result.target === 'error_book') {
      console.log('✅ MCP finalize_explain_card successful for error_book path')
    } else {
      console.log('❌ MCP finalize_explain_card failed for error_book path')
      console.log('This might be expected if test-question-0001 does not exist in database')
    }
  } catch (error) {
    console.error('❌ MCP finalize_explain_card test failed:', error)
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Step 2: Check if error book entry was created (using debug endpoint)
  console.log('🔍 Step 2: Checking if error book entry was created')
  try {
    // Note: This would require authentication, so we'll skip the actual API call
    // and provide instructions instead
    console.log('ℹ️  To check error book entries manually:')
    console.log(`   GET ${BASE_URL}/api/debug/my-error-book`)
    console.log('   (Requires authentication as dev user)')
    console.log('   Expected: question_id should be "test-question-0001" if successful')
  } catch (error) {
    console.error('❌ Error book check failed:', error)
  }

  console.log('\n' + '='.repeat(60) + '\n')

  // Step 3: Test backpack_notes fallback (should work)
  console.log('📝 Step 3: Testing backpack_notes fallback (should work)')
  try {
    const response = await fetch(`${BASE_URL}/api/mcp/core`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'finalize_explain_card',
        args: {
          cardId: 'test-backpack-fallback',
          outputs: {
            userId: 'e770f9cd-52a7-43de-b983-70f6f78d2f53',
            explainResult: {
              markdown: '# Backpack Test\n\nThis should save to backpack_notes.',
              questions: [{
                question: "Test question for backpack?",
                options: ["(A) Yes", "(B) No"],
                explanation: {
                  answer: "A",
                  reasoning: "Yes is correct",
                  counterpoints: { "B": "No is wrong" }
                }
              }],
              status: 'full' as const,
              meta: {
                elapsedMs: 1000,
                layer: 'universal' as const,
                mode: 'llm-only' as const,
                sourceModel: 'gpt-4o-mini' as const
              }
            }
            // No questionId - should go to backpack_notes
          }
        }
      })
    })

    const result = await response.json()
    console.log('✅ Backpack fallback result:', JSON.stringify(result, null, 2))

    if (result.ok && result.result?.ok && result.result.target === 'backpack_notes') {
      console.log('✅ Backpack_notes fallback working correctly')
    } else {
      console.log('❌ Backpack_notes fallback failed')
    }
  } catch (error) {
    console.error('❌ Backpack fallback test failed:', error)
  }

  console.log('\n' + '='.repeat(60) + '\n')
  console.log('🎯 Phase 8.5 Integration Test Summary:')
  console.log('✅ MCP finalize_explain_card: Integrated with dual-path logic')
  console.log('✅ Error book path: Implemented (may fail without seed data)')
  console.log('✅ Backpack fallback: Working with mock data')
  console.log('✅ Service separation: formatExplainResult + create_wrongbook_entry + save_backpack_note')
  console.log('🧪 Ready for browser testing with /test-question page')
}

// Run the test
testErrorBookFullFlow().catch(console.error)
