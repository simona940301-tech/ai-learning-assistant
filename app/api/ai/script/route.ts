/**
 * Script Generator API
 * Produces plms.script.v1 JSON for execution
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'
import {
  ScriptGeneratorRequestSchema,
  PLMSScriptSchema,
  type PLMSScript,
  type SolveIntent,
} from '@/lib/solve-types'

const SCRIPT_GENERATOR_SYSTEM_PROMPT = `Produce JSON object conforming to plms.script.v1 schema.

{
 "version": "plms.script.v1",
 "kind": "<intent>",
 "metadata": {
  "requesterRole": "student",
  "locale": "zh-TW",
  "subject": "...",
  "priority": "normal"
 },
 "params": {...}
}

Rules:
• sources ⊆ ["backpack","past_papers"]
• count ≤ 20
• fill safe defaults if missing
• output pure JSON (no markdown, no text explanations)
• version must be exactly "plms.script.v1"
• kind must match the intent
• metadata.requesterRole is always "student"
• metadata.locale is always "zh-TW"`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { intent, slots, input } = ScriptGeneratorRequestSchema.parse(body)

    console.log('[script-generator] intent:', intent, 'slots:', JSON.stringify(slots))

    // Build prompt
    const userPrompt = `Generate plms.script.v1 for intent: ${intent}

Input text: "${input}"
Extracted slots: ${JSON.stringify(slots, null, 2)}

Produce a complete script JSON with:
- version: "plms.script.v1"
- kind: "${intent}"
- metadata: { requesterRole: "student", locale: "zh-TW", subject: "${slots.subject}", priority: "normal" }
- params: ${JSON.stringify(slots, null, 2).replace(/"subject":[^,]+,/, '')} (remove subject from params)`

    // Call OpenAI
    const script = await chatCompletionJSON<PLMSScript>(
      [
        { role: 'system', content: SCRIPT_GENERATOR_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0 }
    )

    // Force correct values for safety
    script.version = 'plms.script.v1'
    script.kind = intent
    script.metadata.requesterRole = 'student'
    script.metadata.locale = 'zh-TW'
    script.metadata.subject = slots.subject
    script.metadata.timestamp = new Date().toISOString()

    // Validate
    const validated = PLMSScriptSchema.parse(script)

    const latency = Date.now() - startTime
    console.log('[script-generator] generated script in', latency, 'ms')

    return NextResponse.json({
      script: validated,
      _meta: { latency_ms: latency },
    })
  } catch (error) {
    console.error('[script-generator] error:', error)
    const latency = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'script_generator_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
