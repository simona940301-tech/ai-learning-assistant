/**
 * Slot Extractor API
 * Extracts normalized fields for the chosen intent
 */

import { NextRequest, NextResponse } from 'next/server'
import { chatCompletionJSON } from '@/lib/openai'
import {
  SlotExtractorRequestSchema,
  SlotExtractorResponseSchema,
  ExplainQuestionSlotsSchema,
  GenerateSimilarSlotsSchema,
  SummarizeKeyPointsSlotsSchema,
  type SolveIntent,
  type ExplainQuestionSlots,
  type GenerateSimilarSlots,
  type SummarizeKeyPointsSlots,
} from '@/lib/solve-types'
import { detectSubject, validateSubject, mapSubjectToContract } from '@/lib/ai/detectSubject'

const SLOT_EXTRACTOR_SYSTEM_PROMPT = `Extract normalized fields for the chosen intent.
Return STRICT JSON only.

Common: { "subject": "english|math|chinese|social|science|unknown" }

ExplainQuestion:
{ "subject": "...", "showSteps": true, "format": "full" }

GenerateSimilar:
{ "subject": "...", "difficulty": "A1|A2|B1|B2|C1|mixed", "count": 10,
 "skillTags": [], "sources": ["backpack","past_papers"] }

SummarizeKeyPoints:
{ "subject": "...", "target": "exam_tips|concepts|vocab", "maxBullets": 5 }

Rules:
- Always include subject field
- Use safe defaults for missing fields
- count must be ≤ 20
- sources must be subset of ["backpack", "past_papers"]
- Output pure JSON (no markdown, no explanations)`

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { intent, input } = SlotExtractorRequestSchema.parse(body)

    console.log('[slot-extractor] intent:', intent, 'input:', input.substring(0, 100))

    // Detect subject using our robust detector
    const initialSubject = detectSubject(input)
    // Apply post-validation guard
    const detectedSubject = validateSubject(input, initialSubject)
    const contractSubject = mapSubjectToContract(detectedSubject)
    const solveSubject = contractSubject.toLowerCase() as 'english' | 'math' | 'chinese'

    console.log('[slot-extractor] detected subject:', detectedSubject, '→', solveSubject)
    console.log('✅ Subject detection validated:', solveSubject)

    // Build schema-specific prompt
    let schemaPrompt = ''
    let expectedSchema: unknown = null

    if (intent === 'ExplainQuestion') {
      schemaPrompt = `Extract slots for ExplainQuestion.
User input: "${input}"
Detected subject: ${solveSubject}

Return JSON with: subject, showSteps (boolean), format ("full" or "compact")`
      expectedSchema = ExplainQuestionSlotsSchema
    } else if (intent === 'GenerateSimilar') {
      schemaPrompt = `Extract slots for GenerateSimilar.
User input: "${input}"
Detected subject: ${solveSubject}

Return JSON with: subject, difficulty, count (1-20), skillTags (array), sources (array of "backpack"/"past_papers")`
      expectedSchema = GenerateSimilarSlotsSchema
    } else if (intent === 'SummarizeKeyPoints') {
      schemaPrompt = `Extract slots for SummarizeKeyPoints.
User input: "${input}"
Detected subject: ${solveSubject}

Return JSON with: subject, target ("exam_tips"/"concepts"/"vocab"), maxBullets (1-10)`
      expectedSchema = SummarizeKeyPointsSlotsSchema
    }

    // Call OpenAI
    type SlotResponse =
      | ExplainQuestionSlots
      | GenerateSimilarSlots
      | SummarizeKeyPointsSlots

    const slots = await chatCompletionJSON<SlotResponse>(
      [
        { role: 'system', content: SLOT_EXTRACTOR_SYSTEM_PROMPT },
        { role: 'user', content: schemaPrompt },
      ],
      { model: 'gpt-4o-mini', temperature: 0.1 }
    )

    // Override subject with our detection
    slots.subject = solveSubject

    // Validate with appropriate schema
    let validated: SlotResponse
    if (intent === 'ExplainQuestion') {
      validated = ExplainQuestionSlotsSchema.parse(slots)
    } else if (intent === 'GenerateSimilar') {
      validated = GenerateSimilarSlotsSchema.parse(slots)
    } else {
      validated = SummarizeKeyPointsSlotsSchema.parse(slots)
    }

    const latency = Date.now() - startTime
    console.log('[slot-extractor] extracted:', JSON.stringify(validated), `in ${latency}ms`)

    return NextResponse.json({
      intent,
      slots: validated,
      _meta: { latency_ms: latency },
    })
  } catch (error) {
    console.error('[slot-extractor] error:', error)
    const latency = Date.now() - startTime

    return NextResponse.json(
      {
        error: 'slot_extractor_failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        _meta: { latency_ms: latency },
      },
      { status: 500 }
    )
  }
}
