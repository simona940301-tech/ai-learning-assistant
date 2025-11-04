import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { runHybridSolve } from '@/lib/ai/route-solver'

// Input Schema with tolerance
const InputSchema = z
  .object({
    text: z.string().trim().optional(),
    imageBase64: z.string().trim().optional(),
    voiceText: z.string().trim().optional(),
    subjectHint: z.enum(['english', 'math', 'chinese', 'social', 'science']).optional(),
    // Legacy support
    questionText: z.string().trim().optional(),
  })
  .refine(
    (d) => !!(d.text || d.imageBase64 || d.voiceText || d.questionText),
    { message: 'One of text/imageBase64/voiceText/questionText is required' }
  )

/**
 * Normalize unknown value to string array (tolerance)
 */
function normalizeTextArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter(Boolean).map(String)
  if (typeof v === 'string' && v.trim()) return [v.trim()]
  return []
}

/**
 * Normalize ExplainCard to strict contract
 */
function normalizeExplainCard(card: any): {
  focus: string
  summary: string
  steps: string[]
  details: string[]
} {
  return {
    focus: String(card?.focus || card?.keyPoint || '考點待補充'),
    summary: String(card?.summary || card?.oneLiner || '解析待補充'),
    steps: normalizeTextArray(card?.steps || card?.reasoning || []),
    details: normalizeTextArray(card?.details || card?.explanation || []),
  }
}

/**
 * POST: Solve question
 */
export async function POST(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Parse and validate input
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { errorCode: 'INVALID_JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      )
    }

    const input = InputSchema.parse(body)
    const questionText = input.text || input.questionText || input.voiceText || ''

    // Run hybrid solve
    const result = await runHybridSolve(questionText)

    // Normalize response to strict contract
    const normalizedCard = normalizeExplainCard(result.explanation)

    return NextResponse.json({
      subject: result.meta.subjectHint || 'unknown',
      chips: ['詳解', '相似題', '重點'],
      explainCard: normalizedCard,
      meta: result.meta,
      health: {
        index_version: 'v1',
        doc_count: 0,
      },
      _meta: { latency_ms: Date.now() - start },
    })
  } catch (error) {
    console.error('[route-solver] error:', error)
    
    // Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          errorCode: 'INVALID_INPUT',
          message: error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
          errors: error.errors,
        },
        { status: 400 }
      )
    }

    // Generic errors
    return NextResponse.json(
      {
        errorCode: 'ROUTE_SOLVER_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET: Health probe
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: '/api/ai/route-solver',
    timestamp: new Date().toISOString(),
  })
}
