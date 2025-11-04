import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { classifySubject } from '@/lib/subject-classifier'
import { createDetectResponse, type Subject } from '@/lib/contract-v2'
import { trackAPICall, trackError } from '@/lib/heartbeat'

const DetectRequestSchema = z
  .object({
    text: z.string().max(2000).optional(),
    prompt: z.string().max(2000).optional()
  })
  .refine((data) => Boolean(data.text || data.prompt), {
    message: 'text or prompt is required'
  })

function normalizeConfidence(value: number | undefined) {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  return Number(Math.min(1, Math.max(0, value)).toFixed(2))
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { text, prompt } = DetectRequestSchema.parse(body)

    const input = text ?? prompt ?? ''
    const result = await classifySubject(input)

    const confidence = normalizeConfidence(result.confidence) ?? 0
    const delta = normalizeConfidence(result.confidenceDelta)
    const secondBest =
      result.secondBest && typeof result.secondBest.confidence === 'number'
        ? {
            subject: result.secondBest.subject as Subject,
            confidence: normalizeConfidence(result.secondBest.confidence) ?? 0
          }
        : undefined

    // Create Contract v2 response
    const alternatives = secondBest ? [secondBest] : undefined
    const contractResponse = createDetectResponse(
      result.subject as Subject,
      confidence,
      {
        session_id: `session_${Date.now()}`,
        alternatives,
        debug: process.env.DEBUG === '1' ? {
          raw_input: input,
          confidence_delta: delta,
          detection_details: result
        } : undefined
      }
    )

    const latency = Date.now() - startTime
    trackAPICall('/api/tutor/detect', latency, true, contractResponse)

    return NextResponse.json(contractResponse)
  } catch (error) {
    const latency = Date.now() - startTime
    trackAPICall('/api/tutor/detect', latency, false)

    if (error instanceof z.ZodError) {
      trackError('Validation error in /api/tutor/detect')
      return NextResponse.json(
        {
          error: 'invalid_request',
          details: error.issues
        },
        { status: 400 }
      )
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    trackError(`Detection error: ${errorMessage}`)
    console.error('Subject detection failed:', error)

    return NextResponse.json(
      { error: 'internal_error', message: errorMessage },
      { status: 500 }
    )
  }
}
