import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { shuffleArray, supabase } from '@/lib/tutor-utils'
import { classifySubject } from '@/lib/subject-classifier'
import {
  getSubjectByName,
  getKeypointsForSubject,
  matchKeypointByPrompt,
  pickDistractorKeypoints,
  KeypointRecord
} from '@/lib/keypoint-utils'

const KeypointMCQRequestSchema = z.object({
  prompt: z.string().min(1),
  subject: z.string().optional(),
  detected_keypoint: z.string().optional()
})

interface OptionPayload {
  label: string
  keypoint_code: string
  is_correct: boolean
}

interface SolveOptionRow {
  id: string
  label: string
  is_answer: boolean
  rank: number
}

function createStem(primaryKeypoint: KeypointRecord) {
  return `下列哪一個描述最符合「${primaryKeypoint.name}」？`
}

function createCorrectStatement(keypoint: KeypointRecord) {
  if (keypoint.description) return keypoint.description
  const primaryStep = keypoint.strategy_template?.steps?.[0]
  if (primaryStep) {
    return `${keypoint.name}：${primaryStep}`
  }
  return `${keypoint.name} 的核心做法。`
}

function createDistractorStatement(distractor: KeypointRecord) {
  const pattern = distractor.error_patterns?.[0]?.pattern
  const note = distractor.error_patterns?.[0]?.note
  if (pattern && note) {
    return `常見誤解：「${pattern}」，忽略了 ${note}`
  }
  if (pattern) {
    return `常見誤解：「${pattern}」`
  }
  if (note) {
    return `常見提醒：${note}`
  }
  return `${distractor.name}：容易和主考點混淆`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, subject: subjectInput, detected_keypoint } = KeypointMCQRequestSchema.parse(body)

    let subjectName = subjectInput
    let detectionConfidence = subjectInput ? 0.95 : 0

    if (!subjectName) {
      const detection = await classifySubject(prompt)
      subjectName = detection.subject !== 'unknown' ? detection.subject : undefined
      detectionConfidence = detection.confidence
    }

    if (!subjectName) {
      return NextResponse.json(
        {
          phase: 'warmup',
          subject: 'unknown',
          confidence: detectionConfidence,
          message: '需手動確認學科'
        },
        { status: 200 }
      )
    }

    const subjectRecord = await getSubjectByName(subjectName)
    if (!subjectRecord) {
      return NextResponse.json({ error: 'subject_not_found' }, { status: 404 })
    }

    const keypoints = await getKeypointsForSubject(subjectRecord.id)
    if (!keypoints || keypoints.length < 4) {
      return NextResponse.json({ error: 'insufficient_keypoints' }, { status: 400 })
    }

    let primaryKeypoint: KeypointRecord | undefined
    if (detected_keypoint) {
      primaryKeypoint = keypoints.find((kp) => kp.code === detected_keypoint)
    }

    let similarityScore: number | undefined
    if (!primaryKeypoint) {
      const match = await matchKeypointByPrompt(prompt, keypoints)
      if (match?.keypoint) {
        primaryKeypoint = match.keypoint
        similarityScore = match.similarity
      }
    }

    if (!primaryKeypoint) {
      const fallback = keypoints.find((kp) => {
        if (prompt.includes(kp.name)) return true
        if (kp.description && prompt.includes(kp.description.split('：')[0] ?? '')) return true
        return false
      })
      primaryKeypoint = fallback ?? keypoints[0]
    }

    if (!primaryKeypoint) {
      primaryKeypoint = keypoints[0]
    }

    const distractors = pickDistractorKeypoints(keypoints, primaryKeypoint, 3)
    if (distractors.length < 3) {
      return NextResponse.json({ error: 'insufficient_distractors' }, { status: 400 })
    }

    const options: OptionPayload[] = [
      {
        label: createCorrectStatement(primaryKeypoint),
        keypoint_code: primaryKeypoint.code,
        is_correct: true
      },
      ...distractors.map((kp) => ({
        label: createDistractorStatement(kp),
        keypoint_code: kp.code,
        is_correct: false
      }))
    ]

    const shuffled = shuffleArray(options)
    const answerIndex = shuffled.findIndex((opt) => opt.is_correct)

    const responseConfidence = Number(Math.min(1, Math.max(0, detectionConfidence)).toFixed(2))

    const { data: session, error: sessionError } = await supabase
      .from('solve_sessions')
      .insert({
        subject: subjectName,
        prompt,
        source_meta: {
          phase: 'warmup',
          detected_keypoint: primaryKeypoint.code,
          similarity: similarityScore,
          options: shuffled.map((option, index) => ({
            index: index + 1,
            label: option.label,
            keypoint_code: option.keypoint_code,
            is_correct: option.is_correct
          })),
          answer_index: answerIndex + 1,
          detection_confidence: responseConfidence
        }
      })
      .select('id')
      .single()

    if (sessionError || !session) {
      console.error('Failed to create solve session:', sessionError)
      return NextResponse.json({ error: 'session_creation_failed' }, { status: 500 })
    }

    const optionRows = shuffled.map((option, index) => ({
      session_id: session.id,
      concept_id: null,
      label: option.label,
      is_answer: option.is_correct,
      rank: index,
      score: option.is_correct ? 1 : 0
    }))

    const { data: insertedOptions, error: optionsError } = await supabase
      .from('solve_options')
      .insert(optionRows)
      .select('id, label, is_answer, rank')

    if (optionsError || !insertedOptions) {
      console.error('Failed to insert warmup options:', optionsError)
      return NextResponse.json({ error: 'options_creation_failed' }, { status: 500 })
    }

    return NextResponse.json({
      phase: 'warmup',
      subject: subjectName,
      confidence: responseConfidence,
      detected_keypoint: primaryKeypoint.code,
      session_id: session.id,
      stem: createStem(primaryKeypoint),
      options: (insertedOptions as SolveOptionRow[]).map((option) => ({
        option_id: option.id,
        label: option.label
      }))
    })
  } catch (error) {
    console.error('Keypoint MCQ API error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'invalid_request',
          details: error.issues
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'internal_error',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}
