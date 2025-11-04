/**
 * Intent Router API
 * Determines which action to take based on user input
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'
import { IntentRouterRequestSchema, IntentRouterResponseSchema, type SolveIntent } from '@/lib/solve-types'

const INTENT_ROUTER_SYSTEM_PROMPT = `You are the Intent Router for the PLMS Solve system.
Decide which of the following best matches the student's request:

- ExplainQuestion      // solve the given question(s)
- GenerateSimilar      // find similar/past-paper questions
- SummarizeKeyPoints   // produce exam tips/key ideas

Rules:
• If question text/image exists → ExplainQuestion
• If mentions "歷屆/相似/再練幾題/類似題/相關題目" → GenerateSimilar
• If mentions "重點/考點/整理/統整/要點" → SummarizeKeyPoints
• Never propose GenerateQuiz/Diagnose/Report.

Return JSON only with this exact structure:
{
  "intent": "ExplainQuestion" | "GenerateSimilar" | "SummarizeKeyPoints",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { input, context } = IntentRouterRequestSchema.parse(body)

    console.log('[intent-router] input:', input.substring(0, 100))

    // Build user prompt
    let userPrompt = `User input: "${input}"`
    if (context?.hasImage) {
      userPrompt += '\nNote: User uploaded an image (likely a question screenshot).'
    }
    if (context?.previousIntent) {
      userPrompt += `\nPrevious intent: ${context.previousIntent}`
    }

    // Call OpenAI
    const result = await chatCompletionJSON<{
      intent: SolveIntent
      confidence: number
      reasoning?: string
    }>(
      [
        { role: 'system', content: INTENT_ROUTER_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0.1 }
    )

    // Validate response
    const validated = IntentRouterResponseSchema.parse(result)

    const latency = Date.now() - startTime
    console.log(`[intent-router] result: ${validated.intent} (${validated.confidence}) in ${latency}ms`)

    // Emit event
    // TODO: emit('ai.intent_routed', { intent: validated.intent, latency })

    return NextResponse.json({
      ...validated,
      _meta: { latency_ms: latency },
    })
  } catch (error) {
    console.error('[intent-router] error:', error)
    const latency = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'intent_router_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
