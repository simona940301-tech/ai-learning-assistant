import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/tutor-utils'
import {
  getSubjectByName,
  getKeypointsForSubject,
  matchKeypointByPrompt,
  pickDistractorKeypoints,
  KeypointRecord
} from '@/lib/keypoint-utils'

const SolveRequestSchema = z
  .object({
    session_id: z.string().uuid().optional(),
    question_id: z.string().uuid().optional(),
    prompt: z.string().min(1).optional(),
    subject: z.string().optional(),
    keypoint_code: z.string().optional(),
    mode: z.enum(['step', 'fast']).default('step')
  })
  .refine(
    (data) => data.session_id || data.question_id || data.prompt,
    'Either session_id, question_id, or prompt must be provided'
  )

interface QuestionRecord {
  id: string
  prompt: string
  solution?: {
    outline?: string[]
    steps?: Array<{ title?: string; detail?: string }>
  } | null
  question_keypoints?: Array<{
    role: 'primary' | 'aux'
    keypoints: KeypointRecord
  }>
}

function buildSummary(keypoint: KeypointRecord, mode: 'step' | 'fast') {
  const description = keypoint.description ?? keypoint.name
  const firstCheck = keypoint.strategy_template?.checks?.[0]
  const firstStep = keypoint.strategy_template?.steps?.[0]

  if (mode === 'fast') {
    if (firstCheck) return `${description}，關鍵是在${firstCheck}。`
    if (firstStep) return `${description}，採用：${firstStep}。`
    return description
  }

  const segments = [description]
  if (firstStep) segments.push(firstStep)
  if (firstCheck) segments.push(firstCheck)
  return segments.filter(Boolean).join('；')
}

function buildSteps(
  keypoint: KeypointRecord,
  question: QuestionRecord | null,
  mode: 'step' | 'fast'
): string[] {
  if (mode === 'fast') return []

  const steps: string[] = []

  const solutionSteps = question?.solution?.steps
    ?.map((step) => step.detail || step.title)
    ?.filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
  if (solutionSteps && solutionSteps.length > 0) {
    steps.push(...solutionSteps)
  }

  const templateSteps = keypoint.strategy_template?.steps || []
  templateSteps.forEach((step) => {
    if (step && !steps.includes(step)) {
      steps.push(step)
    }
  })

  return steps.slice(0, 5)
}

function buildChecks(keypoint: KeypointRecord, question: QuestionRecord | null): string[] {
  const checks = new Set<string>()
  keypoint.strategy_template?.checks?.forEach((check) => {
    if (check) checks.add(check)
  })
  question?.solution?.outline?.forEach((item) => {
    if (item) checks.add(item)
  })
  return Array.from(checks)
}

function buildErrorHints(keypoint: KeypointRecord): string[] {
  const patterns = keypoint.error_patterns || []
  if (patterns.length === 0) return []

  return patterns.map(({ pattern, note }) => {
    if (note) {
      return `常見錯法：${pattern}。提示：${note}`
    }
    return `常見錯法：${pattern}`
  })
}

function buildExtensions(primary: KeypointRecord, allKeypoints: KeypointRecord[]): string[] {
  if (primary.related_points && primary.related_points.length > 0) {
    return primary.related_points.slice(0, 2)
  }

  const recommendations = pickDistractorKeypoints(allKeypoints, primary, 2)
  return recommendations.map((kp) => kp.code)
}

async function loadQuestion(questionId: string): Promise<QuestionRecord | null> {
  const { data, error } = await supabase
    .from('questions')
    .select(
      `
      id,
      prompt,
      solution,
      question_keypoints (
        role,
        keypoints (
          id,
          code,
          name,
          description,
          category,
          strategy_template,
          error_patterns,
          related_points,
          embedding
        )
      )
    `
    )
    .eq('id', questionId)
    .maybeSingle()

  if (error) {
    console.warn('Failed to load question:', error)
    return null
  }

  if (!data) return null

  const normalizedKeypoints =
    (data.question_keypoints || [])
      .map((item: any) => {
        const kp = Array.isArray(item.keypoints) ? item.keypoints[0] : item.keypoints
        if (!kp) return null
        return {
          role: item.role,
          keypoints: kp as KeypointRecord
        }
      })
      .filter((item: any): item is { role: 'primary' | 'aux'; keypoints: KeypointRecord } => Boolean(item)) || []

  return {
    id: data.id,
    prompt: data.prompt,
    solution: data.solution,
    question_keypoints: normalizedKeypoints
  }
}

async function findSimilarQuestionByPrompt(subjectId: string, prompt: string): Promise<QuestionRecord | null> {
  const snippet = prompt.slice(0, 40)
  const { data, error } = await supabase
    .from('questions')
    .select(
      `
      id,
      prompt,
      solution,
      exams!inner(subject_id),
      question_keypoints (
        role,
        keypoints (
          id,
          code,
          name,
          description,
          category,
          strategy_template,
          error_patterns,
          related_points,
          embedding
        )
      )
    `
    )
    .eq('exams.subject_id', subjectId)
    .ilike('prompt', `%${snippet}%`)
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('Failed to find similar question:', error)
    return null
  }

  if (!data) return null

  const normalizedKeypoints =
    (data.question_keypoints || [])
      .map((item: any) => {
        const kp = Array.isArray(item.keypoints) ? item.keypoints[0] : item.keypoints
        if (!kp) return null
        return {
          role: item.role,
          keypoints: kp as KeypointRecord
        }
      })
      .filter((item: any): item is { role: 'primary' | 'aux'; keypoints: KeypointRecord } => Boolean(item)) || []

  return {
    id: data.id,
    prompt: data.prompt,
    solution: data.solution,
    question_keypoints: normalizedKeypoints
  }
}

// 设置 body 大小限制 (Next.js App Router)
export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(request: NextRequest) {
  try {
    console.log('[solve][stage=parse] Starting request')
    const body = await request.json()
    const { session_id, question_id, prompt: promptInput, subject: subjectInput, keypoint_code, mode } =
      SolveRequestSchema.parse(body)
    console.log('[solve][stage=parse] Validated:', { session_id, question_id, subject: subjectInput, keypoint_code, mode })

    let session = null as {
      id: string
      subject: string
      prompt: string
      source_meta?: Record<string, any> | null
    } | null

    if (session_id) {
      console.log('[solve][stage=session] Loading session:', session_id)
      const { data, error } = await supabase
        .from('solve_sessions')
        .select('id, subject, prompt, source_meta')
        .eq('id', session_id)
        .maybeSingle()

      if (error) {
        console.error('[solve][stage=session]', error)
        return NextResponse.json({ error: 'session_not_found' }, { status: 404 })
      }

      session = data
      console.log('[solve][stage=session] Loaded:', session?.id)
    }

    const subjectName = (session?.subject || subjectInput || '').trim()
    console.log('[solve][stage=subject] Resolving subject:', subjectName)
    if (!subjectName) {
      console.error('[solve][stage=subject] No subject provided')
      return NextResponse.json({ error: 'subject_required' }, { status: 400 })
    }

    const subjectRecord = await getSubjectByName(subjectName)
    if (!subjectRecord) {
      console.error('[solve][stage=subject] Subject not found:', subjectName)
      return NextResponse.json({ error: 'subject_not_found' }, { status: 404 })
    }
    console.log('[solve][stage=subject] Found:', subjectRecord.id)

    const allKeypoints = await getKeypointsForSubject(subjectRecord.id)
    console.log('[solve][stage=keypoints] Loaded keypoints:', allKeypoints.length)
    if (allKeypoints.length === 0) {
      console.error('[solve][stage=keypoints] No keypoints for subject:', subjectRecord.id)
      return NextResponse.json({ error: 'keypoints_not_ready' }, { status: 400 })
    }

    let question: QuestionRecord | null = null
    let resolvedPrompt = session?.prompt || promptInput || ''

    if (question_id) {
      question = await loadQuestion(question_id)
    }

    if (!question && session?.source_meta?.question_id) {
      question = await loadQuestion(session.source_meta.question_id)
    }

    if (!question && resolvedPrompt) {
      question = await findSimilarQuestionByPrompt(subjectRecord.id, resolvedPrompt)
    }

    let primaryKeypoint: KeypointRecord | undefined
    let confidence = typeof session?.source_meta?.detection_confidence === 'number'
      ? session.source_meta.detection_confidence
      : 0.8

    const candidateCodes = [
      keypoint_code,
      session?.source_meta?.detected_keypoint,
      question?.question_keypoints?.find((kp) => kp.role === 'primary')?.keypoints?.code
    ].filter(Boolean) as string[]

    for (const code of candidateCodes) {
      const found = allKeypoints.find((kp) => kp.code === code)
      if (found) {
        primaryKeypoint = found
        break
      }
    }

    if (!primaryKeypoint) {
      const match = resolvedPrompt ? await matchKeypointByPrompt(resolvedPrompt, allKeypoints) : null
      if (match?.keypoint) {
        primaryKeypoint = match.keypoint
        if (typeof match.similarity === 'number') {
          const similarityScore = Number(match.similarity.toFixed(2))
          confidence = Math.max(confidence, Math.min(0.99, Math.max(0.5, similarityScore || 0.85)))
        }
      }
    }

    if (!primaryKeypoint) {
      primaryKeypoint = allKeypoints[0]
    }

    const steps = buildSteps(primaryKeypoint, question, mode)
    const checks = buildChecks(primaryKeypoint, question)
    const errorHints = buildErrorHints(primaryKeypoint)
    const extensions = buildExtensions(primaryKeypoint, allKeypoints)
    const summary = buildSummary(primaryKeypoint, mode)

    const response = {
      subject: subjectName,
      confidence: Number(Math.min(1, Math.max(0, confidence)).toFixed(2)),
      detected_keypoint: primaryKeypoint.code,
      phase: 'solve',
      summary,
      steps,
      checks,
      error_hints: errorHints,
      extensions
    }

    console.log('[solve][stage=response] Success:', { subject: subjectName, keypoint: primaryKeypoint.code })
    return NextResponse.json(response)
  } catch (error) {
    console.error('[solve][stage=fatal]', error)

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
