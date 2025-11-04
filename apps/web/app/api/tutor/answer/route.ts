import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { supabase, getConceptById } from '@/lib/tutor-utils'
import {
  TutorAnswerRequestSchema,
  type TutorAnswerRequest,
  type TutorAnswerResponse
} from '@/src/schemas/answer'

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
  return uuidRegex.test(str)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const input = TutorAnswerRequestSchema.parse(body)

    const {
      questionId,
      userAnswer,
      option_id: optionId,
      session_id: sessionIdOverride
    } = input

    let conceptId: string | null = input.concept_id ?? null
    let optionRecord: {
      id: string
      session_id: string | null
      label: string | null
      is_answer: boolean | null
      concept_id: string | null
    } | null = null

    // Try to fetch option from database only if optionId looks like a UUID
    if (!conceptId && optionId && isValidUUID(optionId)) {
      const { data: option, error } = await supabase
        .from('solve_options')
        .select('id, session_id, label, is_answer, concept_id')
        .eq('id', optionId)
        .maybeSingle()

      if (error) {
        console.error('Failed to load solve option:', error)
      }
      optionRecord = option ?? null
      conceptId = conceptId ?? option?.concept_id ?? null
    }

    if (!conceptId && input.keypoint_id) {
      conceptId = await mapKeypointToConceptId(input.keypoint_id)
    }

    let sessionId = optionRecord?.session_id ?? sessionIdOverride ?? null

    let expectedAnswer: string | null = null

    // Only query database if we have valid UUIDs
    if (questionId && isValidUUID(questionId)) {
      expectedAnswer = await resolveExpectedAnswer(
        questionId,
        sessionId,
        optionRecord?.label ?? null
      )
    }

    if (!expectedAnswer && optionRecord?.is_answer) {
      expectedAnswer = optionRecord.label ?? null
    }

    if (!conceptId && sessionId && isValidUUID(sessionId)) {
      const { data: correctOption } = await supabase
        .from('solve_options')
        .select('concept_id, label')
        .eq('session_id', sessionId)
        .eq('is_answer', true)
        .maybeSingle()
      if (correctOption) {
        conceptId = correctOption.concept_id ?? conceptId
        expectedAnswer = expectedAnswer ?? (correctOption.label ?? null)
      }
    }

    const correct = deriveCorrectness(userAnswer, expectedAnswer, optionRecord?.is_answer ?? null)
    const rationale = await maybeFetchRationale(conceptId, questionId || 'unknown')

    // Only try to insert if we have valid UUIDs
    if (sessionId && optionId && isValidUUID(sessionId) && isValidUUID(optionId)) {
      try {
        await supabase
          .from('solve_responses')
          .insert({
            session_id: sessionId,
            option_id: optionId,
            selected_concept_id: conceptId,
            is_correct: correct,
            latency_ms: null,
            feedback: rationale ? { rationale } : null
          })
      } catch (error) {
        console.warn('Failed to record solve response:', error)
      }
    }

    const payload: TutorAnswerResponse = {
      correct,
      expected: expectedAnswer ?? null,
      concept_id: conceptId,
      rationale
    }

    return NextResponse.json(payload)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid payload for /api/tutor/answer',
          details: error.issues
        },
        { status: 400 }
      )
    }

    console.error('Answer API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    )
  }
}

async function mapKeypointToConceptId(keypointId: string): Promise<string | null> {
  try {
    // Support both keypoint_id and keypoint_code
    const { data, error } = await supabase
      .from('keypoint_concepts')
      .select('concept_id')
      .or(`keypoint_id.eq.${keypointId},keypoint_code.eq.${keypointId}`)
      .maybeSingle()

    if (error) {
      console.warn('Unable to map keypoint to concept:', error)
      return null
    }

    return data?.concept_id ?? null
  } catch (error) {
    console.warn('mapKeypointToConceptId failed:', error)
    return null
  }
}

async function resolveExpectedAnswer(
  questionId: string,
  sessionId: string | null,
  optionLabel: string | null
): Promise<string | null> {
  if (sessionId) {
    const { data, error } = await supabase
      .from('solve_options')
      .select('label')
      .eq('session_id', sessionId)
      .eq('is_answer', true)
      .maybeSingle()

    if (!error && data) {
      return data.label ?? null
    }
  }

  const { data: question, error: questionError } = await supabase
    .from('questions')
    .select('answer')
    .eq('id', questionId)
    .maybeSingle()

  if (questionError) {
    console.warn('Unable to load question answer:', questionError)
    return optionLabel
  }

  const answer = question?.answer
  if (!answer) return optionLabel

  if (typeof answer === 'string') return answer
  if (Array.isArray(answer)) return answer.join(',')
  return optionLabel
}

function deriveCorrectness(
  userAnswer: string,
  expectedAnswer: string | null,
  optionIsCorrect: boolean | null
) {
  if (expectedAnswer) {
    return normalize(userAnswer) === normalize(expectedAnswer)
  }
  if (typeof optionIsCorrect === 'boolean') {
    return optionIsCorrect
  }
  return false
}

function normalize(input: string | null | undefined) {
  return (input ?? '').trim().toUpperCase()
}

async function maybeFetchRationale(conceptId: string | null, questionId: string): Promise<string | null> {
  if (!conceptId) return null

  try {
    const concept = await getConceptById(conceptId)
    if (!concept) return null

    if (concept.ai_hint) return concept.ai_hint
    if (Array.isArray(concept.recognition_cues) && concept.recognition_cues.length > 0) {
      return `考點提示：${concept.recognition_cues[0]}`
    }

    return `考點 ${concept.name} 與題目 ${questionId} 相關。`
  } catch (error) {
    console.warn('Failed to fetch concept rationale:', error)
    return null
  }
}

